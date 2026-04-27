---
sidebar_position: 4
title: "Daemon"
---

# Daemon

The heartbeat daemon is a long-running Node.js process that discovers heartbeat configuration files across all active worktrees, schedules cron jobs for each one, and invokes the configured agent CLI when a job fires. It is the automation backbone behind scheduled agent tasks.

## Role

The daemon bridges two concerns: configuration expressed as markdown files (with YAML frontmatter) and the cron-based execution of agent CLI commands. It does not run the agent directly — it spawns the agent CLI (`claude`, `pi`, `codex`, or any configured binary) with the heartbeat's prompt as input.

Because the daemon watches the filesystem for changes to `.md` files, heartbeats can be added, removed, or edited at runtime without restarting the daemon. Changes are detected via `fs.watch` with a 500ms debounce.

## Config Location

Heartbeat definitions are `.md` files with YAML frontmatter stored in the `workspace/heartbeats/` directory of each worktree. Example files in the primary checkout:

```
workspace/heartbeats/nightly-release.md
workspace/heartbeats/slack-server-check.md
workspace/heartbeats/wiki-lint.md
```

Each file's frontmatter defines when and how the heartbeat fires:

```yaml
---
schedule: "50 23 * * *"
agent: claude
active: 9-21
---
```

Fields:

| Field | Description | Example |
|-------|-------------|---------|
| `schedule` | Standard cron expression | `"*/30 * * * *"` |
| `agent` | Agent CLI to invoke | `claude`, `pi`, `codex` |
| `active` | Optional active window (hours, 24h format) | `9-21` (9 AM to 9 PM) |

When an `active` window is set, the daemon's gate logic skips the invocation outside those hours even if the cron expression fires.

## Source Location

The daemon implementation lives in `packages/sandbox/src/lib/heartbeat/`:

| File | Purpose |
|------|---------|
| `daemon.ts` | `HeartbeatDaemon` class — root of the daemon; owns startup, sync, and file watchers |
| `scheduler.ts` | `HeartbeatScheduler` — wraps `croner` cron jobs; differentially syncs jobs on config change |
| `config.ts` | Parses frontmatter from `.md` files; defines `HeartbeatEntry` and `WorkspaceRoot` types |
| `discovery.ts` | `discoverWorkspaceRoots` — finds all active worktrees by inspecting `.git/worktrees/` |
| `runner.ts` | `HeartbeatRunner` — spawns the agent CLI process for a given entry |
| `logger.ts` | `HeartbeatLogger` — appends to `workspace/heartbeats/heartbeat.log` per root |
| `gates.ts` | Active-window gate logic used by the runner |

## Multi-Root Mode

The daemon operates in either single-root (legacy) or multi-root mode. In multi-root mode, it accepts a list of `WorkspaceRoot` objects — one per active worktree — and manages a separate `fs.watch` instance and logger for each. Schedule keys are namespaced as `<label>::<slug>` so entries from different worktrees never collide.

When the `rediscover` option is set, the daemon also watches `.git/worktrees/` at the repo root. When git adds or removes a worktree entry in that directory, the daemon runs `discoverWorkspaceRoots` again, diffs the result against the current set, tears down watchers and loggers for removed roots, and installs new ones for added roots — all without a restart.

## Sync Command

A one-shot sync can be triggered from the CLI without a running daemon:

```bash
openharness heartbeat sync
```

This reads all heartbeat files across discovered roots and prints the resulting schedule. It is useful for verifying config after editing a frontmatter file.

To check the status of a running daemon:

```bash
openharness heartbeat status <sandbox-name>
```

The status output includes the list of active worktree roots, the cron expression and entry name for each scheduled job, and the 10 most recent lines from each root's `heartbeat.log`.

## Log Files

Each worktree root writes its heartbeat events to its own log file:

```
workspace/heartbeats/heartbeat.log
```

The log records scheduling events, invocation results, and watcher errors. It is a plain text append-only file that the `/heartbeat` skill and `oh heartbeat status` both read.

## Creating a New Heartbeat

The `/heartbeat` skill writes a new `.md` file to `workspace/heartbeats/` and immediately calls `openharness heartbeat sync` so the daemon picks up the new entry on the next poll cycle without a restart. Manually adding a file and saving it achieves the same result because the daemon's `fs.watch` callback detects the change and triggers a differential sync within 500ms.
