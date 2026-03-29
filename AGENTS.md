# Open Harness Agent Sandbox

You are working inside an isolated Docker container on the **Open Harness** project itself.

## Environment

- **OS**: Debian Bookworm (slim)
- **User**: `sandbox` (passwordless sudo)
- **Home**: `/home/sandbox` (container-local user state)
- **Working directory**: `/workspace` (bind-mounted project root from the host)
- **Docker**: CLI + Compose available; host Docker socket may be mounted for container management
- **Permissions**: `--dangerously-skip-permissions` is the default for Claude Code (aliased in `.bashrc`)

## What This Project Is

Open Harness is the sandbox system itself, and the project root also acts as the default user workspace scaffold inside the sandbox.

- `setup/docker/` defines the base container image and compose wiring
- `setup/install/` contains provisioning/runtime scripts for the harness
- `setup/oh` is the host-side CLI entrypoint (`oh`)
- `setup/Makefile` contains the sandbox orchestration logic; the root `Makefile` is a thin entrypoint
- `AGENTS.md`, `SOUL.md`, `MEMORY.md`, `heartbeats.conf`, `heartbeats/`, and `memory/` define persistent agent behavior at the project root

## Installed Tools

All tools are installed system-wide in `/usr/local/bin` or via apt:

| Tool | Version | Usage |
|------|---------|-------|
| Node.js | 22.x | `node`, `npm`, `npx` |
| Bun | latest | `bun` |
| uv | latest | `uv` |
| GitHub CLI | latest | `gh` |
| Docker | latest | `docker`, `docker compose` |
| tmux | latest | `tmux` |
| nano | latest | `nano` |
| ripgrep | latest | `rg` |
| git | latest | `git` |
| jq | latest | `jq` |

### Optional Agents (installed if selected)

| Agent | Command | Docs |
|-------|---------|------|
| Claude Code | `claude` | https://docs.anthropic.com/en/docs/claude-code |
| OpenAI Codex | `codex` | https://github.com/openai/codex |
| Pi Agent | `pi` | https://shittycodingagent.ai |
| AgentMail | `agentmail` | https://docs.agentmail.to/integrations/cli |

## Guidelines

- Work from the project root at `/workspace`
- This repo is mounted whole so the harness can edit itself
- `setup/install/` in the repo is the source of truth; the currently running runtime copy lives at `/opt/open-harness/install/`
- Changes to Docker/runtime bootstrap behavior typically require rebuild/restart to validate
- Use `uv` for Python projects and `bun`/`npm` for JS/TS
- You have full sudo access if you need additional packages
- `CLAUDE.md` and `AGENTS.md` are symlinked
- Project agent config directories live at the root: `.claude/`, `.codex/`, `.pi/`

## Soul

`SOUL.md` defines your persona, tone, and behavioral boundaries. Read it to understand who you are. You may update it over time, but always tell the user when you do.

## Memory

Your long-term memory lives in two places:

- **`MEMORY.md`** — curated, durable memories (decisions, preferences, lessons learned). Read this at session start.
- **`memory/YYYY-MM-DD.md`** — daily append-only logs. Write notable events, decisions, and learnings here during work.

Workflow:
- At session start, read `MEMORY.md` for context
- During work, append to `memory/YYYY-MM-DD.md` (today's date)
- Periodically (during heartbeats or when asked), distill daily logs into `MEMORY.md`
- If the user says "remember this", write it to `MEMORY.md` immediately

## Heartbeat

Heartbeats are periodic tasks executed on cron schedules. Each heartbeat is a `.md` file containing instructions for the agent.

- **Schedule config**: `heartbeats.conf` in the project root — maps files to cron expressions
- **Format**: `<cron> | <file> | [agent] | [active_start-active_end]`
- **Heartbeat files**: `.md` files in `heartbeats/`
- **Manage from host**: `make heartbeat`, `make heartbeat-stop`, `make heartbeat-status`
- **Logs**: `~/.heartbeat/heartbeat.log` inside the container
- Schedules auto-sync on container startup from `heartbeats.conf`
- If a heartbeat file is empty (only headers/comments), that execution is skipped to save API costs
- If nothing needs attention, reply `HEARTBEAT_OK`
