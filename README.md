# Claude Code Sandboxes

Isolated, pre-configured sandbox images for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) agents.

## Install (standalone)

Run the setup script directly on any Ubuntu/Debian machine:

```bash
# curl
curl -fsSL https://raw.githubusercontent.com/ruska-ai/sandboxes/refs/heads/claude-code/install/setup.sh -o setup.sh

# wget
wget -qO setup.sh https://raw.githubusercontent.com/ruska-ai/sandboxes/refs/heads/claude-code/install/setup.sh

sudo bash setup.sh --non-interactive
```

## Docker Quick Start

```bash
make build                                      # build the image
make run                                        # start the container
make shell                                      # open a shell as sandbox user
sudo bash ~/install/setup.sh --non-interactive  # provision tools
cd ~/workspace && claude                        # launch Claude Code
```

`make rebuild` does a full no-cache build and restart.

## Structure

```
├── Dockerfile               # base image: Debian Bookworm slim + sandbox user
├── docker-compose.yml       # mounts workspace/ as shared volume
├── Makefile                 # build, run, shell, stop, rebuild, clean, push
├── install/
│   └── setup.sh             # provisioning script (runs as root)
└── workspace/
    └── CLAUDE.md            # default instructions for Claude Code agent
```

## How It Works

1. **`Dockerfile`** creates a minimal Debian image with a `sandbox` user (passwordless sudo) and bakes in:
   - `install/` copied to `/home/sandbox/install/`
   - `workspace/` copied to `/home/sandbox/workspace/`
   - Claude `--dangerously-skip-permissions` alias in `.bashrc`
   - Default shell drops into `/home/sandbox/workspace`

2. **`docker-compose.yml`** bind-mounts `./workspace` to `/home/sandbox/workspace` so files persist across container restarts.

3. **`install/setup.sh`** provisions all tools system-wide (as root):
   - Node.js 22.x, npm (via NodeSource apt repo)
   - GitHub CLI (via official apt repo)
   - Bun (installed to `/usr/local/bin`)
   - uv (installed to `/usr/local/bin`)
   - Claude Code CLI (via `npm install -g`)
   - Optional: agent-browser + Chromium

4. **`workspace/CLAUDE.md`** provides default context to the Claude Code agent about its environment and available tools.

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
| `make all` | Build + push |

## Configuration

The setup script supports interactive and non-interactive modes:

```bash
# Interactive (prompts for each option)
sudo bash ~/install/setup.sh

# Non-interactive (installs everything with defaults)
sudo bash ~/install/setup.sh --non-interactive
```

Interactive mode prompts for: SSH public key, Git identity, GitHub token, Claude Code install, agent-browser install.

## Releases

Tag format: `claude-v<version>` (e.g. `claude-v1.0.0`)

```bash
git tag claude-v1.0.0
git push origin claude-v1.0.0
```

This triggers the CI workflow which builds and pushes:
- `ghcr.io/ruska-ai/sandbox:claude-v1.0.0`
- `ghcr.io/ruska-ai/sandbox:claude-latest`
