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
- cloudflared, docker, slack, claude-host, codex-host, pi-host

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
  [x] docker-compose.claude-host.yml    — Bind-mount host ~/.claude (default, trust tradeoff)
  [x] docker-compose.codex-host.yml     — Bind-mount host ~/.codex (default, OAuth-first, trust tradeoff)
  [x] docker-compose.pi-host.yml        — Bind-mount host ~/.pi (default, OAuth-first, trust tradeoff)
  [ ] (any new overlays found)

Enable/disable any overlays?
```

**Claude host overlay** (opt-in — off by default):

The `claude-host` overlay replaces the `claude-auth` named volume with
RW bind-mounts of the host's `~/.claude` directory AND `~/.claude.json`
file. Trades isolation for convenience — the sandbox inherits host
OAuth tokens, memory, MCP config, project history, theme, and
onboarding state (no text-style reselection); sandbox writes appear
live on the host.

Tradeoffs — only enable for trusted workflows:

| Concern | Detail |
|---------|--------|
| Credential blast radius | OAuth tokens in `.credentials.json` are readable by any code running in the sandbox. Do not enable when running untrusted agent code. |
| `projects/` bleed-through | Sessions from other host work (non-harness Claude Code invocations) are visible inside the sandbox. |
| `.claude.json` bleed-through | Per-project `hasTrustDialogAccepted`, full MCP server list, and tip counters from non-harness host work are visible inside the sandbox. |
| Host UID must be 1000 | `.credentials.json` is mode 0600 (owner-only). The entrypoint skips `chown` on `.claude` to preserve host ownership, but if host UID ≠ sandbox UID (1000), the sandbox user cannot read credentials and `claude` will prompt for auth. Check with `id -u` before enabling. |
| Host paths must pre-exist | If `$HOST_CLAUDE_DIR` or `$HOST_CLAUDE_JSON` does not exist on the host, Docker auto-creates it as a **directory** owned by root — `claude` will then fail to parse the JSON or read credentials. Verify with `test -d ~/.claude && test -f ~/.claude.json` before first boot. |

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

### 6b. Sanity check

Confirm the sandbox container is up and the agent CLIs are reachable:

```bash
docker exec -u sandbox "$SANDBOX_NAME" bash -c 'node --version && claude --version 2>/dev/null || true'
```

### 6c. If something is wrong

Check logs:
- `docker logs $SANDBOX_NAME` — entrypoint + startup
- `/tmp/cloudflared.log` — Cloudflare tunnel (if enabled)

Use `/repair` to diagnose and remediate from inside the container.

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
  Docs:    docs/README.md
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
