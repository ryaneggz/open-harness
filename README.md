# 🏗️ Open Harness

Isolated, pre-configured sandbox images for AI coding agents — [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [OpenAI Codex](https://github.com/openai/codex), [Pi Agent](https://shittycodingagent.ai), and more.

> **Spin up isolated, fully-provisioned Docker sandboxes where AI coding agents can operate with full permissions, persistent memory, and autonomous background tasks — without touching your host system.**

## ⚡ Quickstart

1. [**Fork this repo**](https://github.com/ryaneggz/open-harness/fork) and clone it:

```bash
git clone https://github.com/ryaneggz/open-harness.git && cd open-harness
```

2. Install the `openharness` CLI:

```bash
cd cli && npm install && npm run build && npm link && cd ..
cd packages/sandbox && npm install && npm run build && cd ..
openharness install @openharness/sandbox
```

3. Start Claude at the project root **in plan mode**:

```bash
claude --permission-mode plan
```

4. Tell it which agent to build. Try the **portfolio manager**:

```
Set up a portfolio-mgr agent that creates a mock $100K portfolio using Ray Dalio's All Weather strategy with yfinance data and web search sentiment analysis
```

Claude will ask about the agent's role, tools, heartbeat schedule, and any customizations. Once you approve the plan, it provisions the sandbox end-to-end.

5. Enter the sandbox and start working:

```bash
openharness shell portfolio-mgr    # enter the sandbox
claude                             # start working
```

> **Prerequisites:** [Docker](https://docs.docker.com/get-docker/) and [Node.js](https://nodejs.org/) (v20+). That's all you need on your host.

### More example agents

| Prompt | What it builds |
|--------|---------------|
| _"Set up a blog-writer agent"_ | Writes blog posts for your website, creates PRs with drafts, and generates LinkedIn & X.com posts for manual promotion |
| _"Set up an uptime-monitor agent"_ | Checks your URLs every 30 minutes for availability and response time, files GitHub issues on downtime, generates weekly SLA reports |

### Cleanup

```bash
openharness clean portfolio-mgr    # full teardown (container + image + worktree)
openharness list                   # see what's still running
```

---

## 🎯 Why Open Harness?

AI coding agents are powerful — but they run with broad system permissions, execute arbitrary code, and need a full development toolchain. Open Harness solves the tension between giving agents the freedom they need and keeping your host machine safe.

### Core Intentions

#### 1. **Isolation & Safety**
Agents run `--dangerously-skip-permissions` by default — inside a disposable Docker container. They can `rm -rf`, install packages, and spawn processes without any risk to your host machine. The workspace directory is the only thing bind-mounted; everything else is ephemeral.

#### 2. **Zero-to-Agent in Minutes**
One provisioning script (`install/setup.sh`) installs Node.js, Bun, uv, Docker CLI, GitHub CLI, ripgrep, tmux, and whichever agents you choose — interactively or fully unattended with `--non-interactive`. No more "install 15 things" friction.

#### 3. **Agent-Agnostic**
Not a wrapper for one tool. The same sandbox runs Claude Code, Codex, and Pi Agent side by side, sharing workspace files and context. `AGENTS.md` is symlinked to `CLAUDE.md` so every agent reads the same instructions.

#### 4. **Persistent Identity**
`SOUL.md`, `MEMORY.md`, and daily logs (`memory/YYYY-MM-DD.md`) give agents continuity across sessions — not ephemeral chat windows, but persistent collaborators that remember decisions, preferences, and lessons learned.

#### 5. **Autonomous Background Work**
The heartbeat system (`install/heartbeat.sh` + `HEARTBEAT.md`) lets agents wake on a timer, perform tasks from a user-authored checklist, and go back to sleep — turning reactive tools into proactive workers that can monitor, maintain, and report without human presence.

#### 6. **Multi-Sandbox Parallelism**
Named sandboxes (`research`, `frontend`) run simultaneously, each with its own container, workspace, and agent sessions — enabling parallel workstreams or agent-per-project setups.

---

### Key Benefits

| Benefit | Details |
|---------|---------|
| 🔒 **Host protection** | Agents run in a disposable Debian container; only the workspace directory is bind-mounted |
| 🔄 **Reproducibility** | `docker/Dockerfile` + setup script = identical environment every time, on any machine |
| 🐳 **Docker-in-Docker** | `--docker` flag mounts the host socket so agents can build and manage containers from inside |
| 🚀 **CI/CD ready** | GitHub Actions builds and pushes to `ghcr.io/ryaneggz/open-harness` on tagged releases |
| 🧠 **Agent memory** | SOUL / MEMORY / daily-log system gives agents durable state across restarts and sessions |
| ⏰ **Unattended operation** | Cron-scheduled heartbeats with multiple files/intervals, active-hours gating, cost-saving empty-file detection, and auto-rotating logs |
| ⚙️ **Flexible provisioning** | Interactive mode prompts for SSH keys, Git identity, and per-agent installs; non-interactive mode uses sane defaults |
| 🔧 **Entrypoint correctness** | `entrypoint.sh` dynamically matches the container's `docker` GID to the host socket's GID, avoiding "permission denied on /var/run/docker.sock" |
| 🧩 **Per-project extensibility** | `.openharness/extensions/`, `.claude/`, and `.codex/` directories live in the workspace — agents are customized per-project |
| 📦 **Shareable** | Published as a container image — teams `docker pull` a pre-provisioned sandbox instead of each developer running setup |

---

## 🚀 More Ways to Run

**Step-by-step** (if you want control over each stage):

```bash
openharness build my-sandbox                      # build the image
openharness run my-sandbox                        # start the container
openharness shell my-sandbox                      # open a shell as sandbox user
sudo bash ~/install/setup.sh                      # provision tools (interactive)
cd ~/workspace && claude                          # launch an agent
```

**Standalone** (no Docker, direct on any Ubuntu/Debian machine):

```bash
curl -fsSL https://raw.githubusercontent.com/ryaneggz/open-harness/refs/heads/main/install/setup.sh -o setup.sh
sudo bash setup.sh --non-interactive
```

**Docker-in-Docker** (agents can build and manage containers):

```bash
openharness quickstart my-sandbox --docker        # sandbox with Docker access
```

**Multiple sandboxes** (parallel workstreams):

```bash
openharness quickstart research
openharness quickstart frontend --docker          # this one gets Docker
openharness list                                  # see all running sandboxes
```

`openharness rebuild <name>` does a full no-cache rebuild and restart.

---

## 🖥️ Orchestrator Dev Container (Recommended)

> **Optional but recommended.** Adds an isolation layer for the orchestrator itself — if an agent escapes its sandbox, it hits the orchestrator container, not your host. Also gives you a reproducible dev environment across machines. You can skip this and run the orchestrator bare-metal with just Docker installed.

The project includes a `.devcontainer/` setup that wraps the entire project root in an SSH-accessible container with all orchestrator tools pre-installed.

### Quick Setup

**Option 1 — VS Code Dev Containers** (recommended):

Open the project in VS Code and select **"Reopen in Container"** from the Command Palette. The Dev Containers extension handles everything automatically.

**Option 2 — Manual compose + SSH**:

```bash
docker compose -f .devcontainer/docker-compose.yml up -d
ssh orchestrator@localhost -p 2222   # password: test1234
```

### Credentials

| Field | Value |
|-------|-------|
| User | `orchestrator` |
| Password (SSH + sudo) | `test1234` |
| SSH Port | `2222` |

### VS Code Remote-SSH Config

Add to `~/.ssh/config` on your host:

```
Host orchestrator
    HostName localhost
    Port 2222
    User orchestrator
```

Then connect via **Remote-SSH: Connect to Host...** → `orchestrator`.

### Usage Inside the Container

The same `openharness` CLI workflow works inside the container:

```bash
openharness quickstart my-agent      # provision a new sandbox
openharness shell my-agent           # enter a sandbox
openharness list                     # see running sandboxes
```

### Teardown

```bash
docker compose -f .devcontainer/docker-compose.yml down
```

---

## 📁 Structure

```
├── .devcontainer/
│   ├── devcontainer.json    # VS Code Dev Container config
│   ├── Dockerfile           # orchestrator image: SSH + dev tools
│   ├── docker-compose.yml   # orchestrator compose (port 2222, Docker socket)
│   └── entrypoint.sh        # Docker GID matching entrypoint
├── docker/
│   ├── Dockerfile           # base image: Debian Bookworm slim + sandbox user
│   ├── docker-compose.yml   # base compose: mounts workspace/
│   └── docker-compose.docker.yml # Docker override: mounts socket + host networking
├── cli/                     # openharness CLI (sandbox orchestration)
├── packages/sandbox/        # @openharness/sandbox (Docker + worktree tools)
├── install/
│   ├── setup.sh             # provisioning script (runs as root)
│   ├── heartbeat.sh         # cron-based heartbeat runner (sync/run/stop/status)
│   └── entrypoint.sh        # container entrypoint (Docker GID matching + cron start)
└── workspace/
    ├── AGENTS.md            # default instructions for all coding agents
    ├── CLAUDE.md            # symlink → AGENTS.md
    ├── heartbeats.conf      # heartbeat schedule config (cron expressions)
    ├── heartbeats/          # heartbeat task .md files (default.md, etc.)
    ├── SOUL.md              # agent persona, tone, and boundaries
    ├── MEMORY.md            # curated long-term memory
    ├── memory/              # daily append-only logs (YYYY-MM-DD.md)
    ├── .claude/             # Claude Code config directory
    └── .codex/              # Codex config directory
```

---

## ⚙️ How It Works

1. **`docker/Dockerfile`** creates a minimal Debian image with a `sandbox` user (passwordless sudo) and bakes in:
   - `install/` copied to `/home/sandbox/install/`
   - `workspace/` copied to `/home/sandbox/workspace/`
   - Agent aliases in `.bashrc` (`claude`, `codex`, `pi`)
   - Docker group membership for the sandbox user
   - Default shell drops into `/home/sandbox/workspace`

2. **`docker/docker-compose.yml`** bind-mounts `./workspace`. When `DOCKER=true`, the override file (`docker/docker-compose.docker.yml`) additionally mounts the Docker socket and configures `host.docker.internal`.

3. **`install/setup.sh`** provisions all tools system-wide (as root):
   - Node.js 22.x, npm, tmux, nano, ripgrep, jq (always)
   - Docker CLI + Compose plugin (always)
   - GitHub CLI (always)
   - Bun, uv (always)
   - Claude Code CLI (default yes)
   - OpenAI Codex, Pi Agent, AgentMail CLI (opt-in)
   - agent-browser + Chromium (default yes)

4. **`workspace/AGENTS.md`** provides default context to all coding agents. `CLAUDE.md` is a symlink to it — editing either updates both.

---

## 🛠️ CLI Commands

| Command | Description |
|---------|-------------|
| `openharness quickstart <name>` | Build, provision, and prepare sandbox (one command) |
| `openharness build <name>` | Build the Docker image |
| `openharness rebuild <name>` | Full no-cache rebuild + restart |
| `openharness run <name>` | Start the container (detached) |
| `openharness shell <name>` | Open a bash shell as `sandbox` user |
| `openharness stop <name>` | Stop the container |
| `openharness clean <name>` | Full cleanup (container + image + worktree) |
| `openharness push <name>` | Push image to ghcr.io/ryaneggz |
| `openharness list` | List all running sandboxes |
| `openharness heartbeat sync <name>` | Sync heartbeat cron schedules from `heartbeats.conf` |
| `openharness heartbeat stop <name>` | Remove all heartbeat cron schedules |
| `openharness heartbeat status <name>` | Show heartbeat schedules and recent logs |
| `openharness heartbeat migrate <name>` | Convert legacy `HEARTBEAT_INTERVAL` to `heartbeats.conf` |

Pass `--docker` to enable Docker socket access. Pass `--base-branch <branch>` to set the base branch for worktrees.

Run `openharness` with no arguments to launch the interactive AI agent mode.

---

## 🔧 Configuration

The setup script supports interactive and non-interactive modes:

```bash
# Interactive (prompts for each option)
sudo bash ~/install/setup.sh

# Non-interactive (installs everything with defaults)
sudo bash ~/install/setup.sh --non-interactive
```

Interactive mode prompts for: SSH public key, Git identity, GitHub token, Claude Code, Codex, Pi Agent, AgentMail (with API key), agent-browser.

---

## 🧠 Heartbeat, Soul & Memory

Three workspace files give agents persistent identity and periodic task execution:

| File | Purpose | Authored by |
|------|---------|-------------|
| `SOUL.md` | Agent persona, tone, boundaries | User (seeded with template) |
| `MEMORY.md` | Curated long-term memory | Agent (distilled from daily logs) |
| `heartbeats.conf` | Heartbeat schedule config (cron → file mapping) | User |
| `heartbeats/*.md` | Heartbeat task files (`default.md`, etc.) | User |
| `memory/YYYY-MM-DD.md` | Daily append-only logs | Agent |

### 📝 How Memory Works

Agents are instructed to:
1. **Read `MEMORY.md` at session start** for accumulated context
2. **Append to `memory/YYYY-MM-DD.md`** during work (notable events, decisions, learnings)
3. **Distill daily logs into `MEMORY.md`** periodically (during heartbeats or when asked)
4. **Write to `MEMORY.md` immediately** when the user says "remember this"

`SOUL.md` defines the agent's persona and boundaries. The agent may evolve it over time but must tell the user when it does.

### 💓 Heartbeat

Heartbeats are cron-scheduled tasks. Each heartbeat is a `.md` file with instructions for the agent, mapped to a cron schedule in `heartbeats.conf`.

```bash
openharness heartbeat sync my-sandbox                        # sync schedules from heartbeats.conf
openharness heartbeat status my-sandbox                      # show schedules + recent logs
openharness heartbeat stop my-sandbox                        # remove all schedules
openharness heartbeat migrate my-sandbox                     # convert legacy HEARTBEAT_INTERVAL to conf
```

**Schedule config** (`workspace/heartbeats.conf`):

```
# Format: <cron> | <file> | [agent] | [active_start-active_end]
*/30 * * * * | heartbeats/default.md
*/15 * * * * | heartbeats/check-deployments.md | claude | 9-18
0 */4 * * *  | heartbeats/memory-distill.md
0 20 * * *   | heartbeats/daily-summary.md
```

Schedules auto-sync on container startup. Edit `heartbeats.conf`, then run `openharness heartbeat sync <name>` to apply changes.

**Global defaults** (env vars, set in `docker/docker-compose.yml`):

| Variable | Default | Description |
|----------|---------|-------------|
| `HEARTBEAT_ACTIVE_START` | _(unset)_ | Default active hour start (0-23) |
| `HEARTBEAT_ACTIVE_END` | _(unset)_ | Default active hour end (0-23) |
| `HEARTBEAT_AGENT` | `claude` | Default agent CLI to invoke |

Per-entry overrides for agent and active hours can be set in `heartbeats.conf`.

If a heartbeat file contains only headers or comments, that execution is skipped (saves API costs). If the agent has nothing to report, it replies `HEARTBEAT_OK` and the response is suppressed.

---

## 💻 Usage Examples

Once inside the sandbox (`openharness shell <name>`), use any installed coding agent:

```bash
# Claude Code
claude -p "Create a Python CLI app with click that fetches weather data"

# OpenAI Codex
codex "Write a bash script that finds all files larger than 10MB"

# Pi Agent
pi -p "Refactor main.py to use async/await"

# Claude Code loop tasks
/loop 2m append the current system time to output.txt
```

---

## 📦 Releases

Tag format: `YYYY.M.D` (e.g. `2026.4.4`). For multiple releases on the same day, append an increment key: `2026.4.4-1`, `2026.4.4-2`.

```bash
git tag 2026.4.4
git push origin 2026.4.4
```

This triggers the build workflow which builds and pushes:
- `ghcr.io/ryaneggz/open-harness:2026.4.4`
- `ghcr.io/ryaneggz/open-harness:latest`
