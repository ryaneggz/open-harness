# Orchestrator + Worktree Agents in a Shared Sandbox

**Status:** canonical · **Date:** 2026-04-19 · **Owner:** harness-orchestrator

> This is the primary configuration pattern for Open Harness. If you're here
> to understand "where does this code run, and who owns what," read this
> document first. It supersedes anything implicit in `CLAUDE.md` or
> agent-level docs.

## TL;DR

- **One parent sandbox** (container) is the shared runtime. Provisioned once.
- **N git worktrees** live under `.worktrees/` on the host. Each tracks a
  branch (usually `agent/<name>`). Each ships its own `workspace/`
  (skills, CRM, SOUL.md, heartbeats, memory, wiki, projects).
- **One heartbeat daemon** inside the sandbox watches all worktree
  workspaces. Discovered automatically from `git worktree list`. Spawns
  each heartbeat with `cwd` inside that worktree's workspace, so skills
  and relative paths resolve against the correct agent.
- **The orchestrator** (the session running at the project root) scaffolds
  new agents, manages git/issues/PRs, and runs sandbox lifecycle skills
  (`/provision`, `/destroy`, `/repair`). It does NOT write application
  code — that happens inside agent workspaces.
- **Thin isolation** between agents: each has its own filesystem subtree
  and schedule, all sharing one container, one credential set, one daemon.

## Why this shape

Three forces drove this topology:

1. **Branches have identities**, not just code. An `agent/sdr-pallet`
   branch has its own CRM schema, templates, skills, heartbeats, SOUL.md.
   Agent identity is files on disk, not runtime config.
2. **Running N containers per N agents is too heavy.** Each sandbox is a
   real OS with its own toolchain, credentials, dev server. Duplicating
   that per agent explodes resource use and onboarding friction.
3. **Merging agent work back to main is a git problem**, not a
   container problem. Git worktrees already solve "multiple branches
   checked out simultaneously." The natural fit is: worktrees on the
   host, one container for all of them.

The resulting pattern — **one sandbox, N worktrees, one daemon** — gives
each agent a stable identity, shared tooling, and independent schedules
without per-agent infrastructure.

## Topology

