---
name: provision
description: Provision a new agent sandbox (interactive or with params)
argument-hint: "[agent-name] [--docker] [--heartbeat] [--base-branch=main]"
---

# Provision Agent Sandbox

You are provisioning a new sandboxed agent workspace. Follow the steps below.

Worktree paths mirror branch paths: branch `agent/<NAME>` → `.worktrees/agent/<NAME>`.

## 1. Resolve Parameters

Arguments received: `$ARGUMENTS`

Parse the following from arguments:
- **NAME**: first positional argument (e.g., `my-agent`)
- **BRANCH**: `agent/<NAME>` (default convention)
- **WORKTREE**: `.worktrees/<BRANCH>` (e.g., `.worktrees/agent/my-agent`)
- **DOCKER**: `true` if `--docker` flag is present, otherwise `false`
- **HEARTBEAT**: `true` if `--heartbeat` flag is present, otherwise `false`
- **BASE_BRANCH**: value of `--base-branch=<branch>` if present, otherwise `main`

### Interactive Mode (HITL)

If `$ARGUMENTS` is empty or NAME is missing, enter interactive mode. Ask the user these questions one at a time, waiting for each answer:

1. **Agent name?** (used for worktree, branch, container, and image name)
2. **Which AI agent CLIs?** (claude, codex, pi — all installed by default via `--non-interactive`, ask if they want to note which they'll primarily use)
3. **What is this agent's role/purpose?** (shapes the GitHub issue description)
4. **Docker-in-Docker access?** (default: no)
5. **Enable heartbeat?** (default: no)
6. **Base branch?** (default: `main` — use `main` unless explicitly told otherwise; `development` has a different project structure)

## 2. Create GitHub Issue

Create a GitHub issue to track this agent. Note: the `agent` label may not exist yet — create the issue without labels if it fails:

```bash
gh issue create \
  --title "[AGENT] <NAME> — <short role description>" \
  --body "<issue body>"
```

The issue body should include:
- Agent Identity table (name, branch `agent/<NAME>`, worktree `.worktrees/agent/<NAME>`, CLIs, docker, heartbeat)
- Role description from user input
- Provisioning commands for reference
- Acceptance criteria checkboxes

## 3. Provision via `make quickstart`

**Preferred method** — use `make quickstart` with the correct BASE_BRANCH:

```bash
make NAME=<NAME> BASE_BRANCH=<BASE_BRANCH> quickstart
```

This creates the worktree at `.worktrees/agent/<NAME>` (mirroring the branch `agent/<NAME>`).

### If `make quickstart` fails

Fall back to running steps manually. Common failure modes:
- **Path mismatch**: `main` uses `docker/Dockerfile`, `development` uses `setup/docker/Dockerfile`
- **Permission denied on setup.sh**: the `main` branch Dockerfile may not set execute permissions on install scripts

#### 3a. Create Worktree

```bash
git fetch origin <BASE_BRANCH> 2>/dev/null || true
git fetch origin agent/<NAME> 2>/dev/null || true
mkdir -p .worktrees/agent
```

If branch `agent/<NAME>` already exists:
```bash
git worktree add .worktrees/agent/<NAME> agent/<NAME>
```

Otherwise:
```bash
git worktree add .worktrees/agent/<NAME> -b agent/<NAME> origin/<BASE_BRANCH>
```

#### 3b. Detect Layout and Build

The project has two known layouts. Detect which one the worktree uses:

| Layout | Dockerfile | Compose | Install path in container | Workspace in container |
|--------|-----------|---------|--------------------------|----------------------|
| `main` | `docker/Dockerfile` | `docker/docker-compose.yml` | `/home/sandbox/install/` | `/home/sandbox/workspace/` |
| `development` | `setup/docker/Dockerfile` | `setup/docker/docker-compose.yml` | `/opt/open-harness/install/` | `/home/sandbox/` |

```bash
WTREE=".worktrees/agent/<NAME>"

if [ -f "$WTREE/setup/docker/Dockerfile" ]; then
  LAYOUT="development"
  DOCKERFILE="$WTREE/setup/docker/Dockerfile"
  COMPOSE_FILE="$WTREE/setup/docker/docker-compose.yml"
  SETUP_PATH="/opt/open-harness/install/setup.sh"
  WORKSPACE="/home/sandbox"
elif [ -f "$WTREE/docker/Dockerfile" ]; then
  LAYOUT="main"
  DOCKERFILE="$WTREE/docker/Dockerfile"
  COMPOSE_FILE="$WTREE/docker/docker-compose.yml"
  SETUP_PATH="/home/sandbox/install/setup.sh"
  WORKSPACE="/home/sandbox/workspace"
fi

docker build -f "$DOCKERFILE" -t ghcr.io/ryaneggz/<NAME>:latest "$WTREE"
```

#### 3c. Start Container

```bash
WORKTREE_ABS=$(realpath .worktrees/agent/<NAME>)
NAME=<NAME> HARNESS_ROOT="$WORKTREE_ABS" HOST_WORKSPACE="$WORKTREE_ABS" \
  docker compose -f "$COMPOSE_FILE" -p <NAME> up -d
```

If DOCKER is true, also include the docker-in-docker override compose file (same directory, `docker-compose.docker.yml`).

#### 3d. Run Setup

**Important**: Fix execute permissions first — the `main` branch Dockerfile may not set them:

```bash
docker exec --user root <NAME> bash -c "chmod +x ${SETUP_PATH%/*}/*.sh && bash $SETUP_PATH --non-interactive"
```

## 4. Verify

Run health checks. The workspace path differs by layout:

```bash
# Container running
docker ps --filter "name=<NAME>" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"

# Workspace files present (adjust path by layout)
# main layout:
docker exec --user sandbox <NAME> bash -c 'ls ~/workspace/AGENTS.md ~/workspace/SOUL.md ~/workspace/MEMORY.md'
# development layout:
docker exec --user sandbox <NAME> bash -c 'ls ~/AGENTS.md ~/SOUL.md ~/MEMORY.md'

# Agent CLIs installed
docker exec --user sandbox <NAME> bash -c 'claude --version 2>/dev/null; pi --version 2>/dev/null; codex --version 2>/dev/null'

# Worktree branch
git -C .worktrees/agent/<NAME> branch --show-current
```

If any verification fails, report the specific failure and suggest remediation.

## 5. Scaffold the Workspace

After provisioning, scaffold the agent's workspace based on the role/purpose gathered in step 1. Write files directly to the host worktree path (bind-mounted into the container):

```
WORKSPACE=".worktrees/agent/<NAME>/workspace"
```

> **Important**: Use the host Write/Edit tools on `$WORKSPACE/` paths — NOT `docker exec` with heredocs (shell escaping breaks on markdown content). Only use `docker exec` for commands that need the container runtime (`uv init`, `uv add`, `heartbeat.sh sync`).

### 5a. SOUL.md — Agent Persona

Write `$WORKSPACE/SOUL.md` with:
- **Identity**: Who the agent is, what it does, framed around the role from step 1
- **Core Truths**: Sandbox context, mock/educational framing if applicable
- **Personality**: Communication style appropriate to the role
- **Boundaries**: What the agent should and shouldn't do
- **Continuity**: Pointers to MEMORY.md, state files, and daily logs

### 5b. MEMORY.md — Seeded Context

Write `$WORKSPACE/MEMORY.md` with:
- **Decisions & Preferences**: Strategy details, key parameters, data sources
- **Lessons Learned**: Empty section (populated by the agent over time)
- **Project Context**: Domain knowledge, research findings, reference links

If the agent's role benefits from research (market data, API docs, competitor analysis), use WebSearch to gather current information and seed it here.

### 5c. Skills (Optional)

If the agent's role involves consequential decisions, create quality gate skills in `$WORKSPACE/.claude/skills/`. Common patterns:

| Skill Pattern | When to Use |
|---|---|
| **risk-metrics** | Agent manages resources, budgets, or portfolios |
| **allocation-check** | Agent distributes resources with constraints |
| **sentiment-score** | Agent needs external signal aggregation |
| **strategy-review** | Agent needs to measure its own decision quality over time |

Each skill goes in its own directory with a `SKILL.md` file containing frontmatter (name, description, trigger conditions) and instructions.

### 5d. Heartbeats (Optional)

If heartbeats were requested, write:
- `$WORKSPACE/heartbeats.conf` — cron schedule mapping files to schedules
- `$WORKSPACE/heartbeats/<task>.md` — one file per scheduled task with detailed instructions

Then sync inside the container:
```bash
docker exec --user sandbox <NAME> bash -c '~/install/heartbeat.sh sync'
```

### 5e. Project Initialization (Optional)

If the agent needs a Python or Node.js project, initialize it inside the container:
```bash
# Python
docker exec --user sandbox <NAME> bash -c 'cd ~/workspace && uv init <project> && cd <project> && uv add <packages>'

# Node.js
docker exec --user sandbox <NAME> bash -c 'cd ~/workspace && bun init <project>'
```

Then write initial state/config files to `$WORKSPACE/<project>/` from the host.

### 5f. README.md — Standalone Artifact

Write a new `README.md` at the worktree root (`.worktrees/agent/<NAME>/README.md`) that describes this specific agent — not the generic Open Harness README. Include:
- Agent title and purpose
- Strategy/approach
- Skills and heartbeats
- Data sources
- Getting started commands
- Fork notice: "Forked from [Open Harness](https://github.com/ryaneggz/open-harness)"

## 6. Report Access Steps

After successful provisioning and scaffolding, tell the user:

```
Sandbox '<NAME>' is ready!

  Issue:    <github issue URL>
  Branch:   agent/<NAME> (from <BASE_BRANCH>)
  Worktree: .worktrees/agent/<NAME>

  Access:
    make NAME=<NAME> shell    # enter the sandbox as 'sandbox' user
    claude                    # start Claude Code
    pi                        # start Pi Agent

  Validate:
    docker ps --filter "name=<NAME>"
    make list

  Manage:
    make NAME=<NAME> stop     # stop the sandbox
    make NAME=<NAME> run      # restart the sandbox
    make NAME=<NAME> clean    # full teardown (container + image + worktree)
```
