# 🏗️ Open Harness

**Open Harness** — run Claude, Codex, Gemini, and Pi side-by-side from one `docker compose up`. Each agent gets its own branch, its own SOUL, its own schedule.

- **Worktree-per-agent.** Each agent gets its own branch, its own SOUL, its own schedule.
- **Agents that work while you sleep.** Cron-driven heartbeats wake them to do real work, autonomously.
- **One container, every agent.** Claude Code, Codex, Pi, Gemini CLI — same sandbox, same toolchain.
- **Only host dependency: Docker.** No Node, no Python, no toolchain rot on your laptop.
- **Composable infra.** Cherry-pick Postgres, Cloudflare tunnels, SSH, Slack, Caddy gateway.

---

## 📦 Install

```bash
curl -fsSL https://oh.mifune.dev/install.sh | bash
```

Only host dependency: [Docker](https://docs.docker.com/get-docker/). The installer auto-detects Node.js 20+: if found, it builds and links the `oh` CLI on the host; if not, it offers a 3-way prompt (install Node via nvm, Docker-only sandbox, or abort). Pass `--cli`, `--docker-only`, or `--install-node` to skip the prompt.

## 🚀 Quickstart

Requires the `oh` CLI on your host — installed automatically when Node 20+ is detected (see Install above). The full sandbox lifecycle is three commands:

```bash
oh onboard            # one-time: GitHub, LLM, Slack, Claude auth wizard
oh sandbox my-agent   # provision and start
oh shell my-agent     # connect (interactive shell)
oh clean my-agent     # tear down
```

Prefer VS Code or remote SSH? See [Connecting to a sandbox](https://oh.mifune.dev/docs/quickstart).

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
docker compose -f .devcontainer/docker-compose.yml exec -u sandbox sandbox zsh
```

Inside the sandbox, finish auth and start an agent:

```bash
gh auth login && gh auth setup-git    # one-time, if GH_TOKEN wasn't set in .env
claude                                # or: pi, codex, gemini
```

Cleanup: `docker compose -f .devcontainer/docker-compose.yml down -v`.

For Postgres, Slack, SSH, or the Caddy gateway, chain overlay files with extra `-f` flags — see [Compose overlays](https://oh.mifune.dev/docs/guide/overlays).

## ✨ What you get

| | |
|---|---|
| **AI agents** | Claude Code, OpenAI Codex (others via [harness packs](https://oh.mifune.dev/docs/guide/bring-your-own-harness)) |
| **Runtimes** | Node 22, pnpm, Bun, uv (Python) |
| **DevOps** | Docker CLI + Compose, GitHub CLI, cloudflared, tmux, cron |
| **Browser** | agent-browser + Chromium (headless) |
| **Worktree-per-agent** | One branch per agent, one container, shared toolchain |
| **Heartbeats** | Cron-scheduled autonomous runs (`workspace/heartbeats/*.md`) |

## 📚 Where to go next

- [Quickstart](https://oh.mifune.dev/docs/quickstart) — full step-by-step
- [Onboarding](https://oh.mifune.dev/docs/onboarding) — auth wizard walkthrough
- [Compose overlays](https://oh.mifune.dev/docs/guide/overlays) — Postgres, SSH, gateway, Cloudflare
- [Bring your own harness](https://oh.mifune.dev/docs/guide/bring-your-own-harness) — install harness packs (e.g. [`@ryaneggz/mifune`](https://github.com/ryaneggz/mifune) for the Pi+Mom Slack bot)
- [CLI reference](https://oh.mifune.dev/docs/cli/overview) — every `oh` command
- [Heartbeats](https://oh.mifune.dev/docs/heartbeats/overview) — cron-scheduled autonomous tasks
- [Architecture](https://oh.mifune.dev/docs/architecture/worktrees) — one container, N worktrees, one daemon

## 🗂️ Project layout

```
.devcontainer/    # Sandbox environment (Dockerfile, compose, overlays)
docs/             # Plain-markdown documentation (GitHub-rendered)
install/          # Provisioning scripts
workspace/        # Agent workspace template (bind-mounted)
packages/
  sandbox/        # @openharness/sandbox — CLI + container lifecycle
```

For pi+slack functionality, install the [`@ryaneggz/mifune`](https://github.com/ryaneggz/mifune) harness pack via `oh harness add @ryaneggz/mifune`.

## 🧹 Cleanup

```bash
oh clean my-agent
```

## 🤝 Contributing & community

Issues and PRs welcome at [github.com/ryaneggz/open-harness](https://github.com/ryaneggz/open-harness). If Open Harness is useful to you, please [give us a star](https://github.com/ryaneggz/open-harness/stargazers).

## 📄 License

MIT.

---

[Full documentation](https://oh.mifune.dev/docs)
