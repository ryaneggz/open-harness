---
name: provision
description: |
  Provision or rebuild the next-postgres-shadcn sandbox.
  Reads .openharness/config.json for compose overlays, builds the image,
  starts all services, waits for startup, and runs test:setup to validate.
  TRIGGER when: provisioning, rebuilding, or when asked to set up the sandbox.
argument-hint: "[--rebuild]"
---

# Provision Sandbox

Provision (or rebuild) the next-postgres-shadcn sandbox. One skill, zero manual steps.

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

Present a checklist to the user **before proceeding**:

```
Available compose overlays:
  [x] docker-compose.postgres.yml    — PostgreSQL 16 + devnet
  [x] docker-compose.cloudflared.yml — Cloudflare tunnel env vars
  [x] docker-compose.docker.yml      — Docker socket mount (DinD)
  [ ] (any new overlays found)

Enable/disable any overlays?
```

If the user changes selections, update `.openharness/config.json` accordingly.

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
- Start PostgreSQL 16 (waits for healthcheck)
- Start the sandbox container
- `entrypoint.sh` runs as root: starts cron, syncs heartbeats
- `startup.sh` runs as sandbox: npm install, prisma generate, prisma migrate deploy, starts Next.js dev server + cloudflared tunnel, health-checks port 3000

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

Both `$SANDBOX_NAME` and `$SANDBOX_NAME-postgres` should be running.

### 6b. Run test:setup

This runs 8 TypeScript tests (vitest) that validate the full stack:

```bash
docker exec -u sandbox "$SANDBOX_NAME" bash -c 'cd ~/harness/workspace/projects/next-app && npm run test:setup'
```

**All 8 tests must pass:**

| Test | What it checks |
|------|----------------|
| DATABASE_URL set | Compose env var injected |
| Node.js >= 22 | Correct runtime |
| node_modules installed | npm install ran |
| package-lock.json in sync | Dependencies consistent |
| Prisma client generated | `src/generated/prisma/` exists |
| PostgreSQL TCP | Database reachable on devnet |
| Next.js port 3000 | Dev server responding |
| Public URL responds | Cloudflare tunnel + site live |

### 6c. If tests fail

Check logs and remediate:
- `/tmp/next-dev.log` — Next.js dev server
- `/tmp/cloudflared.log` — Cloudflare tunnel
- `docker logs $SANDBOX_NAME` — entrypoint + startup

Re-run `npm run test:setup` after fixing. Do not loop more than once.

## 7. Retrieve SSH public key

The sandbox generates an ED25519 keypair on first boot (persisted in the `ssh-keys` volume).
Read the public key so the user can add it to GitHub / GitLab:

```bash
docker exec -u sandbox "$SANDBOX_NAME" cat ~/.ssh/id_ed25519.pub
```

Save this value for the report.

## 8. Report

Include the SSH public key so the user can paste it directly into their git platform:

```
Sandbox 'next-postgres-shadcn' is ready!

  Branch:  agent/next-postgres-shadcn
  URL:     https://next-postgres-shadcn.ruska.dev
  Tests:   8/8 passed

  SSH public key (add to GitHub → Settings → SSH keys):
    <paste id_ed25519.pub contents here>

  Finish setup (one-time, inside the sandbox):
    openharness shell next-postgres-shadcn
    gh auth login                           # authenticate GitHub CLI
    claude                                  # authenticate Claude Code (OAuth)

  CLI (openharness):
    openharness list                            # list running sandboxes
    openharness shell next-postgres-shadcn      # enter sandbox shell
    openharness stop next-postgres-shadcn       # stop container
    openharness run next-postgres-shadcn        # start/restart container
    openharness clean next-postgres-shadcn      # full teardown
    openharness quickstart next-postgres-shadcn # one-shot provision
    openharness heartbeat sync next-postgres-shadcn   # install heartbeat crons
    openharness heartbeat status next-postgres-shadcn # check heartbeat logs

  Validate:
    /diagnose               # diagnose and fix issues anytime

  Manage:
    /provision --rebuild    # full teardown + rebuild
```
