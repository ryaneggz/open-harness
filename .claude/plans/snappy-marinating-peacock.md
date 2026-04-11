# Consolidate `docker/` into `.devcontainer/`

## Context

The repo has two parallel Docker setups: `docker/` (production sandbox with layered compose overlays) and `.devcontainer/` (VS Code dev container with SSH + extra tooling but missing PostgreSQL/cloudflared). This creates maintenance burden and divergence. The devcontainer should become the single source of truth for containerization.

**Key user requirements:**
- Bake PostgreSQL into the base compose file (no separate nextjs overlay)
- Keep cloudflared + docker-in-docker as optional overlays
- Install cloudflared and agent-browser at **build time** (not conditional runtime install)
- Use **named Docker volumes** for auth persistence (.claude, .cloudflared, .ssh, .config/gh) so restarts don't require re-auth
- Mount path: `/home/sandbox/project` (entire repo, not just workspace/)
- Update CI workflows to build from `.devcontainer/Dockerfile`
- Delete `docker/` entirely

---

## Step 1: Consolidated `.devcontainer/Dockerfile`

Merge both Dockerfiles. Add from `docker/Dockerfile` what's missing:

- **Packages**: add `cron`, `gosu` to apt-get line
- **Cloudflared**: install at build time (apt repo, same as current entrypoint logic but in a RUN layer)
- **Agent-browser + Chromium**: install at build time (`npm install -g agent-browser && agent-browser install --with-deps`)
- **pi-coding-agent**: add `@mariozechner/pi-coding-agent` to npm global install
- **Shell aliases**: add `claude`, `codex`, `pi` aliases to sandbox `.bashrc`
- **COPY install/**: `COPY --chown=sandbox:sandbox install/ /home/sandbox/install/` + `chmod +x`
- **COPY .openharness/**: `COPY --chown=sandbox:sandbox .openharness/ /home/sandbox/.openharness/`
- **COPY workspace/**: `COPY --chown=sandbox:sandbox workspace/ /home/sandbox/project/workspace/` (for CI builds; bind mount overrides at runtime)
- **ENV TZ**: `ENV TZ=America/Denver`

Keep everything already in `.devcontainer/Dockerfile`: SSH server, GitHub CLI, Docker CLI+Compose, Bun, uv, ripgrep, tmux, nano, bash-completion, git safe.directory, VS Code labels.

---

## Step 2: Consolidated `.devcontainer/docker-compose.yml`

Rewrite to merge base + nextjs overlay + current devcontainer compose. Named volumes for all auth:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: ${NAME:-next-postgres-shadcn}-postgres
    environment:
      POSTGRES_USER: sandbox
      POSTGRES_PASSWORD: sandbox
      POSTGRES_DB: sandbox
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sandbox"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - devnet

  sandbox:
    container_name: ${NAME:-next-postgres-shadcn}
    build:
      context: ..
      dockerfile: .devcontainer/Dockerfile
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "2222:22"
      - "${PORT:-3000}:3000"
    volumes:
      - ..:/home/sandbox/project
      - ../.openharness:/home/sandbox/.openharness
      - claude-auth:/home/sandbox/.claude
      - cloudflared-auth:/home/sandbox/.cloudflared
      - gh-config:/home/sandbox/.config/gh
      - ssh-keys:/home/sandbox/.ssh
    extra_hosts:
      - "host.docker.internal:host-gateway"
    environment:
      - TZ=${TZ:-America/Denver}
      - CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS=true
      - DATABASE_URL=postgresql://sandbox:sandbox@postgres:5432/sandbox
      - PGHOST=postgres
      - PGUSER=sandbox
      - PGPASSWORD=sandbox
      - PGDATABASE=sandbox
      - HEARTBEAT_ACTIVE_START=${HEARTBEAT_ACTIVE_START:-}
      - HEARTBEAT_ACTIVE_END=${HEARTBEAT_ACTIVE_END:-}
      - HEARTBEAT_AGENT=${HEARTBEAT_AGENT:-claude}
    stdin_open: true
    tty: true
    entrypoint: /usr/local/bin/entrypoint.sh
    command: /usr/sbin/sshd -D
    restart: unless-stopped
    networks:
      - devnet

networks:
  devnet:
    name: ${NAME:-next-postgres-shadcn}-devnet
    driver: bridge

volumes:
  pgdata:
  claude-auth:
  cloudflared-auth:
  gh-config:
  ssh-keys:
```

**Key changes from current devcontainer compose:**
- Added postgres service with health check
- Replaced `~/.claude` host bind mount with `claude-auth` named volume (persists across restarts)
- Added named volumes for `.cloudflared`, `.config/gh`, `.ssh` (previously only in cloudflared overlay)
- Removed `/var/run/docker.sock` from base (moved to docker overlay)
- Added port 3000, DATABASE_URL, PG* env vars, HEARTBEAT_* env vars
- Added devnet network

---

## Step 3: Cloudflared Overlay `.devcontainer/docker-compose.cloudflared.yml`

Now only needs env vars (no volumes — those are in base, no install — that's in Dockerfile):

```yaml
services:
  sandbox:
    environment:
      - INSTALL_CLOUDFLARED=true
      - INSTALL_BROWSER=true
```

The entrypoint reads these env vars to decide whether to **start** cloudflared/browser services (they're already installed). This is a much cleaner overlay.

---

## Step 4: Docker-in-Docker Overlay `.devcontainer/docker-compose.docker.yml`

Copy from `docker/docker-compose.docker.yml` unchanged:

```yaml
services:
  sandbox:
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

---

## Step 5: Simplified `.devcontainer/entrypoint.sh`

Merge `install/entrypoint.sh` features but **remove conditional install logic** (tools are baked in now):

1. Docker GID sync (existing)
2. Fix .claude ownership (existing)
3. SSH host key generation (existing)
4. Start cron daemon (from install/entrypoint.sh)
5. Heartbeat sync — path updated to `/home/sandbox/project/workspace/heartbeats.conf`
6. Run `workspace/startup.sh` as sandbox user via `gosu` — path updated to `/home/sandbox/project/workspace/startup.sh`
7. `exec "$@"` (pass through to sshd)

No more cloudflared/agent-browser install blocks in the entrypoint.

---

## Step 6: Update `.devcontainer/devcontainer.json`

Add port 3000 to forwarded ports:
```json
"forwardPorts": [2222, 3000]
```

---

## Step 7: Update `.openharness/config.json`

```json
{
  "composeOverrides": [".devcontainer/docker-compose.cloudflared.yml"]
}
```

Remove nextjs overlay (baked in). Update cloudflared path. Nextjs overlay no longer exists.

---

## Step 8: Update CI Workflows

- `.github/workflows/build.yml` line 48: `docker/Dockerfile` -> `.devcontainer/Dockerfile`
- `.github/workflows/release.yml` line 97: `docker/Dockerfile` -> `.devcontainer/Dockerfile`

---

## Step 9: Update `packages/sandbox/src/lib/config.ts`

- Line 48: existence check `"docker", "Dockerfile"` -> `".devcontainer", "Dockerfile"`
- Line 59: `docker/Dockerfile` -> `.devcontainer/Dockerfile`
- Line 63: `docker/docker-compose.yml` -> `.devcontainer/docker-compose.yml`
- Line 67: `docker/docker-compose.docker.yml` -> `.devcontainer/docker-compose.docker.yml`

---

## Step 10: Update `packages/sandbox/src/__tests__/config.test.ts`

Lines 89-91: Update expected paths from `docker/` to `.devcontainer/`.

---

## Step 11: Update mount paths (`~/workspace` -> `~/project/workspace`)

The old setup mounted only `workspace/` at `~/workspace`. The new setup mounts the full repo at `~/project`, so workspace is at `~/project/workspace`.

| File | Lines | Change |
|------|-------|--------|
| `install/entrypoint.sh` | 26, 58 | `/home/sandbox/workspace/` -> `/home/sandbox/project/workspace/` |
| `install/heartbeat.sh` | 13, 425 | `${HOME}/workspace` -> `${HOME}/project/workspace` |
| `install/setup.sh` | 291, 338 | `$SANDBOX_HOME/workspace` -> `$SANDBOX_HOME/project/workspace` |
| `workspace/startup.sh` | 5 | `$HOME/workspace/next-app` -> `$HOME/project/workspace/next-app` |
| `workspace/TOOLS.md` | 7 | `/home/sandbox/workspace` -> `/home/sandbox/project/workspace` |
| `packages/sandbox/src/tools/ralph.ts` | 51,53,67,69,79,81,95,97,111,113,126,128,142,144,158,160,170,172 | `~/workspace` -> `~/project/workspace`, `workdir: "/home/sandbox/workspace"` -> `workdir: "/home/sandbox/project/workspace"` |
| `packages/sandbox/src/tools/shell.ts` | 20 | `workdir: "/home/sandbox/workspace"` -> `workdir: "/home/sandbox/project/workspace"` |
| `packages/sandbox/src/__tests__/docker.test.ts` | 102, 104 | `/home/sandbox/workspace` -> `/home/sandbox/project/workspace` |
| `workspace/.claude/settings.local.json` | 8, 19, 28 | `~/workspace/` -> `~/project/workspace/` |
| `workspace/.claude/skills/implement/SKILL.md` | 206 | `/home/sandbox/workspace` -> `/home/sandbox/project/workspace` |
| `.github/ISSUE_TEMPLATE/agent.md` | 56 | `~/workspace` -> `~/project/workspace` |
| `workspace/heartbeats.conf` | 6 | `~/workspace/` -> `~/project/workspace/` |

---

## Step 12: Update Skills

### `.claude/skills/provision/SKILL.md`
- Line 27: `docker/docker-compose.yml` -> `.devcontainer/docker-compose.yml`
- Line 59: Remove cloudflared/agent-browser install note (baked into image now)
- Line 95: `~/workspace/next-app` -> `~/project/workspace/next-app`

### `.claude/skills/destroy/SKILL.md`
- Line 27: `docker/docker-compose.yml` -> `.devcontainer/docker-compose.yml`
- Line 69: `docker-sandbox` image name may need updating
- Line 80: `docker_` volume prefix -> `devcontainer_` (or check actual prefix)

### `.claude/skills/diagnose/SKILL.md`
- Lines 21, 34, 35, 37, 38, 43: `~/workspace/next-app` -> `~/project/workspace/next-app`

---

## Step 13: Update Documentation

### `CLAUDE.md`
- Infrastructure table: remove `docker/` row, update `.devcontainer/` to "Dockerfile, compose files (base + cloudflared/docker overlays)"
- Quick Reference: update any workspace path references

### `.dockerignore`
- Remove `docker/Dockerfile*` line (docker/ will be deleted)
- Keep `.devcontainer/` excludes with re-includes for entrypoint.sh and Dockerfile

---

## Step 14: Delete `docker/`

Remove all 5 files:
- `docker/Dockerfile`
- `docker/docker-compose.yml`
- `docker/docker-compose.nextjs.yml`
- `docker/docker-compose.cloudflared.yml`
- `docker/docker-compose.docker.yml`

---

## Files Modified (complete list)

| # | File | Action |
|---|------|--------|
| 1 | `.devcontainer/Dockerfile` | Edit (merge production features) |
| 2 | `.devcontainer/docker-compose.yml` | Rewrite (merge base + nextjs + auth volumes) |
| 3 | `.devcontainer/docker-compose.cloudflared.yml` | Create (env vars only) |
| 4 | `.devcontainer/docker-compose.docker.yml` | Create (docker.sock overlay) |
| 5 | `.devcontainer/entrypoint.sh` | Edit (merge install/entrypoint.sh, remove conditional installs) |
| 6 | `.devcontainer/devcontainer.json` | Edit (add port 3000) |
| 7 | `.openharness/config.json` | Edit (update overlay paths) |
| 8 | `.github/workflows/build.yml` | Edit (Dockerfile path) |
| 9 | `.github/workflows/release.yml` | Edit (Dockerfile path) |
| 10 | `packages/sandbox/src/lib/config.ts` | Edit (docker/ -> .devcontainer/) |
| 11 | `packages/sandbox/src/__tests__/config.test.ts` | Edit (path assertions) |
| 12 | `packages/sandbox/src/__tests__/docker.test.ts` | Edit (workspace path) |
| 13 | `packages/sandbox/src/tools/ralph.ts` | Edit (workspace paths) |
| 14 | `packages/sandbox/src/tools/shell.ts` | Edit (workspace path) |
| 15 | `install/entrypoint.sh` | Edit (workspace paths) |
| 16 | `install/heartbeat.sh` | Edit (workspace paths) |
| 17 | `install/setup.sh` | Edit (workspace paths) |
| 18 | `workspace/startup.sh` | Edit (workspace path) |
| 19 | `workspace/TOOLS.md` | Edit (workspace path) |
| 20 | `workspace/heartbeats.conf` | Edit (workspace path) |
| 21 | `workspace/.claude/settings.local.json` | Edit (hook paths) |
| 22 | `workspace/.claude/skills/implement/SKILL.md` | Edit (workspace path) |
| 23 | `.claude/skills/provision/SKILL.md` | Edit (compose path + workspace path) |
| 24 | `.claude/skills/destroy/SKILL.md` | Edit (compose path + volume prefix) |
| 25 | `.claude/skills/diagnose/SKILL.md` | Edit (workspace paths) |
| 26 | `CLAUDE.md` | Edit (remove docker/ references) |
| 27 | `.dockerignore` | Edit (remove docker/Dockerfile* line) |
| 28 | `.github/ISSUE_TEMPLATE/agent.md` | Edit (workspace path) |
| 29 | `docker/` (5 files) | Delete |

---

## Verification

1. **Build the image**: `docker compose -f .devcontainer/docker-compose.yml build`
2. **Start the stack**: `NAME=next-postgres-shadcn docker compose -f .devcontainer/docker-compose.yml -f .devcontainer/docker-compose.cloudflared.yml up -d`
3. **Verify containers**: `docker ps` — both sandbox and postgres should be running
4. **Verify cloudflared installed**: `docker exec next-postgres-shadcn cloudflared --version`
5. **Verify agent-browser installed**: `docker exec next-postgres-shadcn which agent-browser`
6. **Verify auth persists**: restart containers, confirm `.claude` and `.cloudflared` volumes survive
7. **Run tests**: `docker exec -u sandbox next-postgres-shadcn bash -c 'cd ~/project/workspace/next-app && npm run test:setup'`
8. **Run package tests**: `cd packages/sandbox && npm test` (config.ts path assertions)
9. **VS Code attach**: open in VS Code with Dev Containers extension, verify it connects
