# Claude Code Sandboxes

Server provisioning and sandbox images for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Each sandbox provides an isolated, pre-configured environment for Claude Code agents to execute tasks.

## Quick Start

Provision a fresh Ubuntu/Debian server:

```bash
# curl
curl -fsSL https://raw.githubusercontent.com/ruska-ai/sandboxes/refs/heads/claude-code/sandbox/setup.sh -o setup.sh

# wget
wget -qO setup.sh https://raw.githubusercontent.com/ruska-ai/sandboxes/refs/heads/claude-code/sandbox/setup.sh

sudo bash setup.sh
```

## Architecture

The sandbox provisions a `sandbox` user with:

- **Runtime tooling** -- Node.js 22.x, Bun, uv (Python), GitHub CLI
- **Claude Code CLI** -- AI-powered coding assistant
- **Browser automation** -- agent-browser + Chromium (optional)
- **SSH access** -- configurable authorized keys
- **Git identity** -- pre-configured global git config
