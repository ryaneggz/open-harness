# Onboard → TypeScript

**Status:** draft · **Date:** 2026-04-21 · **Owner:** harness-orchestrator

## Problem

`install/onboard.sh` is 515 lines of bash that walks a user through six
authentication steps (LLM, Slack, SSH, GitHub, Cloudflare, Claude), persists
state to a marker file, and kicks off the dev server. It has no test coverage,
no type checking, and no way to exercise individual steps in isolation. Bugs
surface only in a live sandbox after a human sits through the wizard.

Recent regressions are representative:

- `98c356d` — fix: default `settings.json` to openai-codex/gpt-5.4 (silent
  default wrong for weeks; caught manually).
- `2a62dfe` — fix: build Slack bot as sandbox user with correct path (quoting
  + `$HOME` confusion between root and sandbox).
- Step-gate logic (`should_run`, `STEPS[...]` status, exit-code mapping in
  `--only` mode) is untestable. The `MOM_ALREADY_RUNNING` tmux-capture block
  depends on substring grep against a live pane — a unit test would need to
  mock tmux, which bash can't do cleanly.

The rest of the stack already lives in `packages/sandbox/` with TypeScript +
vitest (11 test files, 64+ Slack tests, heartbeat modules fully unit-tested).
Onboarding is the last major surface that isn't.

## Goal

Port `install/onboard.sh` to a TypeScript module in `packages/sandbox/` so
each step is a pure, injectable function with unit tests, while keeping the
`openharness onboard` command behaviorally identical (same prompts, same
marker format, same exit codes, same side effects).

## Non-goals

- Redesigning the onboarding flow. Step order, prompts, and questions stay
  the same. This is a port, not a rewrite.
- Replacing `install/entrypoint.sh`. That runs as root before `gosu sandbox`
  hands off, and its job (groupmod, chown, heartbeat daemon boot, cloudflared
  install) is not the same shape as the interactive wizard. Out of scope here.
- Porting `cloudflared-tunnel.sh`, `banner.sh`, `setup.sh`, `tmux-agent.sh`.
  Track separately if ever justified.
- Changing the marker file location or schema (`~/.claude/.onboarded`, the
  `{version, completedAt, steps}` JSON). Downstream tools may depend on it.
- Changing the Pi/openharness auth file layout (`~/.pi/agent/auth.json`,
  `~/.openharness/agent/`). The shim-symlink behavior in step 2 is preserved
  byte-for-byte.

## Current Architecture (concrete)

- `install/onboard.sh:1-515` — monolithic bash script. Steps gated by
  `should_run <name>`; state tracked in `declare -A STEPS`.
- `install/onboard.sh:25-33` — argv parsing (`--force`, `--only <step>`,
  positional step alias).
- `install/onboard.sh:47-53` — marker-file short-circuit when already
  onboarded and no `--only`.
- `install/onboard.sh:74-116` — Step 1 LLM: checks `~/.pi/agent/auth.json`,
  else `OPENAI_API_KEY`, else launches `openharness` for interactive login.
- `install/onboard.sh:121-290` — Step 2 Slack: loads `.env`, resolves `mom`
  CLI (global link → dist → rebuild), prompts tokens, persists to host `.env`,
  bootstraps `~/.openharness/agent` symlinks, starts tmux session, validates
  "connected and listening" via `tmux capture-pane` polling.
- `install/onboard.sh:295-329` — Step 3 SSH: generates `id_ed25519`, verifies
  GitHub access via `ssh -T git@github.com`.
- `install/onboard.sh:334-354` — Step 4 GitHub: `gh auth status` / `gh auth
  login` / `gh auth setup-git`.
- `install/onboard.sh:359-413` — Step 5 Cloudflare: checks for existing
  `~/.cloudflared/config-*.yml`, else `cloudflared login` + delegate to
  `install/cloudflared-tunnel.sh`.
- `install/onboard.sh:418-438` — Step 6 Claude: checks credentials, triggers
  `claude --version`.
- `install/onboard.sh:441-450` — `--only` exit-code mapping.
- `install/onboard.sh:454-481` — dev-server + tunnel startup.
- `install/onboard.sh:484-498` — marker-file write.

Callers:
- `packages/sandbox/src/cli/cli.ts` — `onboard` subcommand (confirm exact
  dispatch path by reading the file during implementation).
- `AGENTS.md` / `CLAUDE.md` — user-facing docs reference
  `openharness onboard [--force|--only <step>]`.

## Proposed Architecture

One TypeScript module per step, one orchestrator, one CLI binding, all in
`packages/sandbox/src/onboard/`. The existing bash script is deleted once the
port ships and CI is green.

### Module layout

