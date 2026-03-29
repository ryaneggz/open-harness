# 🏗️ Open Harness

Isolated, pre-configured sandbox images for AI coding agents — [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [OpenAI Codex](https://github.com/openai/codex), [Pi Agent](https://shittycodingagent.ai), and more.

> **Spin up isolated, fully-provisioned Docker sandboxes where AI coding agents can operate with full permissions, persistent memory, and autonomous background tasks — without touching your host system.**

## ⚡ Quickstart

1. [**Fork this repo**](https://github.com/ryaneggz/open-harness/fork)
2. Clone, build, go:

The repo root is the default project workspace scaffold, so users can clone it and start directly inside the sandbox without first creating a separate nested workspace.

```bash
git clone https://github.com/<your-username>/open-harness.git && cd open-harness
./setup/oh install             # installs `oh` globally when possible, otherwise offers ~/.local/bin fallback
oh create dev -i               # auto-bootstraps the supervisor sandbox, then builds/provisions your sandbox
oh shell dev                   # drop into the sandbox
claude                         # start coding with AI
```

> **Prerequisites:** [Docker](https://docs.docker.com/get-docker/) and [Make](https://www.gnu.org/software/make/). That's all you need on your host.

---

## 🎯 Why Open Harness?

AI coding agents are powerful — but they run with broad system permissions, execute arbitrary code, and need a full development toolchain. Open Harness solves the tension between giving agents the freedom they need and keeping your host machine safe.

### Core Intentions

#### 1. **Isolation & Safety**
Agents run `--dangerously-skip-permissions` by default — inside disposable Docker containers. The host now only needs to bootstrap a tiny `oh` shim plus a supervisor sandbox; all project orchestration then happens from inside that supervisor. User sandboxes can `rm -rf`, install packages, and spawn processes without any risk to your host machine. The full project directory is bind-mounted at `/workspace`; the sandbox user's home stays clean and container-local.

#### 2. **Zero-to-Agent in Minutes**
One provisioning script (`setup/install/setup.sh`) installs Node.js, Bun, uv, Docker CLI, GitHub CLI, ripgrep, tmux, and whichever agents you choose — interactively or fully unattended with `--non-interactive`. No more "install 15 things" friction.

#### 3. **Agent-Agnostic**
Not a wrapper for one tool. The same sandbox runs Claude Code, Codex, and Pi Agent side by side, sharing project files and context. `AGENTS.md` is symlinked to `CLAUDE.md` so every agent reads the same instructions.

#### 4. **Persistent Identity**
`SOUL.md`, `MEMORY.md`, and daily logs (`memory/YYYY-MM-DD.md`) give agents continuity across sessions — not ephemeral chat windows, but persistent collaborators that remember decisions, preferences, and lessons learned.

#### 5. **Autonomous Background Work**
The heartbeat system (`setup/install/heartbeat.sh` + `heartbeats.conf` + `heartbeats/*.md`) lets agents wake on a timer, perform tasks from a user-authored checklist, and go back to sleep — turning reactive tools into proactive workers that can monitor, maintain, and report without human presence.

#### 6. **Multi-Sandbox Parallelism**
Named sandboxes (`NAME=research`, `NAME=frontend`) run simultaneously, each with its own container, mounted project root, and agent sessions — enabling parallel workstreams or agent-per-project setups.

---

### Key Benefits

| Benefit | Details |
|---------|---------|
| 🔒 **Host protection** | Agents run in a disposable Debian container; the full project is bind-mounted at `/workspace` while `~/` remains container-local |
| 🔄 **Reproducibility** | `setup/docker/Dockerfile` + setup script = identical environment every time, on any machine |
| 🐳 **Docker-in-Docker** | `DOCKER=true` mounts the host socket so agents can build and manage containers from inside |
| 🚀 **CI/CD ready** | GitHub Actions builds and pushes to `ghcr.io/ryaneggz/open-harness` on tagged releases |
| 🧠 **Agent memory** | SOUL / MEMORY / daily-log system gives agents durable state across restarts and sessions |
| ⏰ **Unattended operation** | Cron-scheduled heartbeats with multiple files/intervals, active-hours gating, cost-saving empty-file detection, and auto-rotating logs |
| ⚙️ **Flexible provisioning** | Interactive mode prompts for SSH keys, Git identity, and per-agent installs; non-interactive mode uses sane defaults |
| 🔧 **Entrypoint correctness** | `entrypoint.sh` dynamically matches the container's `docker` GID to the host socket's GID, avoiding "permission denied on /var/run/docker.sock" |
| 🧩 **Per-project extensibility** | `.pi/extensions/`, `.claude/`, and `.codex/` directories live at the project root — agents are customized per-project |
| 📦 **Shareable** | Published as a container image — teams `docker pull` a pre-provisioned sandbox instead of each developer running setup |

---

## 🚀 More Ways to Run

**CLI-first** (recommended):

```bash
./setup/oh install             # global if possible, otherwise user-local fallback
oh create my-sandbox -i        # auto-starts the supervisor, then prompts for sandbox options
oh shell my-sandbox
```

By default, `oh create <name>` uses a git worktree under `.worktrees/<name>`. If you pass `-w /some/path` (or choose one in `-i` mode), that host path is mounted at `/workspace` instead.

**Step-by-step** (if you want control over each stage):

```bash
make NAME=my-sandbox build                      # build the image
make NAME=my-sandbox run                        # start the container
make NAME=my-sandbox shell                      # open a login shell in /workspace
sudo bash /opt/open-harness/install/setup.sh    # provision tools (interactive)
cd /workspace && claude                         # launch an agent
```

**Standalone** (no Docker, direct on any Ubuntu/Debian machine):

```bash
curl -fsSL https://raw.githubusercontent.com/ryaneggz/open-harness/refs/heads/main/setup/install/setup.sh -o setup.sh
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
├── AGENTS.md                # default instructions for all coding agents
├── CLAUDE.md                # symlink → AGENTS.md
├── SOUL.md                  # agent persona, tone, and boundaries
├── MEMORY.md                # curated long-term memory
├── heartbeats.conf          # heartbeat schedule config (cron expressions)
├── heartbeats/              # heartbeat task .md files (default.md, etc.)
├── memory/                  # daily append-only logs (YYYY-MM-DD.md), scaffolded with .gitkeep and ignored by default
├── .claude/                 # Claude Code config + agents/skills/
├── .codex/                  # Codex config (symlink or directory)
├── .pi/                     # Pi extensions/config
├── ...                      # your actual project files live here too
├── Makefile                 # thin entrypoint that includes setup/Makefile
└── setup/
    ├── oh                   # host-side CLI entrypoint (`oh`)
    ├── Makefile             # build, run, shell, stop, rebuild, clean, push, list
    ├── docker/
    │   ├── Dockerfile           # base image: Debian Bookworm slim + sandbox user
    │   ├── docker-compose.yml   # base compose: mounts the full project at /workspace
    │   └── docker-compose.docker.yml # Docker override: mounts socket + host networking
    └── install/
        ├── setup.sh             # provisioning script source (copied into image)
        ├── heartbeat.sh         # cron-based heartbeat runner (sync/run/stop/status)
        └── entrypoint.sh        # container entrypoint (Docker GID matching + cron start)
```

---

## ⚙️ How It Works

1. **`setup/oh`** is a tiny host-side shim. It installs the CLI, bootstraps the supervisor sandbox, and proxies sandbox lifecycle commands into that supervisor.

2. **The supervisor sandbox** mounts the repo at the same absolute host path plus the Docker socket, so it can create worktrees, build images, and orchestrate user sandboxes without running project logic directly on the host.

3. **`setup/docker/Dockerfile`** creates a minimal Debian image with a `sandbox` user (passwordless sudo) and bakes in:
   - `setup/install/` copied to `/opt/open-harness/install/` for runtime use
   - Agent aliases in `.bashrc` (`claude`, `codex`, `pi`)
   - Docker group membership for the sandbox user
   - Clean `~/` for user state, with the project mounted separately at `/workspace`

4. **`setup/docker/docker-compose.yml`** bind-mounts the selected host workspace to `/workspace`. By default that is the sandbox worktree; the `oh` CLI can also point it at any external path. When `DOCKER=true`, the override file (`setup/docker/docker-compose.docker.yml`) additionally mounts the Docker socket and configures `host.docker.internal`.

5. **`setup/install/setup.sh`** provisions all tools system-wide (as root):
   - Node.js 22.x, npm, tmux, nano, ripgrep, jq (always)
   - Docker CLI + Compose plugin (always)
   - GitHub CLI (always)
   - Bun, uv (always)
   - Claude Code CLI (default yes)
   - OpenAI Codex, Pi Agent, AgentMail CLI (opt-in)
   - agent-browser + Chromium (default yes)

6. **`AGENTS.md`** in the project root provides default context to all coding agents. `CLAUDE.md` is a symlink to it — editing either updates both.

---

## 🛠️ Makefile Targets

| Target | Description |
|--------|-------------|
| `make install-cli` | Install the `oh` CLI (global if possible, otherwise user-local) |
| `make quickstart` | Internal sandbox build/provision target used by the supervisor |
| `make build` | Build the Docker image |
| `make rebuild` | Full no-cache rebuild + restart |
| `make run` | Start the container (detached) |
| `make shell` | Open a login shell as `sandbox` in `/workspace` |
| `make stop` | Stop the container |
| `make clean` | Stop and remove the local image |
| `make push` | Push image to ghcr.io/ryaneggz |
| `make list` | List all running sandboxes |
| `make all` | Build + push |
| `make heartbeat` | Sync heartbeat cron schedules from `heartbeats.conf` |
| `make heartbeat-stop` | Remove all heartbeat cron schedules |
| `make heartbeat-status` | Show heartbeat schedules and recent logs |
| `make heartbeat-migrate` | Convert legacy `HEARTBEAT_INTERVAL` to `heartbeats.conf` |

`NAME` is required for all sandbox targets. Pass `DOCKER=true` to enable Docker socket access. Pass `WORKSPACE=/host/path` to mount an external workspace instead of creating a git worktree. In normal use, prefer `oh ...` so the supervisor handles these from inside a sandboxed control plane.

---

## 🔧 Configuration

The setup script supports interactive and non-interactive modes:

```bash
# Interactive (prompts for each option)
sudo bash /opt/open-harness/install/setup.sh

# Non-interactive (installs everything with defaults)
sudo bash /opt/open-harness/install/setup.sh --non-interactive
```

Interactive mode prompts for: SSH public key, Git identity, GitHub token, Claude Code, Codex, Pi Agent, AgentMail (with API key), agent-browser.

---

## 🧠 Heartbeat, Soul & Memory

These project-root files and directories give agents persistent identity and periodic task execution:

| File | Purpose | Authored by |
|------|---------|-------------|
| `SOUL.md` | Agent persona, tone, boundaries | User (seeded with template) |
| `MEMORY.md` | Curated long-term memory | Agent (distilled from daily logs) |
| `heartbeats.conf` | Heartbeat schedule config (cron → file mapping) | User |
| `heartbeats/*.md` | Heartbeat task files (`default.md`, etc.) | User |
| `memory/YYYY-MM-DD.md` | Daily append-only logs (directory is scaffolded and log contents are ignored by default) | Agent |

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
make NAME=my-sandbox heartbeat                              # sync schedules from heartbeats.conf
make NAME=my-sandbox heartbeat-status                       # show schedules + recent logs
make NAME=my-sandbox heartbeat-stop                         # remove all schedules
make NAME=my-sandbox heartbeat-migrate                      # convert legacy HEARTBEAT_INTERVAL to conf
```

**Schedule config** (`heartbeats.conf` in the project root):

```
# Format: <cron> | <file> | [agent] | [active_start-active_end]
*/30 * * * * | heartbeats/default.md
*/15 * * * * | heartbeats/check-deployments.md | claude | 9-18
0 */4 * * *  | heartbeats/memory-distill.md
0 20 * * *   | heartbeats/daily-summary.md
```

Schedules auto-sync on container startup. Edit `heartbeats.conf`, then run `make heartbeat` to apply changes.

**Global defaults** (env vars, set at `make run` or in `setup/docker/docker-compose.yml`):

| Variable | Default | Description |
|----------|---------|-------------|
| `HEARTBEAT_ACTIVE_START` | _(unset)_ | Default active hour start (0-23) |
| `HEARTBEAT_ACTIVE_END` | _(unset)_ | Default active hour end (0-23) |
| `HEARTBEAT_AGENT` | `claude` | Default agent CLI to invoke |

Per-entry overrides for agent and active hours can be set in `heartbeats.conf`.

If a heartbeat file contains only headers or comments, that execution is skipped (saves API costs). If the agent has nothing to report, it replies `HEARTBEAT_OK` and the response is suppressed.

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
- `ghcr.io/ryaneggz/open-harness:v1.0.0`
- `ghcr.io/ryaneggz/open-harness:latest`
