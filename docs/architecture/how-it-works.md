---
title: "How It Works"
---


## Boot sequence

When you start a sandbox (`openharness sandbox` or `docker compose up`), this sequence runs:

1. **Docker builds the image** from `.devcontainer/Dockerfile` — Debian Bookworm with Node 22, agent CLIs, and all dev tools baked in

2. **docker-compose.yml starts the container** with:
   - Workspace bind-mounted at `/home/sandbox/harness`
   - Named volumes for auth persistence (Claude, Cloudflare, GitHub CLI configs)
   - Compose overlays add optional services based on `.openharness/config.json`

3. **entrypoint.sh runs as root:**
   - Matches the container's Docker group GID to the host socket GID (fixes DinD permissions)
   - Fixes volume ownership (root → sandbox user)
   - Runs conditional SSH server setup if sshd overlay is active
   - Starts the heartbeat daemon (`heartbeat-daemon start`) to watch every worktree's `heartbeats/` directory for scheduled tasks — see [Orchestrator + Worktrees](./orchestrator-worktrees.md)
   - Runs `workspace/startup.sh` as the sandbox user
   - Prints first-boot onboarding message if not yet onboarded
   - Execs the container command (`sleep infinity` by default, or `sshd -D` with the sshd overlay)

4. **startup.sh runs as sandbox user:**
   - Installs project dependencies (`pnpm install`)
   - Starts the Next.js dev server in the background
   - Starts the Cloudflare tunnel (if configured)
   - Waits for port 3000 to respond
   - Prints "Startup complete"

## Container environment

The sandbox user has:
- Passwordless sudo access
- Docker group membership (when DinD overlay is enabled)
- Pre-installed agent CLIs: `claude`, `codex`, `pi`, `mom`
- Git configured with `safe.directory` for the harness mount
- Shell that auto-changes to `~/harness`

## Volume persistence

Named Docker volumes persist across container restarts:

| Volume | Path | Purpose |
|--------|------|---------|
| `claude-auth` | `~/.claude` | Claude Code credentials |
| `cloudflared-auth` | `~/.cloudflared` | Cloudflare tunnel config |
| `gh-config` | `~/.config/gh` | GitHub CLI auth |
| `ssh-keys` | `~/.ssh` | SSH keypair (if ssh-generate overlay) |

The workspace itself is bind-mounted from the host, so changes persist naturally.
