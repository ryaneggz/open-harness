---
title: "Open Harness"
---

# Open Harness

**Open Harness** — run Claude, Codex, Gemini, and Pi side-by-side from one `docker compose up`. Each agent gets its own branch, its own SOUL, its own schedule.

- **Worktree-per-agent.** Each agent gets its own branch, its own SOUL, its own schedule.
- **Agents that work while you sleep.** Cron-driven heartbeats wake them to do real work, autonomously.
- **One container, every agent.** Claude Code, Codex, Pi, Gemini CLI — same sandbox, same toolchain.
- **Only host dependency: Docker.** No Node, no Python, no toolchain rot on your laptop.
- **Composable infra.** Cherry-pick Postgres, Cloudflare tunnels, SSH, Slack, Caddy gateway.

## Why Open Harness?

AI coding agents are powerful — but they run with broad system permissions, execute arbitrary code, and need a full development toolchain. Open Harness solves the tension between giving agents the freedom they need and keeping your host machine safe.

| Benefit | Details |
|---------|---------|
| **Isolation** | Agents run in a disposable Debian container with `--dangerously-skip-permissions` |
| **Zero-config** | `.devcontainer/Dockerfile` bakes in Node 22, pnpm, Bun, uv, Docker CLI, GitHub CLI, and all agent CLIs |
| **Agent-agnostic** | Same sandbox runs Claude Code, Codex, and Pi Agent side by side |
| **Persistent identity** | SOUL.md, MEMORY.md, and daily logs give agents continuity across sessions |
| **Autonomous** | Cron-scheduled heartbeats let agents wake, perform tasks, and sleep |
| **Composable** | Compose overlays add PostgreSQL, Cloudflare tunnels, Docker-in-Docker, and more |
| **Reproducible** | Identical environment every time, on any machine |
| **CI/CD ready** | GitHub Actions for harness CI, app CI, and tagged releases to GHCR |

## Documentation

- [Getting Started](./getting-started/README.md) — Install the CLI and start your first sandbox
- [Guide](./guide/README.md) — Configuration, overlays, workspace, exposure, heartbeats
- [Architecture](./architecture/README.md) — System design, worktrees, identity model
- [Slack Bot](./slack/README.md) — Connect agents to Slack channels
- [CLI Reference](./cli/commands.md) — Full command reference
- [Blog](./blog/README.md) — Engineering notes and deep-dives
- [Wiki](./wiki/index.md) — Long-form notes and synthesis pages
- [About](./about.md) — What Open Harness is
- [Launch Runbook](./launch-runbook.md) — Maintainer-only cutover checklist

## Quick Links

- [Installation](./getting-started/installation.md) — Install the CLI
- [Quickstart](./getting-started/quickstart.md) — Start a sandbox in 3 steps
- [CLI Commands](./cli/commands.md) — Full command reference
- [Slack Bot](./slack/overview.md) — Connect agents to Slack
