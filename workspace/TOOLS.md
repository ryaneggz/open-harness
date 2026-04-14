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

## agent-browser CLI

`agent-browser` is the primary testing tool for this agent. Use it to navigate, interact with, and validate web UIs.

### Basic Navigation

```bash
agent-browser open "https://example.com"        # Open URL
agent-browser screenshot path/to/file.png        # Capture screenshot
agent-browser close                               # Close session
```

### Accessibility Snapshot

```bash
agent-browser snapshot -i              # Interactive elements with refs
agent-browser snapshot -c              # Compact tree (removes empty nodes)
```

### Form Interaction

```bash
agent-browser fill @e3 "user@example.com"   # Fill field by ref
agent-browser click @e5                      # Click element by ref
agent-browser press Enter                    # Press key
```

### State Checking

```bash
agent-browser is visible "selector"
agent-browser is enabled "selector"
agent-browser get text "selector"
```

### Responsive Testing

```bash
agent-browser set viewport 1920 1080   # Desktop
agent-browser set viewport 768 1024    # Tablet
agent-browser set viewport 375 812     # Mobile
```

### Session Management

```bash
agent-browser --session uat-run open <url>   # Isolated session
agent-browser close                          # Always close when done
```

### Screenshot Convention

```
uat/<slug>/screenshots/YYYY-MM-DD/<flow>-<step>-<viewport>.png
```

## Tool Use Principles

- Use `uv` for Python projects (e.g. `uv init`, `uv add`, `uv run`)
- Use `pnpm` for JavaScript/TypeScript projects
- Use `docker compose` to manage services; the sandbox can reach host containers via `host.docker.internal`
- You have full sudo access if you need to install additional system packages
- Agent config directories (`.openharness/`, `.claude/`, `.codex/`) are in the workspace root
- `agent-browser` is the primary testing tool. Always close sessions when done. Use `--session` for test isolation. Wait for selectors to be present before taking screenshots.
