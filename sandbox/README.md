# Claude Code Server Setup

Provision an Ubuntu/Debian machine as a Claude Code-ready development server. The setup script installs all required tooling and creates the `clawdius` service user.

Full documentation: [Claude Code docs](https://docs.anthropic.com/en/docs/claude-code)

## Install

```bash
# curl
curl -fsSL https://raw.githubusercontent.com/ruska-ai/sandboxes/refs/heads/claude-code/sandbox/setup.sh -o setup.sh

# wget
wget -qO setup.sh https://raw.githubusercontent.com/ruska-ai/sandboxes/refs/heads/claude-code/sandbox/setup.sh

sudo bash setup.sh
```

The interactive installer will prompt for:

| Prompt | Default | Description |
|--------|---------|-------------|
| Password | `clawdius` | Login password for the `clawdius` user |
| SSH public key | *(skip)* | Added to `~clawdius/.ssh/authorized_keys` |
| Git user.name / user.email | *(skip)* | Global git identity for `clawdius` |
| GitHub token | *(skip)* | Authenticates `gh` CLI for `clawdius` |
| Claude Code CLI | Yes | Installs the [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) |
| agent-browser | Yes | Installs agent-browser + Chromium |

After the script finishes, launch Claude Code:

```bash
su - clawdius
claude
```
(The first time you run `claude`, it will walk you through OAuth authentication.)

### Non-interactive (CI / automation)

Installs everything with defaults (`clawdius:clawdius`, all optional tools enabled):

```bash
sudo bash setup.sh --non-interactive
```

## What gets installed

| Tool | Version |
|------|---------|
| Node.js | 22.x |
| Bun | latest |
| uv | latest |
| GitHub CLI | latest |
| Claude Code CLI | latest |
| agent-browser + Chromium | latest (optional) |

## Post-install

```bash
# Switch to clawdius
su - clawdius

# Verify tooling
node --version && bun --version && uv --version && gh --version

# Launch Claude Code (authenticates via OAuth on first run)
claude
```