```
packages/sandbox/src/
  cli/
    onboard.ts                 # argv → orchestrator; the `openharness onboard` entrypoint
  onboard/
    orchestrator.ts            # runSteps(steps, deps): sequences steps, writes marker
    marker.ts                  # read/write ~/.claude/.onboarded
    io.ts                      # banner/ok/skip/warn/fail/ask (ANSI helpers)
    prompt.ts                  # thin wrapper over readline with injectable stream
    env.ts                     # load/save host .env (SLACK_APP_TOKEN, SLACK_BOT_TOKEN)
    types.ts                   # StepId, StepStatus, StepResult, Deps interface
    steps/
      llm.ts
      slack.ts
      ssh.ts
      github.ts
      cloudflare.ts
      claude.ts
  __tests__/
    onboard-orchestrator.test.ts
    onboard-marker.test.ts
    onboard-env.test.ts
    onboard-llm.test.ts
    onboard-slack.test.ts
    onboard-ssh.test.ts
    onboard-github.test.ts
    onboard-cloudflare.test.ts
    onboard-claude.test.ts
```

### Contract: `Step`

Each step is a pure function over an injected dependency bag. No direct
`process.env`, `fs`, `child_process`, or `readline` access inside step
bodies — all via `deps`.

```ts
// packages/sandbox/src/onboard/types.ts
export type StepId = "llm" | "slack" | "ssh" | "github" | "cloudflare" | "claude";
export type StepStatus = "done" | "skipped" | "failed" | "unverified" | "unknown";

export interface StepResult {
  id: StepId;
  status: StepStatus;
  message?: string;       // surfaced to the summary banner
}

export interface Deps {
  env: Record<string, string | undefined>;
  home: string;                                    // ~ expansion target
  fs: {
    exists(path: string): boolean;
    readFile(path: string): string;
    writeFile(path: string, contents: string): void;
    mkdirp(path: string): void;
    symlink(target: string, link: string): void;
    chmod(path: string, mode: number): void;
  };
  exec: {
    run(cmd: string[], opts?: { cwd?: string; env?: Record<string, string> }): void;
    runSafe(cmd: string[], opts?: { cwd?: string }): boolean;
    capture(cmd: string[], opts?: { cwd?: string }): string;
    which(bin: string): string | null;
  };
  io: {
    banner(s: string): void;
    ok(s: string): void;
    skip(s: string): void;
    warn(s: string): void;
    fail(s: string): void;
    ask(q: string): Promise<string>;               // newline-terminated answer
  };
  clock: { nowUtcIso(): string };                  // for marker.completedAt
}

export interface Step {
  id: StepId;
  label: string;                                   // e.g. "Step 1/6 — LLM Provider (OpenAI)"
  run(deps: Deps, opts: { force: boolean }): Promise<StepResult>;
}
```

`exec.run/capture/which` already exist in `packages/sandbox/src/lib/exec.ts`
— wrap (not re-implement) so production code stays on one spawn path and
tests can inject a fake.

### Orchestrator

```ts
// packages/sandbox/src/onboard/orchestrator.ts
export interface OrchestratorOptions {
  only?: StepId;
  force: boolean;
}

export async function runOnboarding(
  steps: Step[],
  deps: Deps,
  opts: OrchestratorOptions,
): Promise<{ results: Record<StepId, StepStatus>; exitCode: number }>;
```

Responsibilities:
1. If `only` is set, run just that step; return exit code per current mapping
   (`done`/`skipped` → 0, `failed`/`unknown` → 1).
2. Else, check marker: if present and `!force`, print summary + exit 0.
3. Else, run all steps in declared order, collecting `StepResult`s. Steps
   never throw on expected "user said no" or "tokens missing" — they return
   `skipped`/`unknown`. They throw only on programmer error.
4. Write marker via `marker.write(...)` using the collected status map.
5. Print summary banner.

Dev-server startup at the end of the script moves into `workspace/startup.sh`
(already wired into `install/entrypoint.sh:71-74`) or stays as a final
post-orchestrator hook function `startApplication(deps)` — same behavior,
separate unit.

### CLI binding

`packages/sandbox/src/cli/onboard.ts` is the thin argv layer:

```ts
const argv = process.argv.slice(2);
const { only, force } = parseArgs(argv);           // exported + tested
const deps = makeRealDeps();                       // exported + tested separately
const { exitCode } = await runOnboarding(allSteps(), deps, { only, force });
process.exit(exitCode);
```

`parseArgs` handles the three argv shapes currently in bash:
- `onboard` → `{ force: false }`
- `onboard --force` → `{ force: true }`
- `onboard --only slack`, `onboard --only=slack`, `onboard slack` →
  `{ only: "slack", force: false }`

Unknown step name → throw `UnknownStepError` (caught in main, exit 2, matching
current behavior).

### Marker file

Byte-identical JSON schema. Existing bash writes keys in insertion order with
a shell heredoc:

```json
{
  "version": 1,
  "completedAt": "2026-04-21T12:34:56Z",
  "steps": {
    "llm": { "status": "done" },
    ...
  }
}
```

`marker.write()` uses `JSON.stringify` with the same key order. Downstream
consumers parse with `jq`, so whitespace differences are safe, but preserve
the shape.

## Testing strategy

Every step gets a test file that asserts against a `FakeDeps` harness. The
harness seeds `env`, stubs `fs`, records every `exec.*` invocation, queues
`ask()` answers, and captures `io.*` output. No subprocesses, no network, no
filesystem.

