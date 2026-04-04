# Fix Claude CLI Auth in Dev Container

## Context
When using VS Code "Reopen in Container", Claude CLI can't authenticate because:
1. `~/.claude/` (auth tokens) lives in ephemeral container filesystem — lost on rebuild
2. OAuth callback port isn't forwarded, so re-auth can't complete either

When "attaching" to a running container it works because the container persists and auth tokens survive in memory.

## Plan

### 1. Mount host `~/.claude` into the container
**File:** `.devcontainer/docker-compose.yml`

Add a volume mount so auth tokens persist across container rebuilds:
```yaml
volumes:
  - ..:/home/orchestrator/project
  - /var/run/docker.sock:/var/run/docker.sock
  - ~/.claude:/home/orchestrator/.claude    # <-- add this
```

### 2. Set bypass permissions as the default
**File:** `.devcontainer/docker-compose.yml`

Add environment variable:
```yaml
environment:
  - CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS=true
```

### 3. Ensure correct ownership in entrypoint
**File:** `.devcontainer/entrypoint.sh`

Add a `chown` for the mounted `.claude` directory so the `orchestrator` user can read/write auth tokens:
```bash
if [ -d /home/orchestrator/.claude ]; then
  chown -R orchestrator:orchestrator /home/orchestrator/.claude 2>/dev/null || true
fi
```

## Files to modify
- `.devcontainer/docker-compose.yml` — volume mount + env var
- `.devcontainer/entrypoint.sh` — chown for mounted auth dir

## Verification
1. `docker compose -f .devcontainer/docker-compose.yml down`
2. `docker compose -f .devcontainer/docker-compose.yml up -d --build`
3. VS Code "Reopen in Container" → open terminal → `claude` should authenticate using host tokens
