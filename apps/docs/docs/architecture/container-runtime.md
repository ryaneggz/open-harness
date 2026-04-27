---
sidebar_position: 2
title: "Container Runtime"
---

# Container Runtime

The sandbox container is the only runtime environment where agent code executes. Everything from the AI agent CLI to git, Node.js, Docker, and tmux is preinstalled in the image. The host only needs Docker.

## Image Base

The Dockerfile at `.devcontainer/Dockerfile` starts from `debian:bookworm-slim`. The following tools are installed in the image build:

| Layer | What is installed |
|-------|-------------------|
| System packages | `git`, `tmux`, `curl`, `jq`, `ripgrep`, `zsh`, `sudo`, `procps`, `iproute2` |
| Node.js 22.x | Via the NodeSource setup script |
| GitHub CLI | `gh` — used for `gh auth login`, `gh auth setup-git`, and PR/issue commands |
| Docker CLI + Compose | `docker-ce-cli`, `docker-compose-plugin` — for nested docker access and compose overlays |
| Cloudflared | Cloudflare tunnel daemon for public URL routing |
| Bun | Fast JS runtime and package manager |
| uv + uvx | Python package management (for Python-based agent tasks) |
| pnpm | Via corepack — package manager for the harness monorepo |
| Agent CLIs | Claude Code, Pi (`oh`/`pi`), and Codex installed globally via npm |

The entrypoint script at `.devcontainer/entrypoint.sh` (which calls `install/entrypoint.sh`) initializes git config, ensures pnpm deps are installed, and runs optional onboarding on first start.

## Docker Compose Configuration

The primary compose file is `.devcontainer/docker-compose.yml`. It defines a single service named `sandbox` (default container name: `openharness`, overridable via `SANDBOX_NAME`).

Key configuration choices:

- `init: true` — a PID-1 init process ensures signals propagate cleanly to child processes.
- `restart: unless-stopped` — the container survives Docker daemon restarts unless explicitly stopped.
- `command: sleep infinity` — keeps the container alive; actual work happens inside named tmux sessions, not in the foreground process.
- `stdin_open: true` and `tty: true` — required for interactive shells via `docker exec`.

Optional overlays in `.devcontainer/` add services (Postgres, Cloudflare tunnel, SSH daemon, Slack bot) and are activated by listing them in `.openharness/config.json` under `composeOverrides`. The `/provision` skill reads that file and passes the correct `-f` flags to `docker compose up`.

## Bind Mounts

The container mounts the project root and several named volumes:

| Mount | Host path | Container path | Purpose |
|-------|-----------|---------------|---------|
| Project root | `..` (repo root) | `/home/orchestrator/harness` | Source code, worktrees, workspace |
| OH config | `../.openharness` | `/home/orchestrator/.openharness` | Sandbox config, Caddyfile, exposures |
| Docker socket | `/var/run/docker.sock` | `/var/run/docker.sock` | Nested docker for the `oh` CLI |
| Claude auth | named volume `claude-auth` | `/home/orchestrator/.claude` | Claude Code credentials — persists across rebuilds |
| Pi auth | named volume `pi-auth` | `/home/orchestrator/.pi` | Pi Agent OAuth tokens |
| Codex auth | named volume `codex-auth` | `/home/orchestrator/.codex` | Codex credentials |
| Cloudflared | named volume `cloudflared-auth` | `/home/orchestrator/.cloudflared` | Cloudflare tunnel credentials |
| GitHub CLI | named volume `gh-config` | `/home/orchestrator/.config/gh` | `gh` auth tokens |

The bind-mount of the repo root at `/home/orchestrator/harness` means files written inside the container appear immediately on the host filesystem (and vice versa). This is how git worktrees created with `git worktree add .worktrees/<branch> <branch>` are visible to both the host and all processes inside the container without any copy step.

The Docker socket mount gives the `oh` CLI inside the container access to the host Docker daemon, enabling nested container management — starting, stopping, and inspecting sibling containers from inside the sandbox.

## Caddy Gateway Overlay

The gateway overlay (`docker-compose.gateway.yml`, loaded when configured) runs a Caddy reverse proxy that routes HTTPS traffic to listening ports inside the sandbox. Routes are managed by `oh expose <name> <port>` and stored in `.openharness/exposures.json`. Caddy reloads its configuration in-process via its admin API on `127.0.0.1:2019` — `oh expose` never recreates the sandbox container.

URL shape depends on mode:

- **Laptop mode** (no `PUBLIC_DOMAIN`): `https://<name>.<sandbox>.localhost:8443` with self-signed TLS (`tls internal`).
- **Remote mode** (`PUBLIC_DOMAIN` set in `.devcontainer/.env`): `https://<name>.<sandbox>.<PUBLIC_DOMAIN>` with ACME or a Cloudflare named tunnel.

The Caddyfile at `.openharness/Caddyfile` is regenerated on every `oh expose` / `oh unexpose` call and is gitignored. Do not hand-edit it.

## Environment Variables

Key variables the sandbox reads at runtime (set in `.devcontainer/.env` or passed via `docker compose`):

| Variable | Purpose |
|----------|---------|
| `SANDBOX_NAME` | Container and compose project name (default: `openharness`) |
| `TZ` | Timezone for cron scheduling (default: `America/Denver`) |
| `GH_TOKEN` | Pre-loaded GitHub token for `gh auth` automation |
| `GIT_USER_NAME`, `GIT_USER_EMAIL` | Git commit identity |
| `HEARTBEAT_ACTIVE_START`, `HEARTBEAT_ACTIVE_END` | Active window hours for heartbeat scheduling |
| `HEARTBEAT_AGENT` | Default agent CLI used by heartbeat tasks (default: `claude`) |
| `INSTALL_AGENT_BROWSER` | Set to `true` to install Chromium at startup (opt-in) |
