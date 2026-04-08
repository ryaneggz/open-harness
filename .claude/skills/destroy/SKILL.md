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
COMPOSE_FILES="-f docker/docker-compose.yml"

CONFIG=".openharness/config.json"
if [ -f "$CONFIG" ]; then
  for override in $(jq -r '.composeOverrides[]' "$CONFIG" 2>/dev/null); do
    if [ -f "$override" ]; then
      COMPOSE_FILES="$COMPOSE_FILES -f $override"
    fi
  done
fi
```

### Step 3 — Confirm with user

**Before executing**, show what will be destroyed and ask for confirmation:

```
This will destroy:
  - Containers: next-postgres-shadcn, next-postgres-shadcn-postgres
  - Volumes:    pgdata, cloudflared, gh-config, ssh-keys  (if --volumes)
  - Image:      docker-sandbox                            (if --image)

Proceed? [y/N]
```

Do NOT proceed without explicit user confirmation.

### Step 4 — Tear down

```bash
# Stop and remove containers (+ volumes if flagged)
if [ "$VOLUMES" = true ]; then
  NAME=next-postgres-shadcn docker compose $COMPOSE_FILES down -v
else
  NAME=next-postgres-shadcn docker compose $COMPOSE_FILES down
fi
```

### Step 5 — Remove image (if flagged)

```bash
if [ "$IMAGE" = true ]; then
  docker rmi docker-sandbox 2>/dev/null || true
fi
```

### Step 6 — Verify

```bash
# No containers remain
docker ps -a --filter "name=next-postgres-shadcn" --format "{{.Names}}" | grep . && echo "WARNING: containers still exist" || echo "Containers: clean"

# No volumes remain (if --volumes)
docker volume ls --filter "name=docker_" --format "{{.Name}}" | grep . && echo "WARNING: volumes still exist" || echo "Volumes: clean"
```

### Step 7 — Report

```
Sandbox 'next-postgres-shadcn' destroyed.

  Containers: removed
  Volumes:    removed / kept
  Image:      removed / kept

  To rebuild:
    /provision
```
