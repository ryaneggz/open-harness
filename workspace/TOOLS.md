# Tools & Environment

## Environment

- **OS**: Debian Bookworm (slim)
- **User**: `sandbox` (passwordless sudo)
- **Workdir**: `/home/sandbox/workspace` (bind mount, persists)
- **Docker**: CLI + Compose, host socket mounted
- **Perms**: `--dangerously-skip-permissions` default

## Installed Tools

| Tool | Version | Command |
|------|---------|---------|
| Node.js | 22.x | `node`, `pnpm` |
| Bun | latest | `bun` |
| uv | latest | `uv` (Python) |
| GitHub CLI | latest | `gh` |
| Docker | latest | `docker`, `docker compose` |
| tmux | latest | `tmux` |
| ripgrep | latest | `rg` |
| git | latest | `git` |
| jq | latest | `jq` |

### Optional Agents

| Agent | Command | Notes |
|-------|---------|-------|
| Claude Code | `claude` | Installed by default |
| OpenAI Codex | `codex` | Installed by default |
| Pi Agent | `pi` | Installed by default |
| Deep Agents | `deepagents` | Opt-in via `INSTALL_DEEPAGENTS_CLI=true` |
| AgentMail | `agentmail` | Opt-in via setup.sh |

## Principles

- Python → `uv`. JS/TS → `pnpm`.
- Services → `docker compose`. Host containers via `host.docker.internal`.
- Full sudo if needed.
- Config dirs: `.openharness/`, `.claude/`, `.codex/` in workspace root.
