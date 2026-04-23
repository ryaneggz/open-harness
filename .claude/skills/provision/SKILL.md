---
name: provision
description: |
  Provision or rebuild the orchestrator sandbox.
  Reads .openharness/config.json for compose overlays, builds the image,
  starts all services, waits for startup, and runs test:setup to validate.
  TRIGGER when: provisioning, rebuilding, or when asked to set up the sandbox.
argument-hint: "[--rebuild]"
---

# Provision Sandbox

Provision (or rebuild) the orchestrator sandbox. One skill, zero manual steps.

## 0. Environment Guard

```bash
if [ -f /.dockerenv ]; then
  echo "ERROR: /provision is a host-only skill. You are inside the container."
  echo "Use /repair to diagnose and fix issues from inside the container."
  exit 1
fi
```

If inside the container, **stop immediately** and tell the user to use `/repair` instead.
Do not proceed with any other steps.

## 1. Resolve Parameters

Arguments received: `$ARGUMENTS`

- **REBUILD**: `true` if `--rebuild` flag is present, otherwise `false`

## 2. Resolve Name and Confirm Overlays

### 2a. Resolve sandbox name

```bash
bash .devcontainer/init-env.sh
source .devcontainer/.env
echo "SANDBOX_NAME=$SANDBOX_NAME"
```

Use `$SANDBOX_NAME` in all subsequent `docker` commands.

### 2b. Prompt user for compose overlays

List all available overlay files (everything matching `.devcontainer/docker-compose.*.yml`)
and show which are currently enabled in `.openharness/config.json`.

**Default overlays** (postgres is opt-in, not included by default):
- cloudflared, docker, slack

**Guard**: `docker-compose.git.yml` requires `GIT_COMMON_DIR` (only valid in worktrees).
If not in a worktree, do NOT include `git.yml` — it will produce invalid mount path `:`.

Present a checklist to the user **before proceeding**:

```
Available compose overlays:
  [ ] docker-compose.postgres.yml      — PostgreSQL 16 + devnet
  [x] docker-compose.cloudflared.yml   — Cloudflare tunnel env vars
  [ ] docker-compose.git.yml           — Git worktree mount (ONLY valid in worktrees)
  [x] docker-compose.slack.yml          — Slack bot env vars
  [ ] docker-compose.sshd.yml           — SSH server daemon (opt-in, port 2222)
  [ ] docker-compose.claude-host.yml    — Bind-mount host ~/.claude (opt-in, trust tradeoff)
  [ ] (any new overlays found)

Enable/disable any overlays?
```

**Claude host overlay** (opt-in — off by default):

The `claude-host` overlay replaces the `claude-auth` named volume with a
RW bind-mount of the host's `~/.claude` directory. Trades isolation for
convenience — the sandbox inherits host OAuth tokens, memory, MCP config,
and project history; sandbox writes appear live on the host.

Tradeoffs — only enable for trusted workflows:

| Concern | Detail |
|---------|--------|
| Credential blast radius | OAuth tokens in `.credentials.json` are readable by any code running in the sandbox. Do not enable when running untrusted agent code. |
| `projects/` bleed-through | Sessions from other host work (non-harness Claude Code invocations) are visible inside the sandbox. |
| UID≠1000 | `entrypoint.sh` sets `CLAUDE_HOST_BIND_MOUNT=1` via the overlay and skips `chown` on `.claude` so host file ownership is preserved. The existing HOST_UID reconciliation (entrypoint.sh:23-43) handles group-access when UIDs differ. |

Mutually exclusive with the default `claude-auth` named volume at the
same target path (Docker Compose merges by target). When the overlay is
disabled, sandbox `.claude` reverts to the named volume.

**SSH server access** (opt-in — not enabled by default):

The `sshd` overlay runs sshd as the main process and maps port 2222:22.
The entrypoint auto-configures password auth and host keys when this overlay is active.
Password is set from `SANDBOX_PASSWORD` env var (default: `changeme`).

**Git authentication**: the default path is `gh auth setup-git` during onboarding — no SSH keys needed. See `.claude/rules/git.md § Git Authentication` for the full policy.

Only enable `docker-compose.ssh.yml` or `docker-compose.ssh-generate.yml` if the user has explicitly asked for git-over-SSH. They are mutually exclusive and both off by default. If the user does opt in, ensure only one SSH-key overlay is active in `.openharness/config.json`.

### 2c. Build compose file list

```bash
COMPOSE_FILES="-f .devcontainer/docker-compose.yml"

CONFIG=".openharness/config.json"
if [ -f "$CONFIG" ]; then
  for override in $(jq -r '.composeOverrides[]' "$CONFIG" 2>/dev/null); do
    if [ -f "$override" ]; then
      COMPOSE_FILES="$COMPOSE_FILES -f $override"
    fi
  done
fi

echo "Compose files: $COMPOSE_FILES"
```

## 3. Teardown (rebuild only)

