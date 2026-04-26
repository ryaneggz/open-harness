---
name: repair
description: |
  Repair the sandbox stack: detect environment (container vs host),
  run a sandbox-level health check, auto-remediate failures, and re-verify.
  Works both inside the container (direct) and from the host (via docker exec).
  TRIGGER when: after container restart, after rebuild, when something seems
  broken, when asked to check setup, repair, diagnose issues, or verify the stack.
---

# Repair

Validate and fix the harness sandbox stack. Detects whether running inside the
container or on the host and uses the appropriate execution path.

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

### Step 1c — Run sandbox health check

```bash
node --version
command -v claude && claude --version 2>/dev/null || echo 'CLAUDE_MISSING'
command -v codex && codex --version 2>/dev/null || echo 'CODEX_MISSING'
command -v pi && pi --version 2>/dev/null || echo 'PI_MISSING'
docker ps >/dev/null 2>&1 && echo 'DOCKER_OK' || echo 'DOCKER_UNAVAILABLE'
```

If all checks pass (Node ≥ 22, agent CLIs reachable, docker socket
accessible when expected), skip to **Step 5**.

### Step 2c — Remediate failures

| Failing check | Fix |
|---|---|
| `Node.js >= 22` | Wrong runtime. Cannot auto-fix — report to user (rebuild image). |
| `claude --version` fails | `sudo npm install -g @anthropic-ai/claude-code` (pin matches Dockerfile) |
| `codex --version` fails | `sudo npm install -g @openai/codex` |
| `pi --version` fails | `sudo npm install -g pi-agent-extension` (or check Dockerfile pin) |
| `docker ps` fails | Docker socket not mounted — verify compose overlay `docker-compose.docker.yml` is enabled in `.openharness/config.json` |

### Step 3c — Re-run health check

Repeat Step 1c. If the same check fails twice after remediation, **stop and
report** — do not loop. Include relevant log output.

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

### Step 2h — Run sandbox health check via docker exec

```bash
docker exec -u sandbox $SANDBOX_NAME bash -c '
  node --version &&
  (claude --version 2>/dev/null || echo CLAUDE_MISSING) &&
  (docker ps >/dev/null 2>&1 && echo DOCKER_OK || echo DOCKER_UNAVAILABLE)
'
```

If all checks pass, skip to **Step 5**.

### Step 3h — Remediate failures

| Failing check | Fix |
|---|---|
| Container not running | `docker compose ... up -d` (Step 1h above) |
| `Node.js >= 22` | Wrong image. Rebuild via `/provision --rebuild`. |
| Agent CLI missing | `docker exec -u sandbox $SANDBOX_NAME sudo npm install -g <pkg>` (see container-path table) |
| Docker socket fails | Verify `docker-compose.docker.yml` is in `.openharness/config.json`; rebuild |

### Step 4h — Re-run health check and handle persistent failures

Repeat Step 2h. If the same check fails twice after remediation, **stop and
report** — do not loop.

---

## Step 5 — Report (both paths)

Output a summary table:

```
| Check              | Status | Action              |
|--------------------|--------|---------------------|
| Node.js >= 22      | OK     | —                   |
| Claude CLI         | FIXED  | Reinstalled         |
| Docker socket      | OK     | —                   |
```

Status values: **OK** (passed first run), **FIXED** (failed then remediated), **FAIL** (could not fix).

## Step 6 — Front-to-back URL check (only when tunnels are configured)

If the sandbox exposes any tunneled hostnames (cloudflared or Caddy gateway),
verify them end-to-end so failures are attributed to the right layer.

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

If `/tmp/tunnel-targets.tsv` is empty, **skip the rest of Step 6** and go to the final report.

### 6b — Front check with `/agent-browser` (primary)

For every hostname in `/tmp/tunnel-targets.tsv`, invoke the **`/agent-browser`** skill on the public URL — this exercises the real user path (DNS → Cloudflare edge → tunnel → origin → render) and saves a screenshot per host:

```
/agent-browser https://<hostname>/
```

Record pass/fail per hostname based on whether the skill reports a healthy page load.

### 6c — Back check with curl (only when browser check fails)

For any hostname that failed in 6b, run a curl pair to localize the fault:

| Public | Local | Diagnosis |
|---|---|---|
| 2xx/3xx | 2xx/3xx | **Browser-only issue** (DNS/cert/JS) — inspect `/agent-browser` trace |
| 5xx/000 | 2xx/3xx | **Tunnel problem** — restart cloudflared |
| any     | 5xx/000 | **Origin problem** — check the app's tmux session log, restart service |

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

If any row is not **OK**, apply the matching remediation and re-run 6b once. If it still fails, stop and report — do not loop.

Screenshots from `/agent-browser` land in `.claude/screenshots/<hostname>*.png` for visual confirmation.
