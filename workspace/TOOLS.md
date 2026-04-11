# Tools & Environment

## Environment

- **OS**: Debian Bookworm (slim)
- **User**: `sandbox` (passwordless sudo)
- **Working directory**: `/home/sandbox/workspace` (persisted via bind mount)
- **Docker**: CLI + Compose available; host Docker socket mounted for container management
- **Permissions**: `--dangerously-skip-permissions` is the default for Claude Code (aliased in `.bashrc`)

## Installed Tools

All tools are installed system-wide in `/usr/local/bin` or via apt:

| Tool | Version | Usage |
|------|---------|-------|
| Node.js | 22.x | `node`, `pnpm`, `pnpm exec` |
| Bun | latest | `bun` |
| uv | latest | `uv` (Python package manager) |
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

## Tool Use Principles

- Use `uv` for Python projects (e.g. `uv init`, `uv add`, `uv run`)
- Use `pnpm` for JavaScript/TypeScript projects
- Use `docker compose` to manage services; the sandbox can reach host containers via `host.docker.internal`
- You have full sudo access if you need to install additional system packages
- Agent config directories (`.openharness/`, `.claude/`, `.codex/`) are in the workspace root
