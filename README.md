# dc-designer — AI Datacenter Design Engineer

An [Open Harness](https://github.com/ryaneggz/open-harness) agent sandbox for [ai-datacenter-designer](https://github.com/shpeedle/ai-datacenter-designer) — a 50MW→200MW hyperscale AI datacenter facility design project.

## Quick Setup

**Prerequisites**: Docker, Docker Compose, Git, GitHub CLI (`gh`)

```bash
git clone https://github.com/ryaneggz/open-harness.git && cd open-harness
git checkout agent/dc-designer
claude
```

Then tell Claude:

```
/setup
```

This builds the container, installs tools, clones the target repo, syncs heartbeats, and starts the viewer on port 8200.

## What's Inside

| Component | Description |
|-----------|-------------|
| **14 plan documents** | Power, cooling, network, compute, storage, layout, redundancy, security, sustainability, cost, 3D visualization, phased rollout |
| **model_datacenter.py** | FreeCAD parametric 3D model (~700 lines) |
| **viewer.html** | Interactive plan viewer at `http://localhost:8200/viewer.html` |

## Agent Capabilities

| Skill | Purpose |
|-------|---------|
| `design-consistency` | Validates power, cooling, space, and cost figures across all 14 plan documents (7 gates) |
| `model-review` | Reviews model_datacenter.py for code quality, plan alignment, and parametric correctness |

| Heartbeat | Schedule |
|-----------|----------|
| Design review | Wednesday 10am MT — upstream sync, consistency check, model review |
| Memory distill | Sunday 8pm MT — distill daily logs into long-term memory |

## Manual Setup

If you prefer not to use Claude for setup:

```bash
# Build and start the container
docker build -f docker/Dockerfile -t dc-designer:latest .
NAME=dc-designer docker compose -f docker/docker-compose.yml -p dc-designer up -d

# Install tools inside the container
docker exec --user root dc-designer bash -c \
  'chmod +x /home/sandbox/install/*.sh && /home/sandbox/install/setup.sh --non-interactive'

# Clone the target project into the bind-mounted workspace
git clone https://github.com/shpeedle/ai-datacenter-designer.git workspace/ai-datacenter-designer

# Sync heartbeat schedules
docker exec --user sandbox dc-designer bash -c '/home/sandbox/install/heartbeat.sh sync'

# Start the viewer dev server
docker exec --user sandbox dc-designer bash --login -c \
  'cd ~/workspace/ai-datacenter-designer && nohup python3 -m http.server 8200 > /tmp/http-server.log 2>&1 &'
```

## Usage

```bash
# Enter the sandbox
docker exec -it --user sandbox dc-designer bash --login

# Start the agent
cd workspace && claude

# View the datacenter plans
open http://localhost:8200/viewer.html
```

## Teardown

```bash
docker compose -f docker/docker-compose.yml -p dc-designer down --rmi local
```

---

Forked from [Open Harness](https://github.com/ryaneggz/open-harness)
