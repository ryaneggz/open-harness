# Multi-Worktree Heartbeats

**Status:** draft · **Date:** 2026-04-19 · **Owner:** harness-orchestrator

## Problem

Today the heartbeat daemon is **single-rooted**. `HeartbeatDaemon` takes one
`workspacePath` (`~/harness/workspace`), watches exactly one `heartbeats/`
directory, and spawns agents with no custom CWD. When an agent branch is
developed in a worktree (e.g. `.worktrees/agent/sdr-pallet/`), none of that
worktree's heartbeats, skills, CRM, SOUL.md, or memory are visible to the
running sandbox's daemon — they live on a branch the parent checkout isn't on.

The practical consequence surfaced today: the `agent/sdr-pallet` worktree ships
five heartbeats (`morning-pipeline`, `stuck-lead-sweep`, `weekly-lead-source`,
`weekly-pipeline-review`, `memory-distill`) and a full CRM workspace, but the
daemon inside `oh-remote` cannot see or fire any of them. To demo them we'd
have to either switch the parent checkout to the agent branch (sacrificing
isolation between branches) or stand up a dedicated sandbox per worktree
(heavy).

## Goal

One parent sandbox runs heartbeats from **N worktree workspaces** concurrently.
Each heartbeat executes against its own worktree's files (skills, CRM, SOUL.md,
memory/) so the agent branches stay isolated on disk but share the daemon,
container image, credentials, and base toolchain.

## Non-goals

