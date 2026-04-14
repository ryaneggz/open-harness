# 🏗️ Open Harness

Isolated, pre-configured sandbox containers for AI coding agents — [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [OpenAI Codex](https://github.com/openai/codex), [Pi Agent](https://shittycodingagent.ai), and more.

> **Spin up a fully-provisioned Dev Container where AI coding agents can operate with full permissions, persistent memory, and autonomous background tasks — without touching your host system.**

📖 [Full documentation](https://ryaneggz.github.io/open-harness/)

## ⚡ Quickstart

**Only host dependency:** [Docker](https://docs.docker.com/get-docker/).

### 1. Start the sandbox

```bash
git clone https://github.com/ryaneggz/open-harness.git && cd open-harness
cp .devcontainer/.example.env .env        # configure name, password, etc.
docker compose -f .devcontainer/docker-compose.yml up -d --build
```

### 2. Connect to the sandbox

**Option A — Terminal (works everywhere):**
```bash
docker exec -it -u sandbox openharness bash   # use your SANDBOX_NAME
```

**Option B — VS Code Attach to Container (local):**
Install the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension → `Cmd+Shift+P` → **"Attach to Running Container"** → select your sandbox.

**Option C — VS Code Remote SSH + Attach (remote server):**
If Docker is running on a remote host, SSH in first, then attach to the container.

1. Add an entry to your local `~/.ssh/config` so credentials forward automatically:

   ```
   Host openharness
     HostName your-server-ip
     User openharness
     ForwardAgent yes
   ```

2. In VS Code: **Remote-SSH: Connect to Host** → `openharness`
3. Once connected to the remote, **Attach to Running Container** → select your sandbox.

### 3. Onboard (one-time, inside the sandbox)

```bash
gh auth login                    # authenticate GitHub CLI
gh auth setup-git                # configure git auth (no SSH keys needed)
claude                           # authenticate Claude Code (OAuth)
```

### 4. Start working

```bash
claude                           # start an agent
```

### Cleanup

```bash
docker compose -f .devcontainer/docker-compose.yml down -v
```

---

## Configuration

Copy the example env file and edit to taste:

```bash
cp .devcontainer/.example.env .env
```

Docker Compose reads `.env` automatically from the project root.

| Variable | Default | Description |
|----------|---------|-------------|
| `SANDBOX_NAME` | `openharness` | Name for the Docker container, compose project, and CLI commands |
| `SANDBOX_PASSWORD` | `changeme` | Linux user password — only set when sshd overlay is active (SSH login) |
| `TZ` | `America/Denver` | Container timezone — affects cron schedules and log timestamps |
| `HEARTBEAT_AGENT` | `claude` | Which agent CLI runs heartbeat tasks (`claude`, `codex`, `pi`) |
| `HEARTBEAT_ACTIVE_START` | _(empty)_ | Hour (24h integer) when heartbeats start firing (e.g. `8` for 8 AM) |
| `HEARTBEAT_ACTIVE_END` | _(empty)_ | Hour (24h integer) when heartbeats stop firing (e.g. `18` for 6 PM) |
| `HOST_SSH_DIR` | _(empty)_ | Host SSH dir mounted read-only for git auth. **Setting this auto-enables the `ssh.yml` overlay.** |
| `SLACK_APP_TOKEN` | _(empty)_ | Slack Socket Mode token `xapp-...` (only with `slack.yml` overlay) |
| `SLACK_BOT_TOKEN` | _(empty)_ | Slack bot OAuth token `xoxb-...` (only with `slack.yml` overlay) |

See [Configuration docs](https://ryaneggz.github.io/open-harness/guide/configuration) for full details on each variable.

---

## Compose Overlays

Toggle optional services in `.openharness/config.json`:

```json
{
  "composeOverrides": [
    ".devcontainer/docker-compose.cloudflared.yml",
    ".devcontainer/docker-compose.docker.yml",
    ".devcontainer/docker-compose.slack.yml"
  ]
}
```

Available: `postgres`, `cloudflared`, `docker`, `git`, `ssh`, `ssh-generate`, `sshd`, `slack`. See the [overlays guide](https://ryaneggz.github.io/open-harness/guide/overlays) for details.

---

## 🛠️ CLI Commands

| Command | Description |
|---------|-------------|
| `openharness sandbox [name]` | Build and start sandbox |
| `openharness run [name]` | Start the container |
| `openharness shell <name>` | Open a bash shell |
| `openharness stop [name]` | Stop the container |
| `openharness clean [name]` | Full cleanup (containers + volumes) |
| `openharness onboard [name]` | First-time setup wizard |
| `openharness list` | List running sandboxes |
| `openharness heartbeat <action> <name>` | Manage heartbeats (sync/stop/status) |

Run `openharness` with no arguments for interactive AI agent mode.

---

## 📦 Releases

CalVer: `YYYY.M.D` (e.g. `2026.4.4`). Push a tag to build and publish to `ghcr.io/ryaneggz/open-harness`.
