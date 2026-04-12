---
name: repair
description: |
  Repair the sandbox stack: detect environment (container vs host),
  run test:setup, auto-remediate failures, and re-verify.
  Works both inside the container (direct) and from the host (via docker exec).
  TRIGGER when: after container restart, after rebuild, when something seems
  broken, when asked to check setup, repair, diagnose issues, or verify the stack.
---

# Repair

Validate and fix the full harness stack. Detects whether running inside the container
or on the host and uses the appropriate execution path.

## Instructions

### Step 0 — Detect environment

```bash
if [ -f /.dockerenv ]; then
  echo "ENVIRONMENT=container"
else
  echo "ENVIRONMENT=host"
fi
```

If `ENVIRONMENT=container`, follow the **Container Path** (Steps 1c–4c).
If `ENVIRONMENT=host`, follow the **Host Path** (Steps 1h–4h).

---

## Container Path (inside the sandbox)

### Step 1c — Run test:setup directly

```bash
cd ~/harness/workspace/projects/next-app && pnpm run test:setup
```

Capture the output. If all 5 tests pass, skip to **Step 5**.

### Step 2c — Remediate failures

For each failing test, apply the matching fix **in this order** (order matters — dependencies first):

| Failing test | Fix |
|---|---|
| `has Node.js >= 22` | Wrong runtime. Cannot auto-fix — report to user. |
| `has node_modules installed` or `pnpm-lock.yaml in sync` | `cd ~/harness/workspace/projects/next-app && pnpm install` |
| `responds on port 3000` (Next.js) | Check log: `tail -20 /tmp/next-dev.log`. Then restart: `cd ~/harness/workspace/projects/next-app && nohup pnpm run dev > /tmp/next-dev.log 2>&1 &`. Wait 15s. |
| `public URL responds` (Cloudflare) | Check log: `tail -20 /tmp/cloudflared.log`. Then restart tunnel from config. Wait 5s. |

### Step 3c — Re-run tests

```bash
cd ~/harness/workspace/projects/next-app && pnpm run test:setup
```

### Step 4c — If still failing

If the same test fails twice after remediation, **stop and report** — do not loop.
Include the relevant log output in your report.

---

## Host Path (outside the container)

### Step 1h — Resolve sandbox name and check containers

```bash
bash .devcontainer/init-env.sh
source .devcontainer/.env
```

Verify containers are running:

```bash
docker ps --filter "name=$SANDBOX_NAME" --format "{{.Names}}\t{{.Status}}"
```

If `$SANDBOX_NAME` is not running, auto-start:

```bash
COMPOSE_FILES="-f .devcontainer/docker-compose.yml"
CONFIG=".openharness/config.json"
if [ -f "$CONFIG" ]; then
  for override in $(jq -r '.composeOverrides[]' "$CONFIG" 2>/dev/null); do
    [ -f "$override" ] && COMPOSE_FILES="$COMPOSE_FILES -f $override"
  done
fi

docker compose --env-file .devcontainer/.env $COMPOSE_FILES up -d
```

Wait for startup (poll for "Startup complete" in logs, up to 3 minutes).

### Step 2h — Run test:setup via docker exec

```bash
docker exec -u sandbox $SANDBOX_NAME bash -c 'cd ~/harness/workspace/projects/next-app && pnpm run test:setup'
```

Capture the output. If all 5 tests pass, skip to **Step 5**.

### Step 3h — Remediate failures

For each failing test, apply the matching fix **in this order**:

| Failing test | Fix |
|---|---|
| `has Node.js >= 22` | Wrong container image. Cannot auto-fix — report to user. |
| `has node_modules installed` or `pnpm-lock.yaml in sync` | `docker exec -u sandbox $SANDBOX_NAME bash -c 'cd ~/harness/workspace/projects/next-app && pnpm install'` |
| `responds on port 3000` (Next.js) | Check log: `docker exec $SANDBOX_NAME bash -c 'tail -20 /tmp/next-dev.log'`. Then restart: `docker exec -u sandbox $SANDBOX_NAME bash -c 'cd ~/harness/workspace/projects/next-app && nohup pnpm run dev > /tmp/next-dev.log 2>&1 &'`. Wait 15s. |
| `public URL responds` (Cloudflare) | Check log: `docker exec $SANDBOX_NAME bash -c 'tail -20 /tmp/cloudflared.log'`. Then restart tunnel from config. Wait 5s. |

### Step 4h — Re-run tests and handle persistent failures

```bash
docker exec -u sandbox $SANDBOX_NAME bash -c 'cd ~/harness/workspace/projects/next-app && pnpm run test:setup'
```

If the same test fails twice after remediation, **stop and report** — do not loop.

---

## Step 5 — Report (both paths)

Output a summary table:

```
| Check              | Status | Action              |
|--------------------|--------|---------------------|
| Node.js >= 22      | OK     | —                   |
| node_modules       | FIXED  | Ran pnpm install     |
| Next.js dev server | OK     | —                   |
| Public URL         | OK     | —                   |
```

Status values: **OK** (passed first run), **FIXED** (failed then remediated), **FAIL** (could not fix).

## Step 6 — Verify with agent-browser

As a final check, open the public URL with agent-browser and take a screenshot:

```bash
agent-browser open "https://next-postgres-shadcn.ruska.dev"
agent-browser screenshot .claude/screenshots/repair-dod.png
agent-browser close
```

If the screenshot shows the app, the stack is fully operational.