```
┌────────────────────── host filesystem ───────────────────────┐
│                                                              │
│  /home/sandbox/harness/              ← main checkout          │
│  ├── .git/                                                    │
│  │   └── worktrees/                  ← git's worktree registry│
│  │       ├── agent/sdr-pallet/                                │
│  │       └── feat/71-mwh-pr1/                                 │
│  ├── workspace/                      ← parent checkout's      │
│  │   ├── heartbeats/                   workspace (main branch)│
│  │   ├── memory/                                              │
│  │   └── .claude/skills/                                      │
│  ├── packages/sandbox/               ← harness source         │
│  └── .worktrees/                                              │
│      ├── agent/                                               │
│      │   └── sdr-pallet/                                      │
│      │       └── workspace/          ← sdr-pallet's workspace │
│      │           ├── heartbeats/                              │
│      │           ├── crm/                                     │
│      │           ├── memory/                                  │
│      │           └── .claude/skills/                          │
│      └── feat/                                                │
│          └── 71-mwh-pr1/             ← ephemeral PR worktrees │
│                                                               │
│  ┌─── oh-remote container (bind-mounts /home/sandbox/harness)─┐│
│  │                                                            ││
│  │   heartbeat-daemon  (one process)                          ││
│  │     ├── fs.watch .git/worktrees/                           ││
│  │     ├── fs.watch workspace/heartbeats/        (parent)     ││
│  │     ├── fs.watch .worktrees/agent/sdr-pallet/…/heartbeats/ ││
│  │     └── fs.watch …each discovered worktree…                ││
│  │                                                            ││
│  │   claude, codex, pi, docker, pnpm, git, gh                 ││
│  │   (shared toolchain; one credential set)                   ││
│  │                                                            ││
│  └────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

## Actors

### 1. Orchestrator

- **Where it runs**: project root (`/home/sandbox/harness`), usually in a
  Claude Code session outside or attached to the sandbox. Also runs in
  the current session you're reading this in.
- **What it owns**:
  - Harness infrastructure: `.devcontainer/`, `install/`, `packages/`
  - Agent scaffolding: writing the initial `workspace/` for a new agent
  - Git operations: branches, worktrees, commits, PRs, releases
  - Sandbox lifecycle: `/provision`, `/destroy`, `/repair`
  - GitHub issues, labels, milestones
- **What it does NOT own**:
  - Agent business logic (CRM updates, outreach emails, domain code)
  - Ongoing edits to `workspace/` files once an agent is running
  - Anything inside `workspace/projects/` after the initial scaffold
- **Authoritative docs**: `/home/sandbox/harness/CLAUDE.md` (this file's
  parent orchestrator playbook).

### 2. Worktree Agent

- **Where it runs**: normally inside the sandbox, as a `claude` or `codex`
  session whose CWD is the worktree's `workspace/`. For heartbeats, as a
  short-lived `claude -p …` spawn from the daemon with the same CWD.
- **What it owns**:
  - Its `workspace/` subtree: `heartbeats/`, `skills/`, `memory/`,
    `SOUL.md`, `MEMORY.md`, `USER.md`, `IDENTITY.md`, `projects/*`,
    domain-specific dirs (`crm/`, `wiki/`, etc.)
  - Its agent-side rules and skills (`workspace/.claude/`)
  - Its branch's commit history
- **What it does NOT own**:
  - Harness source (`packages/sandbox/`, `.devcontainer/`, `install/`)
  - Other agents' workspaces
  - The daemon itself
- **Authoritative docs**: `workspace/CLAUDE.md` (agent-level) inside its
  worktree.

### 3. Sandbox (container)

- **Identity**: single Docker container, default name `oh-remote`.
- **Bind mounts**: `/home/sandbox/harness` → host's project root. This
  single mount gives the container visibility into all worktrees under
  `.worktrees/` automatically.
- **Shared resources**: credentials (`gh auth`, `~/.claude`, `~/.pi`),
  toolchain (Node, pnpm, Docker socket, `claude` / `codex` / `pi`),
  network, /tmp.
- **Boot**: `install/entrypoint.sh` starts the heartbeat daemon under a
  watchdog and optionally starts `pi` + Slack bot.

### 4. Heartbeat Daemon

- **Where it runs**: single Node process inside the sandbox.
- **Discovery**: on startup (and on `.git/worktrees/` mutations), calls
  `git worktree list --porcelain` and includes every worktree whose
  `<path>/workspace/heartbeats/` exists. Parent checkout is included
  the same way.
- **Per-root**: one `fs.watch` for each discovered `heartbeats/`, one
  `HeartbeatLogger` writing to `<root>/workspace/heartbeats/heartbeat.log`.
- **Scheduling**: single `HeartbeatScheduler` with per-root namespaced
  keys (`${label}::${slug}`) so two worktrees can ship identically-named
  heartbeats without collision.
- **Runner**: spawns `claude -p …` with `cwd: entry.root.workspacePath`.
  The agent CLI therefore loads that worktree's `.claude/settings.json`,
  skills, and relative paths. Global semaphore
  (`HEARTBEAT_MAX_CONCURRENT`, default `2`) prevents N worktrees from
  saturating the Anthropic API when their schedules align.
- **Canonical spec**: `.claude/specs/multi-worktree-heartbeats-spec.md`.
- **Source**: `packages/sandbox/src/lib/heartbeat/`.

## Filesystem Contract

| Path | Owner | Notes |
|------|-------|-------|
| `/home/sandbox/harness/` | orchestrator | Project root, main git checkout |
| `/home/sandbox/harness/.git/worktrees/` | git | Git's worktree registry. Daemon watches this for hot add/remove. |
| `/home/sandbox/harness/workspace/` | parent-branch agent | Parent checkout's workspace (when on a branch with one) |
| `/home/sandbox/harness/packages/` | orchestrator | Harness source (sandbox CLI, daemon, slack bot) |
| `/home/sandbox/harness/.worktrees/<prefix>/<slug>/` | worktree-branch agent | A single worktree on the host |
| `/home/sandbox/harness/.worktrees/<prefix>/<slug>/workspace/` | that agent | Its files |
| `/home/sandbox/harness/.claude/specs/` | orchestrator | Harness architecture specs |
| `/home/sandbox/harness/.claude/rules/` | orchestrator | Harness-wide coding rules |
| `/home/sandbox/harness/.claude/skills/` | orchestrator | Orchestrator-level skills (`/provision`, `/delegate`, …) |
| `.worktrees/<…>/workspace/.claude/rules/` | that agent | Agent-specific rules |
| `.worktrees/<…>/workspace/.claude/skills/` | that agent | Agent-specific skills |

> **Rule**: files under `.worktrees/<…>/workspace/` are agent-owned.
> The orchestrator writes them once during scaffolding, then does not
> modify them. Agents evolve their own workspaces.

## Lifecycle of a New Agent

```
 orchestrator session                         sandbox (oh-remote)
 ────────────────────                         ───────────────────
 1. gh issue create --label agent
    "agent: pallet-sdr intake"
        │
        ▼
 2. git worktree add -b agent/pallet-sdr \
    .worktrees/agent/pallet-sdr development
        │                                     git updates .git/worktrees/
        ├────────────────────────────────────▶pallet-sdr/ (new dir)
        ▼
 3. Scaffold workspace/:
      SOUL.md, MEMORY.md, USER.md
      skills/, heartbeats/, crm/, etc.
        │
        ▼                                     daemon's top-level watcher
 4. git commit -m "agent(#N): scaffold …"  ──▶fires, runs
                                               discoverWorkspaceRoots()
                                               finds new root
                                               starts heartbeat-dir watcher
                                               next sync() picks up
                                               heartbeat entries
        │
        ▼
 5. git push -u origin agent/pallet-sdr
        │
        ▼
 6. PR against development
        │
        ▼
 7. When heartbeats tick, daemon spawns
    claude -p (cwd = pallet-sdr workspace)
    Agent runs, writes to its own memory/,
    crm/, etc.
```

The orchestrator's job ends at step 4. After that the agent is live and
self-directing (per its heartbeat schedule + manual sessions).

## Discovery Mechanism

`discoverWorkspaceRoots(home, overrides?)` (see
`packages/sandbox/src/lib/heartbeat/discovery.ts`):

1. Run `git -C <home>/harness worktree list --porcelain`. Parse
   `worktree <path>` + `branch refs/heads/<name>` pairs.
2. For each pair, include as a root if `<path>/workspace/heartbeats/`
   exists.
3. `label = sanitizeBranch(branch)` — `refs/heads/` stripped, `/` → `-`,
   lowercased. Detached HEAD → `detached-<shortsha>`.
4. Merge overrides from `HEARTBEAT_ROOTS=path1:label1,path2:label2`.
   Overrides win on path collision.
5. Warn if discovered root count exceeds 32 (inotify sanity check).

`.git/worktrees/` is the authoritative source because git maintains it
directly. Filesystem layout under `.worktrees/` can be nested, flat, or
symlinked — discovery doesn't care.

## Spawn Semantics

When a heartbeat fires:

```ts
spawn("claude", ["-p", prompt, "--dangerously-skip-permissions"], {
  cwd: entry.root.workspacePath,        // e.g. .../sdr-pallet/workspace
  signal: AbortSignal.timeout(300_000),
});
```

Consequences:

- `claude` loads that worktree's `workspace/.claude/settings.json`
  (model, permissions, hooks).
- Slash-skills resolve against `workspace/.claude/skills/`.
- Relative paths in the prompt (`memory/YYYY-MM-DD.md`, `crm/leads.csv`,
  `workspace/.claude/skills/attention-list/`) resolve correctly.
- Memory and CRM writes land in the correct worktree's subtree.
- Credentials come from the container's shared user home
  (`~/.claude`, `~/.pi`, `~/.config/gh`) — shared across all agents.

> **Back-compat**: single-root daemons (legacy construction path, label
> `""`) do NOT pass `cwd`. Byte-identical to pre-multi-root behavior so
> existing deployments don't regress.

## Isolation Properties

| Dimension | Isolated? | Notes |
|-----------|-----------|-------|
| Filesystem under `workspace/` | Yes | Each worktree owns its subtree |
| Git history / branch state | Yes | Git worktrees are fully independent |
| Heartbeat schedules + logs | Yes | Per-root logger, per-root watcher |
| Agent identity (SOUL.md, skills) | Yes | Per-root, loaded via spawn cwd |
| Memory + CRM + wiki artifacts | Yes | Per-root directories |
| Credentials | **No** (shared) | One `gh auth`, one Anthropic key |
| Container runtime | **No** (shared) | Same processes, /tmp, network |
| Docker socket | **No** (shared) | Any agent can drive Docker |
| API quotas | **No** (shared) | `HEARTBEAT_MAX_CONCURRENT` smooths bursts |
| OS / kernel | **No** (shared) | One container |

This is "thin isolation" — enough to keep agent artifacts clean and
independently committable, not enough to sandbox a hostile agent. All
agents in a sandbox must be mutually trusted.

## When to Add a New Worktree vs a New Sandbox

**Add a new worktree agent when**:
- The work lives on a branch you'd eventually merge back
- The agent shares the same stack, credentials, and trust level
- You want shared tooling, shared rate limits, and independent identity
- You want the daemon to schedule it alongside other agents

**Add a new sandbox when**:
- You need kernel-level isolation (untrusted code, tenant separation)
- The agent needs a different OS, different base image, or conflicting
  global tooling (two clashing Node versions, different language
  runtimes)
- You need isolated rate limits (separate Anthropic account, separate
  API quota)
- You're reproducing a customer environment for debugging

Most "I want to add an agent" cases are the first bucket. New sandboxes
are rare and expensive.

## Trust Boundary

All worktrees discovered from the main checkout's `.git/worktrees/` are
treated as trusted. This is the same trust model as the rest of the
sandbox: if you can `git commit` to a branch in this repo, you can make
the daemon run code on your behalf. The `--dangerously-skip-permissions`
flag on the `claude` spawn makes this explicit.

Do NOT point `HEARTBEAT_ROOTS` at untrusted paths. Do NOT provision a
sandbox from a repo you don't own.

## Operational Playbook

### Adding an agent

```bash
# From the orchestrator session (project root)
gh issue create --label agent --title "agent(#N): <name> — <role>"
git worktree add -b agent/<name> .worktrees/agent/<name> development
# Scaffold workspace/ per the agent's role
git commit -m "agent(#N): scaffold <name>"
git push -u origin agent/<name>
# Daemon auto-discovers within 500ms after commit (if .git/worktrees/ watcher is active)
```

### Verifying a worktree agent is live

```bash
# Inside the sandbox
heartbeat-daemon status
# Look for: "Roots:" section includes your agent, and per-root schedules
```

### Diagnosing a stuck heartbeat

1. `heartbeat-daemon status` — is the schedule listed?
2. `tail -f <worktree>/workspace/heartbeats/heartbeat.log` — per-root log
3. If "Skipped (concurrency cap reached)" — raise `HEARTBEAT_MAX_CONCURRENT`
4. If "Outside active hours" — check frontmatter `active:` range
5. If "File is effectively empty" — the heartbeat body needs tasks
6. If timing out — the prompt is too heavy; trim it or raise spawn timeout

### Force rediscovery

```bash
# Sandbox-side
heartbeat-daemon sync      # re-parses, does not re-run discovery
# Trigger discovery by touching .git/worktrees/ (or restart the daemon)
```

### Reading per-root logs

```bash
# Each worktree has its own log
tail -f /home/sandbox/harness/workspace/heartbeats/heartbeat.log
tail -f /home/sandbox/harness/.worktrees/agent/sdr-pallet/workspace/heartbeats/heartbeat.log
```

### Retiring a worktree agent

```bash
git worktree remove .worktrees/agent/<name>
# Daemon auto-drops it on next .git/worktrees/ mutation event
# PR merge (or abandon) on the branch is a separate concern
```

## Failure Modes and Mitigations

| Failure | Cause | Mitigation |
|---------|-------|------------|
| Heartbeats from a worktree don't fire | Daemon can't see the worktree | Check `heartbeat-daemon status` for the root; verify `.git/worktrees/` watcher alive |
| Skills not found in spawned run | Spawn CWD wrong | Verify `entry.root.workspacePath` points at `<worktree>/workspace` not `<worktree>` |
| Two agents step on each other's memory | Same workspace path or symlink | Never share `workspace/` between worktrees |
| Anthropic rate-limit errors in heartbeats | Multiple roots firing concurrently | Tune `HEARTBEAT_MAX_CONCURRENT` down |
| `.git/worktrees/` watcher misses a mutation | Rapid add/remove under the 500ms debounce | Run `heartbeat-daemon sync` once |
| Worktree on detached HEAD | Label becomes `detached-<sha>` | Functional but noisy — check out a branch |
| inotify watcher exhaustion | >8k watchers (unrealistic but possible) | Raise `fs.inotify.max_user_watches` |

## Related Specs & Source

- `.claude/specs/multi-worktree-heartbeats-spec.md` — daemon design
- `packages/sandbox/src/lib/heartbeat/` — daemon implementation
- `packages/sandbox/src/lib/heartbeat/discovery.ts` — root discovery
- `install/entrypoint.sh` — sandbox boot, daemon watchdog
- `.devcontainer/docker-compose.yml` — sandbox bind mounts
- `CLAUDE.md` (project root) — orchestrator playbook
- `workspace/CLAUDE.md` (per worktree) — agent playbook
- `.claude/rules/git.md` — branch/worktree/PR conventions
- `.claude/rules/advisor-model.md` — pattern used by orchestrator to brief agents

## Open Questions & Future Work

1. **Per-agent credential rotation** — currently all agents share one
   Anthropic key. Splitting by agent would give per-agent rate budgets
   and per-agent audit trails, at the cost of credential management.
2. **Worktree quotas** — no hard cap on worktrees or per-worktree disk
   use. Inotify is the first thing to strain (~8k default).
3. **Cross-worktree coordination primitives** — agents today don't know
   about each other. If agent A produces output that agent B consumes,
   they coordinate through git (commits on a shared branch) or through
   the filesystem. A formal pub/sub has not been needed yet.
4. **Sandbox-per-branch escape hatch** — for the rare case where thin
   isolation is insufficient (untrusted code, conflicting tooling),
   document the "one sandbox per agent" alternative so operators know
   it exists. Tradeoffs captured above but not yet operationalized.
5. **Daemon observability** — today: log tails + `status`. Future:
   structured event stream, optional Slack delivery of heartbeat
   outputs (tracked in `docs/plans/event-heartbeat-delivery-plan.md`).

## Historical Note

This architecture was crystallized on 2026-04-19 after attempting to
demo the sdr-pallet agent's heartbeats and discovering that the daemon
was single-rooted. The fix (PRs #72, #74, #76, #78) made the daemon
multi-root and validated the pattern end-to-end. Before that, the
orchestrator + worktree + sandbox pattern was implicit in the harness
design but not documented; agent heartbeats from worktree branches
would silently never fire.

If you're reading this because you're about to add an agent or change
how sandboxes are provisioned, the answer to "how should this interact
with the rest of the system" is almost certainly in the tables above.
If it isn't, update this document.
