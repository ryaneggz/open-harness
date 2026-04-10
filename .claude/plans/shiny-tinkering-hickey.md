# Plan: Mount Docker Socket + Prompt for Overlays on Provision

## Context
The Docker socket isn't mounted because `docker-compose.docker.yml` is missing from `.openharness/config.json`. The provision skill should also prompt the user about which overlays to enable so this doesn't happen silently.

## Changes

### 1. Add docker overlay to config
**File:** `.openharness/config.json`

Add `".devcontainer/docker-compose.docker.yml"` to `composeOverrides` array.

### 2. Recreate sandbox to pick up the socket mount
```bash
bash .devcontainer/init-env.sh
docker compose --env-file .devcontainer/.env \
  -f .devcontainer/docker-compose.yml \
  -f .devcontainer/docker-compose.postgres.yml \
  -f .devcontainer/docker-compose.cloudflared.yml \
  -f .devcontainer/docker-compose.docker.yml \
  up -d
```

### 3. Update provision skill to prompt for overlays
**File:** `.claude/skills/provision/SKILL.md`

Before detecting overlays, add a step that:
- Lists all available `docker-compose.*.yml` files in `.devcontainer/`
- Shows which are currently enabled in `config.json`
- Asks the user if they want to enable/disable any before proceeding
- Updates `config.json` accordingly

### 4. Save feedback memory
Record that the user expects overlay selection prompting during provision.

## Verification
- `docker exec next-postgres-shadcn docker ps` works inside the container
- Provision skill includes overlay prompt step
