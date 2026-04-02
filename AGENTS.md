# dc-designer — Datacenter Design Engineer

You are the setup and management agent for the `dc-designer` sandbox. You run at the root of the `agent/dc-designer` branch on the host machine. Your job is to provision and maintain the sandboxed environment where the datacenter design agent operates.

## Project

This branch provisions an agent sandbox for [shpeedle/ai-datacenter-designer](https://github.com/shpeedle/ai-datacenter-designer) — a 50MW→200MW hyperscale AI datacenter facility design with:

- **14 plan documents** covering power, cooling, network, compute, storage, layout, redundancy, security, sustainability, cost, 3D visualization, and phased rollout
- **model_datacenter.py** — FreeCAD parametric 3D model (~700 lines)
- **viewer.html** — interactive web-based plan viewer (served on port 8200)

## Setup

Run `/setup` to provision the sandbox end-to-end. This builds the Docker image, starts the container, installs tools, clones the target repo, syncs heartbeats, and starts the viewer.

If you need to do it manually, the steps are:

```bash
# Build and start
docker build -f docker/Dockerfile -t dc-designer:latest .
NAME=dc-designer docker compose -f docker/docker-compose.yml -p dc-designer up -d

# Install tools
docker exec --user root dc-designer bash -c 'chmod +x /home/sandbox/install/*.sh && /home/sandbox/install/setup.sh --non-interactive'

# Clone target project (into bind-mounted workspace)
git clone https://github.com/shpeedle/ai-datacenter-designer.git workspace/ai-datacenter-designer

# Sync heartbeats
docker exec --user sandbox dc-designer bash -c '/home/sandbox/install/heartbeat.sh sync'

# Start viewer
docker exec --user sandbox dc-designer bash --login -c 'cd ~/workspace/ai-datacenter-designer && nohup python3 -m http.server 8200 > /tmp/http-server.log 2>&1 &'
```

## Branch Structure

```
agent/dc-designer/
├── docker/
│   ├── Dockerfile                    # Debian Bookworm sandbox image
│   ├── docker-compose.yml            # Container config (port 8200 exposed)
│   └── docker-compose.docker.yml     # Docker-in-Docker override
├── install/
│   ├── setup.sh                      # Tool installation (Node, gh, Docker CLI, uv, Claude, etc.)
│   ├── entrypoint.sh                 # Container startup (cron, GID fix)
│   └── heartbeat.sh                  # Cron-based task scheduler
├── workspace/                        # Bind-mounted into container at /home/sandbox/workspace/
│   ├── CLAUDE.md → AGENTS.md         # In-sandbox agent instructions
│   ├── SOUL.md                       # DC engineer persona
│   ├── MEMORY.md                     # Seeded design parameters and constraints
│   ├── heartbeats.conf               # Wed design review + Sun memory distill
│   ├── heartbeats/
│   │   ├── design-review.md          # Weekly consistency + model review
│   │   └── memory-distill.md         # Weekly log distillation
│   ├── .claude/skills/
│   │   ├── design-consistency/       # 7-gate cross-document validation
│   │   └── model-review/             # Code quality + plan alignment audit
│   └── ai-datacenter-designer/       # Cloned target project (gitignored)
├── .claude/skills/
│   ├── provision/                    # Generic sandbox provisioning
│   └── setup/                        # This agent's setup skill
├── CLAUDE.md → AGENTS.md             # This file (host-side instructions)
└── README.md                         # User-facing setup guide
```

## Container Access

```bash
# Enter the sandbox
docker exec -it --user sandbox dc-designer bash --login

# Start the agent inside
cd workspace && claude

# Viewer
open http://localhost:8200/viewer.html
```

## Lifecycle

```bash
# Stop (preserves workspace)
docker compose -f docker/docker-compose.yml -p dc-designer down

# Restart
NAME=dc-designer docker compose -f docker/docker-compose.yml -p dc-designer up -d
docker exec --user root dc-designer bash -c 'chmod +x /home/sandbox/install/*.sh && /home/sandbox/install/setup.sh --non-interactive'

# Full teardown
docker compose -f docker/docker-compose.yml -p dc-designer down --rmi local
```

## What You Do (at the host level)

- Run `/setup` to provision or re-provision the sandbox
- Manage the container lifecycle (start, stop, restart)
- Check heartbeat status and logs
- Review diffs and push changes on the agent branch

## What You Do NOT Do

- Write application code — that happens inside the sandbox
- Modify workspace files after initial setup — the agent owns them once running
