# 🏗️ Open Harness

Isolated, pre-configured sandbox images for AI coding agents — [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [OpenAI Codex](https://github.com/openai/codex), [Pi Agent](https://shittycodingagent.ai), and more.

> **Spin up isolated, fully-provisioned Docker sandboxes where AI coding agents can operate with full permissions, persistent memory, and autonomous background tasks — without touching your host system.**

## ⚡ Quickstart

```bash
git clone https://github.com/ryaneggz/open-harness.git && cd open-harness
make NAME=dev quickstart        # builds, provisions, done
make NAME=dev shell             # drop into the sandbox
claude                          # start coding with AI
```

That's it. Three commands — clone, build, go.

> **Prerequisites:** [Docker](https://docs.docker.com/get-docker/) and [Make](https://www.gnu.org/software/make/). That's all you need on your host.

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
Named sandboxes (`NAME=research`, `NAME=frontend`) run simultaneously, each with its own container, workspace, and agent sessions — enabling parallel workstreams or agent-per-project setups.

---

### Key Benefits

| Benefit | Details |
|---------|---------|
| 🔒 **Host protection** | Agents run in a disposable Debian container; only the workspace directory is bind-mounted |
| 🔄 **Reproducibility** | Dockerfile + setup script = identical environment every time, on any machine |
| 🐳 **Docker-in-Docker** | `DOCKER=true` mounts the host socket so agents can build and manage containers from inside |
| 🚀 **CI/CD ready** | GitHub Actions builds and pushes to `ghcr.io/ruska-ai/open-harness` on tagged releases |
| 🧠 **Agent memory** | SOUL / MEMORY / daily-log system gives agents durable state across restarts and sessions |
| ⏰ **Unattended operation** | Heartbeat loop with active-hours gating, cost-saving empty-file detection, and auto-rotating logs |
| ⚙️ **Flexible provisioning** | Interactive mode prompts for SSH keys, Git identity, and per-agent installs; non-interactive mode uses sane defaults |
| 🔧 **Entrypoint correctness** | `entrypoint.sh` dynamically matches the container's `docker` GID to the host socket's GID, avoiding "permission denied on /var/run/docker.sock" |
| 🧩 **Per-project extensibility** | `.pi/extensions/`, `.claude/`, and `.codex/` directories live in the workspace — agents are customized per-project |
| 📦 **Shareable** | Published as a container image — teams `docker pull` a pre-provisioned sandbox instead of each developer running setup |

---

## 🚀 More Ways to Run

**Step-by-step** (if you want control over each stage):

```bash
make NAME=my-sandbox build                      # build the image
make NAME=my-sandbox run                        # start the container
make NAME=my-sandbox shell                      # open a shell as sandbox user
sudo bash ~/install/setup.sh                    # provision tools (interactive)
cd ~/workspace && claude                        # launch an agent
```

**Standalone** (no Docker, direct on any Ubuntu/Debian machine):

```bash
curl -fsSL https://raw.githubusercontent.com/ruska-ai/sandboxes/refs/heads/open-harness/install/setup.sh -o setup.sh
sudo bash setup.sh --non-interactive
```

**Docker-in-Docker** (agents can build and manage containers):

```bash
make NAME=my-sandbox DOCKER=true quickstart     # sandbox with Docker access
```

**Multiple sandboxes** (parallel workstreams):

```bash
make NAME=research quickstart
make NAME=frontend DOCKER=true quickstart       # this one gets Docker
make list                                       # see all running sandboxes
```

`make rebuild` does a full no-cache build and restart. `NAME` is required for all targets.

---

## 📁 Structure

```
├── Dockerfile               # base image: Debian Bookworm slim + sandbox user
├── docker-compose.yml       # base compose: mounts workspace/
├── docker-compose.docker.yml # Docker override: mounts socket + host networking
├── Makefile                 # build, run, shell, stop, rebuild, clean, push, list
├── install/
│   ├── setup.sh             # provisioning script (runs as root)
│   ├── heartbeat.sh         # periodic heartbeat runner (start/stop/status)
│   └── entrypoint.sh        # container entrypoint (Docker GID matching)
└── workspace/
    ├── AGENTS.md            # default instructions for all coding agents
    ├── CLAUDE.md            # symlink → AGENTS.md
    ├── HEARTBEAT.md         # periodic task checklist (agent reads each cycle)
    ├── SOUL.md              # agent persona, tone, and boundaries
    ├── MEMORY.md            # curated long-term memory
    ├── memory/              # daily append-only logs (YYYY-MM-DD.md)
    ├── .claude/             # Claude Code config directory
    └── .codex/              # Codex config directory
```

---

## ⚙️ How It Works

1. **`Dockerfile`** creates a minimal Debian image with a `sandbox` user (passwordless sudo) and bakes in:
   - `install/` copied to `/home/sandbox/install/`
   - `workspace/` copied to `/home/sandbox/workspace/`
   - Agent aliases in `.bashrc` (`claude`, `codex`, `pi`)
   - Docker group membership for the sandbox user
   - Default shell drops into `/home/sandbox/workspace`

2. **`docker-compose.yml`** bind-mounts `./workspace`. When `DOCKER=true`, the override file (`docker-compose.docker.yml`) additionally mounts the Docker socket and configures `host.docker.internal`.

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

## 🛠️ Makefile Targets

| Target | Description |
|--------|-------------|
| `make quickstart` | Build, provision, and prepare sandbox (one command) |
| `make build` | Build the Docker image |
| `make rebuild` | Full no-cache rebuild + restart |
| `make run` | Start the container (detached) |
| `make shell` | Open a bash shell as `sandbox` user |
| `make stop` | Stop the container |
| `make clean` | Stop and remove the local image |
| `make push` | Push image to ghcr.io/ruska-ai |
| `make list` | List all running sandboxes |
| `make all` | Build + push |
| `make heartbeat` | Start the heartbeat loop (background) |
| `make heartbeat-stop` | Stop the heartbeat loop |
| `make heartbeat-status` | Show heartbeat status and recent logs |

`NAME` is required for all targets. Pass `DOCKER=true` to enable Docker socket access.

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
| `HEARTBEAT.md` | Periodic task checklist | User |
| `memory/YYYY-MM-DD.md` | Daily append-only logs | Agent |

### 📝 How Memory Works

Agents are instructed to:
1. **Read `MEMORY.md` at session start** for accumulated context
2. **Append to `memory/YYYY-MM-DD.md`** during work (notable events, decisions, learnings)
3. **Distill daily logs into `MEMORY.md`** periodically (during heartbeats or when asked)
4. **Write to `MEMORY.md` immediately** when the user says "remember this"

`SOUL.md` defines the agent's persona and boundaries. The agent may evolve it over time but must tell the user when it does.

### 💓 Heartbeat

```bash
make NAME=my-sandbox heartbeat                              # default: 30 min interval
make NAME=my-sandbox HEARTBEAT_INTERVAL=600 run             # 10 min interval (set at container start)
make NAME=my-sandbox heartbeat-status                       # check status + recent logs
make NAME=my-sandbox heartbeat-stop                         # stop the loop
```

**Configuration** (env vars, set at `make run` or in `docker-compose.yml`):

| Variable | Default | Description |
|----------|---------|-------------|
| `HEARTBEAT_INTERVAL` | `1800` | Seconds between cycles |
| `HEARTBEAT_ACTIVE_START` | _(unset)_ | Hour to start (0-23) |
| `HEARTBEAT_ACTIVE_END` | _(unset)_ | Hour to stop (0-23) |
| `HEARTBEAT_AGENT` | `pi` | Primary agent CLI to invoke |
| `HEARTBEAT_FALLBACK` | `claude codex` | Space-separated fallback agents (tried in order if primary fails) |

If `HEARTBEAT.md` contains only headers or comments, the cycle is skipped (saves API costs). If the agent has nothing to report, it replies `HEARTBEAT_OK` and the response is suppressed.

---

## 💻 Usage Examples

Once inside the sandbox (`make shell`), use any installed coding agent:

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

Tag format: `oh-v<version>` (e.g. `oh-v1.0.0`)

```bash
git tag oh-v1.0.0
git push origin oh-v1.0.0
```

This triggers the CI workflow which builds and pushes:
- `ghcr.io/ruska-ai/open-harness:v1.0.0`
- `ghcr.io/ruska-ai/open-harness:latest`
