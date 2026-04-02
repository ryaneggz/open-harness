---
name: setup
description: Build, start, and provision the dc-designer sandbox from the branch root
argument-hint: "[--docker]"
---

# Setup dc-designer Sandbox

You are running at the root of the `agent/dc-designer` branch. This skill builds the Docker container, installs tools, clones the target project, syncs heartbeats, and starts the viewer dev server.

## Prerequisites

The host needs: Docker, Docker Compose, Git, and GitHub CLI (`gh`).

## Steps

### 1. Build the Docker image

```bash
docker build -f docker/Dockerfile -t dc-designer:latest .
```

### 2. Start the container

```bash
NAME=dc-designer docker compose -f docker/docker-compose.yml -p dc-designer up -d
```

If `$ARGUMENTS` contains `--docker`, also include the Docker-in-Docker override:

```bash
NAME=dc-designer docker compose -f docker/docker-compose.yml -f docker/docker-compose.docker.yml -p dc-designer up -d
```

### 3. Run setup.sh

```bash
docker exec --user root dc-designer bash -c 'chmod +x /home/sandbox/install/*.sh && /home/sandbox/install/setup.sh --non-interactive'
```

### 4. Clone the target project

Clone from the host into the bind-mounted workspace so it persists:

```bash
git clone https://github.com/shpeedle/ai-datacenter-designer.git workspace/ai-datacenter-designer
```

If the directory already exists, pull instead:

```bash
git -C workspace/ai-datacenter-designer pull origin main
```

### 5. Sync heartbeats

```bash
docker exec --user sandbox dc-designer bash -c '/home/sandbox/install/heartbeat.sh sync'
```

### 6. Start the viewer dev server

```bash
docker exec --user sandbox dc-designer bash --login -c 'cd ~/workspace/ai-datacenter-designer && nohup python3 -m http.server 8200 > /tmp/http-server.log 2>&1 &'
```

### 7. Verify

Run all checks and report results:

```bash
# Container running
docker ps --filter "name=dc-designer" --format "table {{.Names}}\t{{.Status}}"

# Workspace files
ls workspace/SOUL.md workspace/MEMORY.md workspace/heartbeats.conf workspace/ai-datacenter-designer/model_datacenter.py

# Skills
ls workspace/.claude/skills/design-consistency/SKILL.md workspace/.claude/skills/model-review/SKILL.md

# Heartbeat
docker exec --user sandbox dc-designer bash -c '/home/sandbox/install/heartbeat.sh status'

# Claude CLI
docker exec --user sandbox dc-designer bash --login -c 'claude --version'

# Viewer
curl -s -o /dev/null -w "%{http_code}" http://localhost:8200/viewer.html
```

### 8. Report

Print:

```
dc-designer sandbox is ready!

  Container:  dc-designer (running)
  Viewer:     http://localhost:8200/viewer.html
  Heartbeats: 2 schedules synced

  Enter the sandbox:
    docker exec -it --user sandbox dc-designer bash --login

  Start the agent inside:
    cd workspace && claude
```