**Only if `--rebuild` was passed.** Skip this step on initial provision.

```bash
docker compose --env-file .devcontainer/.env $COMPOSE_FILES down -v 2>&1
```

## 4. Build and Start

```bash
docker compose --env-file .devcontainer/.env $COMPOSE_FILES up -d --build
```

This will:
- Build the Docker image (Node.js 22, agent CLIs, procps)
- Start the sandbox container (+ PostgreSQL if postgres overlay enabled)
- `entrypoint.sh` runs as root: starts cron, syncs heartbeats
- `startup.sh` runs as sandbox: pnpm install, starts Next.js dev server + cloudflared tunnel, health-checks port 3000

## 4b. Create startup.sh (if missing)

`workspace/startup.sh` is gitignored (runtime config). If it doesn't exist, create it:

```bash
if [ ! -f workspace/startup.sh ]; then
  # Create startup.sh that:
  # 1. cd to workspace/projects/next-app
  # 2. pnpm install (no --frozen-lockfile on first boot)
  # 3. Start Next.js dev server in background
  # 4. Start cloudflared tunnel (if configured)
  # 5. Wait for port 3000
  # 6. Print "Startup complete"
fi
```

**Important**: `workspace/projects/next-app/pnpm-workspace.yaml` (with `packages: []`) must exist
to prevent pnpm from walking up to the monorepo root. This file IS tracked in git.

## 5. Wait for Startup

Poll logs until `startup.sh` reports completion (up to 3 minutes):

```bash
for i in $(seq 1 36); do
  if docker logs "$SANDBOX_NAME" 2>&1 | grep -q "Startup complete"; then
    echo "Startup complete"
    break
  fi
  if [ "$i" -eq 36 ]; then
    echo "WARNING: Startup did not complete within 3 minutes"
    docker logs "$SANDBOX_NAME" 2>&1 | grep '\[startup\]\|\[entrypoint\]' | tail -10
  fi
  sleep 5
done
```

## 6. Validate

### 6a. Container Health

```bash
docker ps --filter "name=$SANDBOX_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

The `$SANDBOX_NAME` container should be running. If postgres overlay is enabled, `$SANDBOX_NAME-postgres` should also be running.

### 6b. Run test:setup

This runs 5 TypeScript tests (vitest) that validate the stack:

```bash
docker exec -u sandbox "$SANDBOX_NAME" bash -c 'cd ~/harness/workspace/projects/next-app && pnpm run test:setup'
```

**All 5 tests must pass:**

| Test | What it checks |
|------|----------------|
| Node.js >= 22 | Correct runtime |
| node_modules installed | pnpm install ran |
| pnpm-lock.yaml in sync | Dependencies consistent |
| Next.js port 3000 | Dev server responding |
| Public URL responds | Cloudflare tunnel + site live |

### 6c. If tests fail

Check logs and remediate:
- `/tmp/next-dev.log` — Next.js dev server
- `/tmp/cloudflared.log` — Cloudflare tunnel
- `docker logs $SANDBOX_NAME` — entrypoint + startup

Re-run `pnpm run test:setup` after fixing. Do not loop more than once.

## 7. Retrieve SSH public key (advanced — only if `ssh-generate` is enabled)

**Default**: git auth is handled by `gh auth setup-git` during onboarding (see `.claude/rules/git.md § Git Authentication`). Skip this step unless the user explicitly opted into the `ssh-generate` overlay.

If `ssh-generate` IS enabled in `.openharness/config.json`, the sandbox generated an ED25519 keypair on first boot. Read the public key so the user can add it to GitHub / GitLab:

```bash
docker exec -u sandbox "$SANDBOX_NAME" cat ~/.ssh/id_ed25519.pub 2>/dev/null || echo "(no SSH keypair — using gh auth for git)"
```

If no keypair exists, skip this step — git auth via `gh auth setup-git` is the default.

## 8. Report

```
Sandbox 'orchestrator' is ready!

  Branch:  agent/orchestrator
  Docs:    https://ryaneggz.github.io/open-harness/
  Tests:   8/8 passed

  Finish setup (one-time, inside the sandbox):
    openharness shell orchestrator
    gh auth login                           # authenticate GitHub CLI
    gh auth setup-git                       # configure git auth (no SSH keys needed)
    claude                                  # authenticate Claude Code (OAuth)

  CLI (openharness):
    openharness list                            # list running sandboxes
    openharness shell orchestrator      # enter sandbox shell
    openharness stop                            # stop container
    openharness run                             # start/restart container
    openharness clean                           # full teardown (containers + volumes)
    openharness onboard orchestrator    # one-time auth setup
    openharness heartbeat sync orchestrator   # install heartbeat crons
    openharness heartbeat status orchestrator # check heartbeat logs

  Validate:
    /repair                 # repair and verify the stack anytime

  Manage:
    /provision --rebuild    # full teardown + rebuild
```
