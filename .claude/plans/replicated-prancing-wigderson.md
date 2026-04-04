# Orchestrator Dev Container with SSH Access

## Context

The project uses the `openharness` CLI (not Make) for all sandbox management. The user wants an orchestrator dev container — a long-running SSH-accessible container wrapping the entire project root, connectable from VS Code on port 2222 with user `orchestrator` / password `test1234`. Uses the standard `.devcontainer/` convention.

This is **recommended but optional** — it adds an isolation layer so the orchestrator itself runs inside a container. Without it, the orchestrator runs bare-metal on the host with just Docker as a prerequisite.

## Files to Create

### 1. `.devcontainer/Dockerfile`

Based on the existing `docker/Dockerfile` pattern but tailored for orchestrator:

- **Base**: `debian:bookworm-slim`
- **System packages**: `openssh-server`, `ca-certificates`, `curl`, `wget`, `sudo`, `git`, `jq`, `gnupg`, `lsb-release`, `nano`, `ripgrep`, `tmux`, `unzip`, `bash-completion`, `procps`, `less`
- **Dev tools** (same install pattern as `install/setup.sh`):
  - Node.js 22.x (nodesource)
  - GitHub CLI (GitHub apt repo)
  - Docker CLI + Compose plugin (Docker apt repo)
  - Bun (system-wide)
  - uv (system-wide)
- **User setup**:
  - `useradd -m -s /bin/bash orchestrator`
  - Password: `echo "orchestrator:test1234" | chpasswd`
  - Passwordless sudo via `/etc/sudoers.d/orchestrator`
  - Docker group membership
  - `git config --global --add safe.directory /home/orchestrator/project`
- **SSH config**:
  - `mkdir -p /run/sshd`
  - Enable `PasswordAuthentication yes`
  - Enable `PermitUserEnvironment yes`
- **EXPOSE**: 22
- **WORKDIR**: `/home/orchestrator/project`

### 2. `.devcontainer/entrypoint.sh`

Minimal entrypoint — Docker GID matching (same logic as `install/entrypoint.sh` lines 4-13), then `exec "$@"`. No cron/heartbeat/gosu — those are agent-sandbox concerns.

### 3. `.devcontainer/docker-compose.yml`

```yaml
services:
  orchestrator:
    container_name: orchestrator
    build:
      context: ..
      dockerfile: .devcontainer/Dockerfile
    ports:
      - "2222:22"
    volumes:
      - ..:/home/orchestrator/project
      - /var/run/docker.sock:/var/run/docker.sock
    extra_hosts:
      - "host.docker.internal:host-gateway"
    entrypoint: /usr/local/bin/entrypoint.sh
    command: /usr/sbin/sshd -D
    restart: unless-stopped
```

Docker socket mounted by default — the orchestrator needs it to run `openharness quickstart`, `openharness shell`, etc.

### 4. `.devcontainer/devcontainer.json`

```json
{
  "name": "Open Harness Orchestrator",
  "dockerComposeFile": "docker-compose.yml",
  "service": "orchestrator",
  "workspaceFolder": "/home/orchestrator/project",
  "remoteUser": "orchestrator",
  "forwardPorts": [2222],
  "customizations": {
    "vscode": {
      "settings": {
        "terminal.integrated.defaultProfile.linux": "bash"
      }
    }
  }
}
```

Two connection methods:
- **Dev Containers extension**: "Reopen in Container" (native, no SSH)
- **Remote-SSH**: `ssh orchestrator@localhost -p 2222` (password: `test1234`)

## Files to Modify

### 5. `.dockerignore`

- Change `docker/Dockerfile` to `docker/Dockerfile*`
- Add `.devcontainer/`, `.worktrees/`, `.git/`, `node_modules/` to exclusions (speeds up sandbox builds; none are COPYed by the sandbox Dockerfile)

### 6. `README.md` — Add Orchestrator Dev Container section

Add after "More Ways to Run" (line ~97, before "Structure"). Framed as **recommended but optional**.

Section: `🖥️ Orchestrator Dev Container (Recommended)`

Content:
- **What**: A `.devcontainer` setup wrapping the project root in an isolated container with all orchestrator tools pre-installed
- **Why recommended**: Isolation layer — if an agent escapes its sandbox, it hits the orchestrator container, not your host. Reproducible dev environment across machines
- **Optional**: You can still run the orchestrator bare-metal with just Docker installed
- **Two ways to connect**:
  1. VS Code Dev Containers: "Reopen in Container"
  2. SSH: `ssh orchestrator@localhost -p 2222` (password: `test1234`)
- **Usage inside**: `openharness quickstart my-agent`, `openharness shell my-agent`, etc. — same CLI workflow
- **Teardown**: `docker compose -f .devcontainer/docker-compose.yml down`

Update the **Structure** section to add:
```
├── .devcontainer/
│   ├── devcontainer.json        # VS Code Dev Container config
│   ├── Dockerfile               # orchestrator image: SSH + dev tools
│   ├── docker-compose.yml       # orchestrator compose (port 2222, Docker socket)
│   └── entrypoint.sh            # Docker GID matching entrypoint
```

## Usage

```bash
# Option 1: VS Code Dev Containers (recommended)
# Open project in VS Code -> "Reopen in Container"

# Option 2: Manual compose + SSH
docker compose -f .devcontainer/docker-compose.yml up -d
ssh orchestrator@localhost -p 2222   # password: test1234

# Inside the container — same CLI workflow
openharness quickstart my-agent
openharness shell my-agent
openharness list

# Stop
docker compose -f .devcontainer/docker-compose.yml down
```

## Verification

1. `docker compose -f .devcontainer/docker-compose.yml up -d --build`
2. `ssh orchestrator@localhost -p 2222` — accepts password `test1234`
3. Inside container: `git status`, `node --version`, `docker ps`, `gh --version` all work
4. Project files visible at `/home/orchestrator/project`
5. `npm install -g openharness` works (or link from project)
6. VS Code "Reopen in Container" works
7. VS Code Remote-SSH connects on port 2222
8. README documents the feature as recommended but optional
