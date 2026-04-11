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
cd ~/harness/workspace/projects/next-app && npm run test:setup
```

Capture the output. If all 8 tests pass, skip to **Step 5**.

### Step 2c — Remediate failures

For each failing test, apply the matching fix **in this order** (order matters — dependencies first):

| Failing test | Fix |
|---|---|
| `has DATABASE_URL set` | Environment misconfigured. Cannot auto-fix — report to user. |
| `has Node.js >= 22` | Wrong runtime. Cannot auto-fix — report to user. |
| `has node_modules installed` or `package-lock.json in sync` | `cd ~/harness/workspace/projects/next-app && npm install` |
| `has Prisma client generated` | `cd ~/harness/workspace/projects/next-app && npx prisma generate` |
| `can connect via TCP` (PostgreSQL) | Check: `echo > /dev/tcp/${PGHOST:-postgres}/5432`. If unreachable, report to user. |
| `responds on port 3000` (Next.js) | Check log: `tail -20 /tmp/next-dev.log`. Then restart: `cd ~/harness/workspace/projects/next-app && nohup npm run dev > /tmp/next-dev.log 2>&1 &`. Wait 15s. |
| `public URL responds` (Cloudflare) | Check log: `tail -20 /tmp/cloudflared.log`. Then restart: `TUNNEL_TOKEN=$(grep 'TUNNEL_TOKEN=' ~/harness/workspace/startup.sh \| head -1 \| cut -d'"' -f2); kill $(pidof cloudflared) 2>/dev/null; sleep 1; nohup cloudflared tunnel --url http://localhost:3000 run --token "$TUNNEL_TOKEN" > /tmp/cloudflared.log 2>&1 &`. Wait 5s. |

### Step 3c — Re-run tests

```bash
cd ~/harness/workspace/projects/next-app && npm run test:setup
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
docker exec -u sandbox $SANDBOX_NAME bash -c 'cd ~/harness/workspace/projects/next-app && npm run test:setup'
```

Capture the output. If all 8 tests pass, skip to **Step 5**.

### Step 3h — Remediate failures

For each failing test, apply the matching fix **in this order**:

| Failing test | Fix |
|---|---|
| `has DATABASE_URL set` | Container missing compose overlay. Cannot auto-fix — report to user. |
| `has Node.js >= 22` | Wrong container image. Cannot auto-fix — report to user. |
| `has node_modules installed` or `package-lock.json in sync` | `docker exec -u sandbox $SANDBOX_NAME bash -c 'cd ~/harness/workspace/projects/next-app && npm install'` |
| `has Prisma client generated` | `docker exec -u sandbox $SANDBOX_NAME bash -c 'cd ~/harness/workspace/projects/next-app && npx prisma generate'` |
| `can connect via TCP` (PostgreSQL) | Check: `docker ps --filter name=$SANDBOX_NAME-postgres`. If down, report to user. |
| `responds on port 3000` (Next.js) | Check log: `docker exec $SANDBOX_NAME bash -c 'tail -20 /tmp/next-dev.log'`. Then restart: `docker exec -u sandbox $SANDBOX_NAME bash -c 'cd ~/harness/workspace/projects/next-app && nohup npm run dev > /tmp/next-dev.log 2>&1 &'`. Wait 15s. |
| `public URL responds` (Cloudflare) | Check log: `docker exec $SANDBOX_NAME bash -c 'tail -20 /tmp/cloudflared.log'`. Then restart: `docker exec -u sandbox $SANDBOX_NAME bash -c 'TUNNEL_TOKEN=$(grep "TUNNEL_TOKEN=" ~/harness/workspace/startup.sh \| head -1 \| cut -d"\"" -f2); kill $(pidof cloudflared) 2>/dev/null; sleep 1; nohup cloudflared tunnel --url http://localhost:3000 run --token "$TUNNEL_TOKEN" > /tmp/cloudflared.log 2>&1 &'`. Wait 5s. |

### Step 4h — Re-run tests and handle persistent failures

```bash
docker exec -u sandbox $SANDBOX_NAME bash -c 'cd ~/harness/workspace/projects/next-app && npm run test:setup'
```

If the same test fails twice after remediation, **stop and report** — do not loop.

---

## Step 5 — Report (both paths)

Output a summary table:

```
| Check              | Status | Action              |
|--------------------|--------|---------------------|
| DATABASE_URL       | OK     | —                   |
| Node.js >= 22      | OK     | —                   |
| node_modules       | FIXED  | Ran npm install     |
| Prisma client      | OK     | —                   |
| PostgreSQL         | OK     | —                   |
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