Concrete test cases (not exhaustive):

- **orchestrator**:
  - `only=slack` runs only `slack`, exits 0 on `done`, 1 on `failed`.
  - Marker present + no `only` + `!force` → short-circuit, no step runs.
  - All steps run in order; aggregated `StepResult`s land in marker.
- **llm**:
  - `~/.pi/agent/auth.json` populated → returns `done`, no prompt.
  - `OPENAI_API_KEY` set → returns `done`, no prompt.
  - Neither → prompts; user "n" → `skipped`; user "y" runs `openharness`, then
    re-checks auth file.
- **slack**:
  - Tokens in env → uses them, doesn't prompt.
  - Tokens missing, user answers "y", provides tokens → persists to `.env`,
    skips duplicate lines via the `sed -i '/^SLACK_APP_TOKEN=/d'` equivalent
    (regex-match + filter in TS).
  - `mom` on PATH → uses global CLI; else uses `node <dist>/main.js`; else
    builds dist and retries; else fails.
  - tmux output matches `/connected and listening/` within 15 polls → `done`;
    matches `/Run error|Error|Missing env/` → `failed`; neither → `failed`
    after timeout.
  - Idempotent: existing tmux session already connected → returns `done`
    without restart.
- **ssh**:
  - Key present + `ssh -T git@github.com` output includes "successfully
    authenticated" → `done`.
  - Key present, no github access → prompts, re-checks.
  - Key missing → generates `id_ed25519`, prompts user to add, returns `done`.
- **github**:
  - `gh auth status` exit 0 → runs `gh auth setup-git`, returns `done`.
  - `gh auth login` success → `done`; failure → `failed`.
- **cloudflare**:
  - `cloudflared` not installed → `skipped`.
  - Existing `config-*.yml` and `!force` → `done` without prompting.
  - No cert.pem, user declines → `skipped`.
  - No cert.pem, user accepts → runs `cloudflared login`, delegates to
    `install/cloudflared-tunnel.sh` with collected inputs.
- **claude**:
  - Credentials file present → `done`, no prompt.
  - Missing, user accepts → runs `claude --version`, returns `done`.
  - Missing, user declines → `skipped`.
- **marker**:
  - Round-trip: `write → read → equal`.
  - Missing parent dir auto-created.
- **parseArgs**:
  - All three argv shapes.
  - Unknown step → `UnknownStepError`.

Target: every branch reachable from `should_run <step>` or `STEPS[<step>]=...`
in the current bash has a corresponding assertion in TS.

## Migration plan

Single PR off `development`. No env gate, no staged rollout, no `.bak` file
— the bash script is deleted in the same PR that introduces the TS
implementation.

On-branch commit order (commits may be split for review, ship together):

1. Scaffold `packages/sandbox/src/onboard/` (`types.ts`, `io.ts`,
   `prompt.ts`, `marker.ts`, `env.ts`, `orchestrator.ts`) and the
   `FakeDeps` test harness. Land unit tests for marker, env, parseArgs.
2. Port all six steps in one pass: `claude` → `github` → `ssh` →
   `cloudflare` → `llm` → `slack`. Each lands with full unit coverage
   against `FakeDeps`.
3. Add `packages/sandbox/src/cli/onboard.ts` and wire it into
   `packages/sandbox/src/cli/cli.ts` so `openharness onboard` calls the TS
   path directly.
4. Delete `install/onboard.sh`. Update any doc references (CLAUDE.md,
   AGENTS.md, workspace templates) that still point at the bash path.

Rollback: revert the single PR. No schema changes, no file renames outside
`install/`, no marker format change → nothing downstream breaks.

## Open questions

1. Do we keep `startApplication(deps)` (dev-server + tunnel) inside the
   onboarding binary, or move it fully to `workspace/startup.sh`? The bash
   script runs it post-marker-write; the container entrypoint also runs
   `workspace/startup.sh`. Avoid double-start.
2. `ssh -T git@github.com` and `tmux capture-pane` are genuinely interactive
   / stateful. Do we accept that these steps have thinner unit coverage and
   rely on a smoke test invoked from CI inside a throwaway container, or do
   we invest in a richer fake for them? Proposed: thinner unit coverage +
   smoke test.
3. `openharness` (the Pi agent) is launched interactively in step 1. We
   can't test that path without a pty fake. Proposed: test everything *around*
   the call (pre/post auth checks, skip path) and treat the `exec.run` of
   `openharness` itself as a boundary.

## Acceptance criteria

- `openharness onboard`, `openharness onboard --force`, `openharness onboard
  --only <step>`, and positional `openharness onboard <step>` all behave
  byte-identically to the bash script on a fresh sandbox (validated by a
  manual diff of stdout + marker file).
- `pnpm -F @openharness/sandbox test` passes and covers every `should_run`
  branch from the bash script.
- `install/onboard.sh` is deleted from `main` by the end of the rollout.
- No change to `~/.claude/.onboarded` schema.
- No change to user-visible prompt wording or ordering.
