---
title: "Open Harness"
---

# Open Harness

**Open Harness** — one `docker compose up` gives you a sandbox (a Docker container) with everything AI coding agents need. Inside, you run as many **harnesses** as you like — each a git worktree with its own branch, identity (SOUL), and cron schedule. The root harness is the **orchestrator**: it provisions and manages the rest.

- **One sandbox, every agent.** Claude Code, Codex, Pi, and Gemini CLI share the same container image and toolchain — pick which agent powers each harness.
- **Worktree-per-agent.** Each harness gets its own git branch, its own SOUL, and its own schedule, isolated under `.worktrees/`.
- **Harnesses that work while you sleep.** Cron-driven heartbeats wake them to do real work, autonomously.
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
