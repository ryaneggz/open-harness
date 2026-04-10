---
name: diagnose
description: |
  Diagnose and fix the full sandbox stack: container, dependencies, Prisma,
  PostgreSQL, Next.js dev server, cloudflared tunnel, and public URL.
  Runs TypeScript tests via docker exec, then auto-remediates failures and re-verifies.
  TRIGGER when: after container restart, after rebuild, when something seems
  broken, when asked to check setup, diagnose issues, or verify the stack.
---

# Diagnose

Validate that the full harness stack is healthy from the host. Runs `npm run test:setup` (vitest)
inside the container, then auto-remediates any failures and re-runs until green.

## Instructions

### Step 0 — Resolve sandbox name

```bash
bash .devcontainer/init-env.sh
source .devcontainer/.env
```

Use `$SANDBOX_NAME` in all subsequent `docker` commands.

### Step 1 — Run the diagnose tests

```bash
docker exec -u sandbox $SANDBOX_NAME bash -c 'cd ~/harness/workspace/projects/next-app && npm run test:setup'
```

Capture the output. If all 8 tests pass, skip to **Step 5**.

### Step 2 — Remediate failures

For each failing test, apply the matching fix **in this order** (order matters — dependencies first):

| Failing test | Fix |
|---|---|
| `has DATABASE_URL set` | Container missing compose overlay. Cannot auto-fix — report to user. |
| `has Node.js >= 22` | Wrong container image. Cannot auto-fix — report to user. |
| `has node_modules installed` or `package-lock.json in sync` | `docker exec -u sandbox $SANDBOX_NAME bash -c 'cd ~/harness/workspace/projects/next-app && npm install'` |
| `has Prisma client generated` | `docker exec -u sandbox $SANDBOX_NAME bash -c 'cd ~/harness/workspace/projects/next-app && npx prisma generate'` |
| `can connect via TCP` (PostgreSQL) | Check: `docker ps --filter name=$SANDBOX_NAME-postgres`. If down, report to user. |
| `responds on port 3000` (Next.js) | Check log: `docker exec $SANDBOX_NAME bash -c 'tail -20 /tmp/next-dev.log'`. Then restart: `docker exec -u sandbox $SANDBOX_NAME bash -c 'cd ~/harness/workspace/projects/next-app && nohup npm run dev > /tmp/next-dev.log 2>&1 &'`. Wait 15s. |
| `public URL responds` (Cloudflare) | Check log: `docker exec $SANDBOX_NAME bash -c 'tail -20 /tmp/cloudflared.log'`. Then restart: `docker exec -u sandbox $SANDBOX_NAME bash -c 'TUNNEL_TOKEN=$(grep TUNNEL_TOKEN ~/harness/workspace/startup.sh \| head -1 \| cut -d"\"" -f2); kill $(pidof cloudflared) 2>/dev/null; sleep 1; nohup cloudflared tunnel --url http://localhost:3000 run --token "$TUNNEL_TOKEN" > /tmp/cloudflared.log 2>&1 &'`. Wait 5s. If cloudflared not installed, report to user. |

### Step 3 — Re-run tests

```bash
docker exec -u sandbox $SANDBOX_NAME bash -c 'cd ~/harness/workspace/projects/next-app && npm run test:setup'
```

### Step 4 — If still failing

If the same test fails twice after remediation, **stop and report** — don't loop.
Include the relevant log output in your report.

### Step 5 — Report

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
