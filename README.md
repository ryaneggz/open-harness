# 🏗️ Open Harness

**Open Harness** — one `docker compose up` gives you a sandbox (a Docker container) with everything AI coding agents need. Inside, you run as many **harnesses** as you like — each a git worktree with its own branch, identity (SOUL), and cron schedule. The root harness is the **orchestrator**: it provisions and manages the rest.

- **One sandbox, every agent.** Claude Code, Codex, Pi, and Gemini CLI share the same container image and toolchain — pick which agent powers each harness.
- **Worktree-per-agent.** Each harness gets its own git branch, its own SOUL, and its own schedule, isolated under `.worktrees/`.
- **Harnesses that work while you sleep.** Cron-driven heartbeats wake them to do real work, autonomously.
- **Only host dependency: Docker.** No Node, no Python, no toolchain rot on your laptop.
- **Composable infra.** Cherry-pick Postgres, Cloudflare tunnels, SSH, Slack, Caddy gateway.

---

## 📦 Install

```bash
curl -fsSL https://oh.mifune.dev/install.sh | bash
```

Only host dependency: [Docker](https://docs.docker.com/get-docker/). Add `-s -- --with-cli` to also install the `oh` CLI on the host (requires Node 20+).

## 🚀 Quickstart

Requires the `oh` CLI on your host — install with `-s -- --with-cli` above (Node 20+). The full sandbox lifecycle is three commands:

```bash
oh onboard            # one-time: GitHub, LLM, Slack, Claude auth wizard
oh sandbox my-project   # provision and start
oh shell my-project     # connect (interactive shell)
oh clean my-project     # tear down
```

Prefer VS Code or remote SSH? See [Connecting to a sandbox](https://github.com/ryaneggz/open-harness/blob/main/docs/getting-started/quickstart.md).

Inside the shell, start working:

```bash
claude                # terminal coding agent
pi                    # automations — Slack, heartbeats, extensions
```

## 🐳 Docker only (no installer)

Alternative path for hosts with only Docker + git — no `bash` piping, no Node, no `oh` CLI:

```bash
git clone https://github.com/ryaneggz/open-harness.git && cd open-harness
cp .devcontainer/.example.env .devcontainer/.env
# edit .devcontainer/.env: set GH_TOKEN, optionally rename SANDBOX_NAME,
# and set INSTALL_AGENT_BROWSER=false unless you need headless Chromium
docker compose -f .devcontainer/docker-compose.yml up -d --build  # ~10 min on cold cache
docker compose -f .devcontainer/docker-compose.yml exec -u orchestrator sandbox zsh
```

Inside the sandbox, finish auth and start an agent:

```bash
gh auth login && gh auth setup-git    # one-time, if GH_TOKEN wasn't set in .env
claude                                # or: pi, codex, gemini
```

Cleanup: `docker compose -f .devcontainer/docker-compose.yml down -v`.

For Postgres, Slack, SSH, or the Caddy gateway, chain overlay files with extra `-f` flags — see [Compose overlays](https://github.com/ryaneggz/open-harness/blob/main/docs/guide/overlays.md).

## ✨ What you get

| | |
|---|---|
| **AI agents** | Claude Code, OpenAI Codex, Pi Agent, Mom (Slack bot) |
| **Runtimes** | Node 22, pnpm, Bun, uv (Python) |
| **DevOps** | Docker CLI + Compose, GitHub CLI, cloudflared, tmux, cron |
| **Browser** | agent-browser + Chromium (headless) |
| **Worktree-per-agent** | Each harness gets its own branch, SOUL, and schedule, isolated under `.worktrees/` — all sharing one sandbox |
| **Heartbeats** | Cron-scheduled autonomous runs (`workspace/heartbeats/*.md`) |

## 📚 Where to go next

- [Quickstart](https://github.com/ryaneggz/open-harness/blob/main/docs/getting-started/quickstart.md) — full step-by-step
- [Onboarding](https://github.com/ryaneggz/open-harness/blob/main/docs/getting-started/onboarding.md) — auth wizard walkthrough
- [Compose overlays](https://github.com/ryaneggz/open-harness/blob/main/docs/guide/overlays.md) — Postgres, Slack, SSH, gateway, Cloudflare
- [Slack bot](https://github.com/ryaneggz/open-harness/blob/main/docs/slack/overview.md) — Mom + Pi via Socket Mode
- [CLI reference](https://github.com/ryaneggz/open-harness/blob/main/docs/cli/commands.md) — every `oh` command
- [Heartbeats](https://github.com/ryaneggz/open-harness/blob/main/docs/guide/heartbeats.md) — cron-scheduled autonomous tasks
- [Architecture](https://github.com/ryaneggz/open-harness/blob/main/docs/architecture/orchestrator-worktrees.md) — one container, N worktrees, one daemon

## 🗂️ Project layout

```
.devcontainer/    # Sandbox environment (Dockerfile, compose, overlays)
docs/             # Plain-markdown documentation (GitHub-rendered)
install/          # Provisioning scripts
workspace/        # Agent workspace template (bind-mounted)
packages/
  sandbox/        # @openharness/sandbox — CLI + container lifecycle
  slack/          # Vendored fork of pi-mom — Slack bot
```

## 🧹 Cleanup

```bash
oh clean my-project
```

## 🤝 Contributing & community

Issues and PRs welcome at [github.com/ryaneggz/open-harness](https://github.com/ryaneggz/open-harness). If Open Harness is useful to you, please [give us a star](https://github.com/ryaneggz/open-harness/stargazers).

## 📄 License

MIT.

---

[Full documentation](https://github.com/ryaneggz/open-harness/tree/main/docs)
