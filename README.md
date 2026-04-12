# Open Harness

Isolated, pre-configured sandbox containers for AI coding agents — [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [OpenAI Codex](https://github.com/openai/codex), [Pi Agent](https://shittycodingagent.ai), and more.

> **Spin up a fully-provisioned Dev Container where AI coding agents can operate with full permissions, persistent memory, and autonomous background tasks — without touching your host system.**

[Full documentation](https://ryaneggz.github.io/open-harness/)

## Quickstart

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) and [Node.js](https://nodejs.org/) (v20+).

### 1. Install the CLI

```bash
curl -fsSL https://raw.githubusercontent.com/ryaneggz/open-harness/refs/heads/main/install.sh | bash
```

### 2. Start the sandbox

**Option A — VS Code (recommended):**
Open the repo in VS Code → `Cmd+Shift+P` → **"Reopen in Container"**

**Option B — CLI:**
```bash
openharness quickstart
```

**Option C — Manual:**
```bash
docker compose -f .devcontainer/docker-compose.yml up -d --build
```

### 3. Onboard (one-time)

```bash
openharness onboard
```

Walks through 4 steps:
1. **SSH key** — generate or verify, add to GitHub
2. **GitHub CLI** — `gh auth login`
3. **Cloudflare tunnel** — optional, for public URLs
4. **Claude Code** — OAuth credential setup

### 4. Start working

```bash
openharness shell open-harness   # enter the sandbox
claude                           # start an agent
```

| Field | Value |
|-------|-------|
| User | `sandbox` |
| Password | `test1234` |
| SSH Port | `2222` |

### Cleanup

```bash
openharness clean                # containers + volumes
```

---

## Compose Overlays

Toggle optional services in `.openharness/config.json`:

```json
{
  "composeOverrides": [
    ".devcontainer/docker-compose.cloudflared.yml",
    ".devcontainer/docker-compose.docker.yml",
    ".devcontainer/docker-compose.mom.yml",
    ".devcontainer/docker-compose.ssh-generate.yml"
  ]
}
```

Available: `postgres`, `cloudflared`, `docker`, `git`, `ssh`, `ssh-generate`, `mom`. See the [overlays guide](https://ryaneggz.github.io/open-harness/guide/overlays) for details.

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `openharness quickstart [name]` | Build and start sandbox |
| `openharness run [name]` | Start the container |
| `openharness shell <name>` | Open a bash shell |
| `openharness stop [name]` | Stop the container |
| `openharness clean [name]` | Full cleanup (containers + volumes) |
| `openharness onboard [name]` | First-time setup wizard |
| `openharness list` | List running sandboxes |
| `openharness heartbeat <action> <name>` | Manage heartbeats (sync/stop/status) |

Run `openharness` with no arguments for interactive AI agent mode.

---

## Releases

CalVer: `YYYY.M.D` (e.g. `2026.4.4`). Push a tag to build and publish to `ghcr.io/ryaneggz/open-harness`.
