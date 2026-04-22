---
title: "Orchestrator-Worktree Architecture"
description: "Canonical shape for running multiple Open Harness agents: one sandbox, N git worktrees, one heartbeat daemon."
type: concept
tags: [architecture, harness, worktrees, heartbeats, orchestrator]
sources: []
created: 2026-04-19
updated: 2026-04-19
---

## Summary

Open Harness runs every agent as a git branch checked out as a worktree under
`.worktrees/`. A single container (`oh-remote`) bind-mounts the entire repo,
so all worktrees are visible to one shared toolchain and one shared credential
set. A single heartbeat daemon inside the sandbox watches every worktree's
`workspace/heartbeats/` at once, spawning each task with the correct `cwd`.

This is the authoritative topology. "One sandbox per agent" is an escape
hatch, not the default.

## Key actors

- **Orchestrator** — session at the project root. Owns harness source,
  git operations, GitHub issues/PRs/releases, and the one-time scaffold
  of each new agent's `workspace/`. Does not write application code.
- **Worktree agent** — session inside `.worktrees/<prefix>/<slug>/workspace/`.
  Owns its workspace subtree (SOUL.md, skills, heartbeats, memory, CRM,
  wiki, projects) and its branch history.
- **Sandbox container** — default name `oh-remote`. Bind-mounts
  `/home/sandbox/harness`, hosts the shared toolchain and credentials.
- **Heartbeat daemon** — one Node process per sandbox. Discovers roots
  from `git worktree list --porcelain`; one `fs.watch` per root; each
  spawn uses `cwd = <worktree>/workspace`.

## Why this shape

1. **Branches have identities.** SOUL.md, skills, CRM, heartbeats all
   live on a branch — agent identity is files on disk, not runtime
   config.
2. **One container per agent is too heavy.** A sandbox is a real OS
   with its own toolchain, credentials, and dev servers.
3. **Merging agent work is a git problem.** Git worktrees already solve
   "multiple branches at once." The natural fit: worktrees on the host,
   one container for all of them.

## Isolation (thin)

Per-worktree: filesystem under `workspace/`, git history, heartbeat
schedules + logs, agent identity, memory/CRM/wiki artifacts.
Shared: credentials (`gh auth`, Anthropic key), container runtime, API
quotas, OS/kernel. This is enough to keep artifacts clean and
independently committable, not enough to sandbox a hostile agent. All
agents in a sandbox must be mutually trusted.

## Heartbeat discovery

The daemon runs `git worktree list --porcelain` and includes every
worktree whose `workspace/heartbeats/` exists. Labels are derived from
branch names (`refs/heads/` stripped, `/` → `-`, lowercased). Scheduler
keys namespace by label (`${label}::${slug}`) so same-named heartbeats
in two worktrees don't collide. `HEARTBEAT_MAX_CONCURRENT` (default 2)
caps daemon-wide concurrent spawns to smooth aligned schedules.
`HEARTBEAT_ROOTS=path1:label1,path2:label2` overrides auto-discovery on
path collisions.

## When to add a new worktree vs a new sandbox

- **New worktree** — merge-back work, shared stack, shared trust level,
  shared rate limits. Most agent work.
- **New sandbox** — kernel-level isolation (untrusted code),
  conflicting global tooling, isolated API quotas, reproducing a
  customer environment.

## References

- Docs: [Orchestrator + Worktrees](/docs/architecture/orchestrator-worktrees)
- Docs: [Heartbeats guide](/docs/guide/heartbeats) — env vars, multi-root logs
- Spec: `.claude/specs/orchestrator-worktree-architecture.md` (canonical)
- Spec: `.claude/specs/multi-worktree-heartbeats-spec.md` (daemon design)
- Source: `packages/sandbox/src/lib/heartbeat/`