- Filesystem-level isolation between worktrees (they already share the host FS)
- Per-worktree container boundaries (explicitly cheaper than this)
- Cross-worktree coordination (a worktree's heartbeat does not know about others)
- Rewriting agent spawn — we still use `child_process.spawn` with a wrapped CLI

## Current Architecture (concrete)

- `packages/sandbox/src/cli/heartbeat-daemon.ts:7` — hardcodes single
  `WORKSPACE = join(HOME, "harness/workspace")`.
- `packages/sandbox/src/lib/heartbeat/daemon.ts:8-15` — `DaemonOptions` carries
  one `workspacePath` + one `heartbeatDir`.
- `packages/sandbox/src/lib/heartbeat/daemon.ts:92-122` — single `fs.watch` on
  one directory.
- `packages/sandbox/src/lib/heartbeat/scheduler.ts:14-15` — single `jobs` map
  keyed by slug derived from `filePath` alone (collides across worktrees).
- `packages/sandbox/src/lib/heartbeat/runner.ts:100-159` — spawn has no `cwd`
  option; inherits daemon CWD.
- `packages/sandbox/src/lib/heartbeat/runner.ts:17` — concurrency guard
  (`this.running`) keys on bare `entryName` (collides across worktrees).
- `packages/sandbox/src/lib/heartbeat/config.ts:66-90` — parses exactly one
  `workspacePath/heartbeats/` dir.

## Proposed Architecture

Introduce a `WorkspaceRoot` and thread it through every layer. Each
`HeartbeatEntry` carries its root. Everything else generalizes.

### New types

```ts
// packages/sandbox/src/lib/heartbeat/config.ts
export interface WorkspaceRoot {
  workspacePath: string;   // absolute; e.g. /home/sandbox/harness/workspace
                           //     or /home/sandbox/harness/.worktrees/agent/sdr-pallet/workspace
  heartbeatDir: string;    // <workspacePath>/heartbeats
  soulFile?: string;       // default: <workspacePath>/SOUL.md
  memoryDir?: string;      // default: <workspacePath>/memory
  label: string;           // stable human-readable name, e.g. "parent" or "sdr-pallet"
}

export interface HeartbeatEntry {
  cronExpr: string;
  filePath: string;        // relative to entry.root.workspacePath
  agent: string;
  activeStart?: number;
  activeEnd?: number;
  root: WorkspaceRoot;     // NEW — travels with the entry
}
```

### Discovery

New helper `discoverWorkspaceRoots()` called by the CLI entrypoint. Uses
`git worktree list --porcelain` as the source of truth — git already tracks
every worktree and its branch, which is more reliable than inferring from
directory layout (worktree dirs can be nested, flat, or outside the repo entirely).

1. Run `git -C $HOME/harness worktree list --porcelain`. Parse into `{path, branch}` pairs.
2. For each entry, check if `<path>/workspace/heartbeats/` exists. If yes, include it as a root:
   - `workspacePath = <path>/workspace`
   - `label = sanitizeBranch(branch)` — strip `refs/heads/`, replace `/` with `-`, lowercase. Examples: `agent/sdr-pallet` → `agent-sdr-pallet`, `main` → `main`, detached → `detached-<shortsha>`.
3. Allow override/augment via env var `HEARTBEAT_ROOTS=path1:label1,path2:label2`. Overrides take precedence over auto-discovery for the same path.

Discovery runs at daemon startup and when the top-level watcher (on `$HOME/harness/.git/worktrees/`, which git maintains) fires — that is git's own worktree-tracking directory, so add/remove is directly observable without walking the tree.

This resolves the label-collision question: two worktrees of the same leaf
name (`agent/foo` vs `feat/foo`) get distinct labels because their branches
differ.

### Daemon

`DaemonOptions.workspacePath: string` → `workspaceRoots: WorkspaceRoot[]`.
Back-compat shim: if a consumer constructs `{ workspacePath, heartbeatDir, ... }`, wrap into a one-element `workspaceRoots` array with label `"parent"`.

The daemon owns N file watchers, one per root. Each watcher triggers the same debounced `sync()`. `sync()` calls `parseHeartbeatConfigAcrossRoots(roots)` and hands the merged entry list to a single `HeartbeatScheduler`.

### Scheduler

Keep one scheduler. Change the key from `entryName` to a composite:

```ts
private entryKey(entry: HeartbeatEntry): string {
  return `${entry.root.label}::${entry.filePath.replace(/\.md$/, "").replace(/\//g, "-")}`;
}
```

Fingerprint includes the root so a path/label change forces a reschedule:

```ts
private fingerprint(entry: HeartbeatEntry): string {
  return `${entry.root.workspacePath}|${entry.cronExpr}|${entry.agent}|${entry.activeStart ?? ""}|${entry.activeEnd ?? ""}`;
}
```

### Runner

- Runner no longer takes a global `RunnerOptions` with a single workspace — it reads paths off `entry.root` per call.
- Concurrency guard keys on the same composite as the scheduler.
- `spawnAgent()` passes `cwd: entry.root.workspacePath` to `spawn()` so the agent CLI resolves skills and relative paths inside the worktree's workspace.
- Prompt assembly reads `entry.root.soulFile` (not a shared default).
- Memory reference (`memory/YYYY-MM-DD.md`) — the prompt text is unchanged, but because CWD is the worktree, the agent writes memory into the correct worktree's `memory/` directory.

### Global concurrency cap

Per-entry concurrency guards (keyed on `(root, entryName)`) prevent a single
heartbeat from overlapping itself, but multiple worktrees whose schedules
align (e.g., three `morning-pipeline` clones firing at `0 13 * * 1-5`) would
spawn N concurrent `claude -p` processes against the same API key.

Add a daemon-level cap:

```ts
// lib/heartbeat/runner.ts
private readonly maxConcurrent: number;       // from HEARTBEAT_MAX_CONCURRENT, default 2
private readonly pending: Array<() => void>;  // waiters

async run(entry) {
  await this.acquireSlot();
  try { /* existing run body */ }
  finally { this.releaseSlot(); }
}
```

Waiters are FIFO; if a heartbeat's cron tick lands while all slots are taken,
it queues up to the 300 s per-run timeout window and then logs
`[root::entry] Skipped (concurrency cap reached)` rather than stacking
indefinitely. Default `2` — tunable via `HEARTBEAT_MAX_CONCURRENT`. Set to
`0` to disable the cap (legacy behavior).

### Logger

Two options:

1. **Per-root log** (recommended): `HeartbeatLogger` instances keyed by `root.label`, each pointing at `<root.heartbeatDir>/heartbeat.log`. Operational messages (scheduled/stopped/error) also write to the per-root log of the affected entry. The aggregate "daemon-level" log (startup/shutdown/discovery errors) goes to the parent root's log.
2. **Shared log with prefix**: one log file at `~/.heartbeat-daemon.log` with `[label]` prefix on every line. Simpler, worse diff-per-worktree ergonomics.

Pick option 1 — it matches the "workspace owns its artifacts" invariant already true for memory/ and crm/.

### CLI (`heartbeat-daemon status`)

Group output by root:

```
Heartbeat daemon: running (pid 12345)

Roots:
  parent       → /home/sandbox/harness/workspace (3 schedules)
  sdr-pallet   → /home/sandbox/harness/.worktrees/agent/sdr-pallet/workspace (5 schedules)

Schedules:
  parent::nightly-release    50 23 * * *    next: 2026-04-19 23:50 UTC
  parent::test-sys-metrics   */2 * * * *    next: 2026-04-19 17:14 UTC
  sdr-pallet::morning-pipeline  0 13 * * 1-5  next: 2026-04-20 13:00 UTC
  ...

Recent log (parent):
  ...
Recent log (sdr-pallet):
  ...
```

## Code Sketch (diff shape, not a patch)

```ts
// cli/heartbeat-daemon.ts
const ROOTS = discoverWorkspaceRoots({
  home: HOME,
  overrides: process.env.HEARTBEAT_ROOTS,
});
const daemon = new HeartbeatDaemon({
  workspaceRoots: ROOTS,
  defaultAgent: process.env.HEARTBEAT_AGENT ?? "claude",
  defaultInterval: parseInt(process.env.HEARTBEAT_INTERVAL ?? "1800", 10),
});

// lib/heartbeat/daemon.ts — constructor
for (const root of options.workspaceRoots) {
  this.loggers.set(root.label, new HeartbeatLogger(join(root.heartbeatDir, "heartbeat.log")));
}
this.scheduler = new HeartbeatScheduler({ loggers: this.loggers });

// lib/heartbeat/daemon.ts — startWatching
for (const root of this.options.workspaceRoots) {
  this.watchRoot(root); // one fs.watch per root, all triggering the same debounced sync()
}
this.watchWorktreeRoot(); // watches .worktrees/ itself for add/remove, re-runs discovery

// lib/heartbeat/runner.ts — spawnAgent
proc = spawn(agent, args, {
  cwd: entry.root.workspacePath,   // <-- key change
  signal: AbortSignal.timeout(300_000),
});
```

## Edge Cases

1. **Worktree added mid-daemon** → top-level `.worktrees/` watcher triggers rediscovery → new root's `fs.watch` is installed → next sync picks up its heartbeats.
2. **Worktree removed while a run is in flight** → runner completes the in-flight run, scheduler drops the entry on next sync, watcher is closed in cleanup.
3. **Same filename in two worktrees** → scheduler keys namespace by label, no collision. Two concurrent runs of `morning-pipeline` from different worktrees are allowed.
4. **Branch switch inside a worktree that removes a heartbeat** → existing file watcher fires → sync drops the entry → scheduler stops the job.
5. **Symlink loops or inaccessible worktrees** → discovery skips roots that can't `stat`; logs a single startup warning; does not crash.
6. **Log rotation race** → each per-root logger rotates independently; no cross-root locking needed because each writes to its own file.
7. **`HEARTBEAT_ROOTS` overrides collide with auto-discovery** → override wins, auto-discovery skips already-present paths.
8. **Worktree's SOUL.md missing** → runner falls back to no-soul prompt (existing behavior).
9. **Heartbeat file outside `heartbeats/` dir** → not supported; discovery only reads `<root>/heartbeats/*.md`.

## Security / Trust Boundary

All discovered worktrees are treated as trusted (they live on a git-managed
path the user controls). This is the same trust model as today's single-root
daemon — no new attack surface. We are not auto-provisioning anything from
untrusted checkouts.

## Testing

Extend existing unit tests under `packages/sandbox/src/__tests__/`:

- `heartbeat-config.test.ts` — add `parseHeartbeatConfigAcrossRoots` cases: two roots with disjoint files, two roots with same filename, one root with a missing `heartbeats/` dir.
- `heartbeat-scheduler.test.ts` — add: same-filename entries from two roots schedule independently; removing a root's entry doesn't affect another root.
- `heartbeat-runner.test.ts` — assert `spawn` called with `cwd === entry.root.workspacePath`; per-root concurrency guard (same-name entries in two roots run concurrently).
- New `heartbeat-discovery.test.ts` — fake HOME with parent + two `.worktrees/*/workspace` dirs; assert labels and paths; env-var override merges correctly.

Integration check (manual, one-time):
1. Create a second worktree (`git worktree add .worktrees/test/demo -b test/demo`).
2. Add `.worktrees/test/demo/workspace/heartbeats/ping.md` with `*/1 * * * *` + body "reply HEARTBEAT_OK".
3. Restart daemon. Expect two roots, one `ping` schedule under `test-demo::ping`.
4. Wait 60 s. Expect a `Running heartbeat` line in `.worktrees/test/demo/workspace/heartbeats/heartbeat.log`, not in the parent's log.

## Migration

- No breaking change for existing single-root setups. Consumers passing the
  old `{ workspacePath, heartbeatDir, ... }` shape are auto-wrapped into a
  one-element `workspaceRoots` array.
- CLI `heartbeat-daemon` reads new `HEARTBEAT_ROOTS` env var if set, otherwise
  auto-discovers. `entrypoint.sh` gets one line to export the env var from
  `HEARTBEAT_ROOTS` if the operator wants to pin roots explicitly.
- Existing `heartbeat-daemon status` output format gains a "Roots:" section;
  no existing line is removed — scripts that grep for `cronExpr → filePath`
  still match.

## Open Questions

1. **Watcher cap**: is there a practical limit on `fs.watch` instances?
   Node's default inotify limit is ~8k — far above any realistic worktree
   count — but worth a ceiling check (e.g., warn at >32 roots).
2. **Per-root `active` default**: should a worktree be able to set a root-
   level `active` window that applies to all its heartbeats? Nice-to-have,
   not required for v1.
3. **Claude settings per worktree**: when we spawn with `cwd` inside the
   worktree, the `claude` CLI will load that worktree's
   `.claude/settings.json`. That's probably the *desired* behavior (each
   agent branch is meant to be its own universe) but call it out explicitly
   in the PR-2 commit message so reviewers confirm.

## Deliverable Sequence

1. **PR-1** — `WorkspaceRoot` type + `HeartbeatEntry.root` field + single-root
   back-compat + passing existing tests. Zero behavioral change.
2. **PR-2** — `discoverWorkspaceRoots()` + multi-root watcher + scheduler
   namespacing + runner CWD. This PR alone enables the architecture; new
   tests land alongside.
3. **PR-3** — CLI `status` grouping + per-root logger split.
4. **PR-4** — top-level `.worktrees/` watcher for hot add/remove.

Each PR is independently reviewable and shippable. PR-2 is the smallest
slice that actually solves the user's demo blocker.
