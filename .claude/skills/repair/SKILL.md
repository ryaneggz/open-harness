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

## Step 6 — Front-to-back URL check (every run)

Verify every tunnel-exposed hostname end-to-end — public URL first, local origin second — so failures are attributed to the right layer.

### 6a — Enumerate targets from cloudflared config

Parse each `~/.cloudflared/config-*.yml` to discover `hostname → service` pairs. On the host, prefix with `docker exec -u sandbox $SANDBOX_NAME`.

```bash
python3 - <<'PY'
import glob, re, os
pairs = []
for path in sorted(glob.glob(os.path.expanduser("~/.cloudflared/config-*.yml"))):
    host = None
    for line in open(path):
        m = re.match(r"\s*-\s*hostname:\s*(\S+)", line)
        if m: host = m.group(1); continue
        m = re.match(r"\s*service:\s*(https?://\S+)", line)
        if m and host: pairs.append((host, m.group(1))); host = None
with open("/tmp/tunnel-targets.tsv", "w") as f:
    for h, s in pairs:
        f.write(f"{h}\t{s}\n")
        print(f"{h}\t{s}")
PY
```

### 6b — Front check with `/agent-browser` (primary)

For every hostname in `/tmp/tunnel-targets.tsv`, invoke the **`/agent-browser`** skill on the public URL — this exercises the real user path (DNS → Cloudflare edge → tunnel → origin → render) and saves a screenshot per host:

```
/agent-browser https://<hostname>/
```

Record pass/fail per hostname based on whether the skill reports a healthy page load (non-empty snapshot, HTTP-equivalent success). The skill itself handles DNS, health-check, and screenshot — do not reimplement.

### 6c — Back check with curl (only when browser check fails)

For any hostname that failed in 6b, run a curl pair to localize the fault:

| Public | Local | Diagnosis |
|---|---|---|
| 2xx/3xx | 2xx/3xx | **Browser-only issue** (DNS/cert/JS) — inspect `/agent-browser` trace |
| 5xx/000 | 2xx/3xx | **Tunnel problem** — restart cloudflared |
| any     | 5xx/000 | **Origin problem** — check dev-server log, restart service |

```bash
# container: run directly.  host: wrap with docker exec -u sandbox $SANDBOX_NAME bash -c '...'
while IFS=$'\t' read -r host service; do
  pub=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "https://${host}/")
  loc=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5  "${service/0.0.0.0/127.0.0.1}/")
  echo "$host  public=$pub  local=$loc"
done < /tmp/tunnel-targets.tsv
```

### 6d — Report

Append a front-to-back table to the Step 5 summary — one row per hostname:

```
| Hostname                   | Browser | Public | Local | Verdict        |
|----------------------------|---------|--------|-------|----------------|
| app.\<your-domain\>        | OK      | —      | —     | OK             |
| docs.\<your-domain\>       | FAIL    | 502    | 307   | Tunnel problem |
```

`Browser` comes from 6b, `Public`/`Local` only filled in when 6b failed and 6c ran. If any row is not **OK**, apply the matching remediation from the Step 2c/3h tables and re-run 6b once. If it still fails, stop and report — do not loop.

Screenshots from `/agent-browser` land in `.claude/screenshots/<hostname>*.png` for visual confirmation.
