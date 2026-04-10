---
name: destroy
description: |
  Tear down the next-postgres-shadcn sandbox: stop containers, remove volumes,
  and optionally prune the Docker image. Reads .openharness/config.json for
  compose overlays so all services are cleaned up.
  TRIGGER when: asked to tear down, destroy, clean up, stop, or remove the sandbox.
argument-hint: "[--volumes] [--image]"
---

# Destroy

Tear down the sandbox. Confirmation required before executing.

## Instructions

### Step 1 — Resolve flags

Arguments received: `$ARGUMENTS`

- **VOLUMES**: `true` if `--volumes` flag is present (default: `true` — remove pgdata, cloudflared, etc.)
- **IMAGE**: `true` if `--image` flag is present (default: `false` — keep the built image for faster rebuild)

### Step 2 — Detect compose overlays

```bash
# Resolve SANDBOX_NAME from git remote or folder name
bash .devcontainer/init-env.sh
source .devcontainer/.env

COMPOSE_FILES="-f .devcontainer/docker-compose.yml"

CONFIG=".openharness/config.json"
if [ -f "$CONFIG" ]; then
  for override in $(jq -r '.composeOverrides[]' "$CONFIG" 2>/dev/null); do
    if [ -f "$override" ]; then
      COMPOSE_FILES="$COMPOSE_FILES -f $override"
    fi
  done
fi
```

Use `$SANDBOX_NAME` (resolved above) in all subsequent `docker` commands.

### Step 3 — Confirm with user

**Before executing**, show what will be destroyed and ask for confirmation:

```
This will destroy:
  - Containers: $SANDBOX_NAME, $SANDBOX_NAME-postgres
  - Volumes:    pgdata, cloudflared, gh-config, ssh-keys  (if --volumes)
  - Image:      $SANDBOX_NAME-sandbox                     (if --image)

Proceed? [y/N]
```

Do NOT proceed without explicit user confirmation.

### Step 4 — Tear down

```bash
# Stop and remove containers (+ volumes if flagged)
if [ "$VOLUMES" = true ]; then
  docker compose --env-file .devcontainer/.env $COMPOSE_FILES down -v
else
  docker compose --env-file .devcontainer/.env $COMPOSE_FILES down
fi
```

### Step 5 — Remove image (if flagged)

```bash
if [ "$IMAGE" = true ]; then
  docker rmi "${SANDBOX_NAME}-sandbox" 2>/dev/null || true
fi
```

### Step 6 — Verify

```bash
# No containers remain
docker ps -a --filter "name=$SANDBOX_NAME" --format "{{.Names}}" | grep . && echo "WARNING: containers still exist" || echo "Containers: clean"

# No volumes remain (if --volumes)
docker volume ls --filter "name=${SANDBOX_NAME}_" --format "{{.Name}}" | grep . && echo "WARNING: volumes still exist" || echo "Volumes: clean"
```

### Step 7 — Report

```
Sandbox '$SANDBOX_NAME' destroyed.

  Containers: removed
  Volumes:    removed / kept
  Image:      removed / kept

  To rebuild:
    /provision
```
