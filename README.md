# Open Harness

Isolated, pre-configured sandbox images for AI coding agents — [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [OpenAI Codex](https://github.com/openai/codex), [Pi Agent](https://shittycodingagent.ai), and more.

## Install (standalone)

Run the setup script directly on any Ubuntu/Debian machine:

```bash
# curl
curl -fsSL https://raw.githubusercontent.com/ruska-ai/sandboxes/refs/heads/open-harness/install/setup.sh -o setup.sh

# wget
wget -qO setup.sh https://raw.githubusercontent.com/ruska-ai/sandboxes/refs/heads/open-harness/install/setup.sh

sudo bash setup.sh --non-interactive
```

## Docker Quick Start

```bash
make NAME=my-sandbox build                      # build the image
make NAME=my-sandbox run                        # start the container
make NAME=my-sandbox shell                      # open a shell as sandbox user
sudo bash ~/install/setup.sh                    # provision tools (interactive)
cd ~/workspace && claude                        # launch an agent
```

Enable Docker-in-Docker (mounts host Docker socket):

```bash
make NAME=my-sandbox DOCKER=true run            # sandbox with Docker access
```

Run multiple named sandboxes side by side:

```bash
make NAME=research build run
make NAME=frontend DOCKER=true build run        # this one gets Docker
make list                                       # see all running sandboxes
```

`make rebuild` does a full no-cache build and restart. `NAME` is required for all targets.

## Structure

```
├── Dockerfile               # base image: Debian Bookworm slim + sandbox user
├── docker-compose.yml       # base compose: mounts workspace/
├── docker-compose.docker.yml # Docker override: mounts socket + host networking
├── Makefile                 # build, run, shell, stop, rebuild, clean, push, list
├── install/
│   └── setup.sh             # provisioning script (runs as root)
└── workspace/
    ├── AGENTS.md            # default instructions for all coding agents
    ├── CLAUDE.md            # symlink → AGENTS.md
    ├── .claude/             # Claude Code config directory
    └── .codex/              # Codex config directory
```

## How It Works

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

## Makefile Targets

| Target | Description |
|--------|-------------|
| `make build` | Build the Docker image |
| `make rebuild` | Full no-cache rebuild + restart |
| `make run` | Start the container (detached) |
| `make shell` | Open a bash shell as `sandbox` user |
| `make stop` | Stop the container |
| `make clean` | Stop and remove the local image |
| `make push` | Push image to ghcr.io/ruska-ai |
| `make list` | List all running sandboxes |
| `make all` | Build + push |

`NAME` is required for all targets. Pass `DOCKER=true` to enable Docker socket access.

## Configuration

The setup script supports interactive and non-interactive modes:

```bash
# Interactive (prompts for each option)
sudo bash ~/install/setup.sh

# Non-interactive (installs everything with defaults)
sudo bash ~/install/setup.sh --non-interactive
```

Interactive mode prompts for: SSH public key, Git identity, GitHub token, Claude Code, Codex, Pi Agent, AgentMail (with API key), agent-browser.

## Usage Examples

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

## Releases

Tag format: `oh-v<version>` (e.g. `oh-v1.0.0`)

```bash
git tag oh-v1.0.0
git push origin oh-v1.0.0
```

This triggers the CI workflow which builds and pushes:
- `ghcr.io/ruska-ai/open-harness:v1.0.0`
- `ghcr.io/ruska-ai/open-harness:latest`
