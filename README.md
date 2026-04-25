# Mifune Open Harness

**Mifune Open Harness** — run Claude, Codex, Gemini, and Pi side-by-side from one `docker compose up`. Each agent gets its own branch, its own SOUL, its own schedule.

- **Worktree-per-agent.** Each agent gets its own branch, its own SOUL, its own schedule.
- **Agents that work while you sleep.** Cron-driven heartbeats wake them to do real work, autonomously.
- **One container, every agent.** Claude Code, Codex, Pi, Gemini CLI — same sandbox, same toolchain.
- **Only host dependency: Docker.** No Node, no Python, no toolchain rot on your laptop.
- **Composable infra.** Cherry-pick Postgres, Cloudflare tunnels, SSH, Slack, Caddy gateway.

---

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/ryaneggz/open-harness/refs/heads/main/install.sh | bash
```

Only host dependency: [Docker](https://docs.docker.com/get-docker/). Add `-s -- --with-cli` to also install the `oh` CLI on the host (requires Node 20+).

## Quickstart

The full sandbox lifecycle is three commands:

```bash
oh onboard            # one-time: GitHub, LLM, Slack, Claude auth wizard
oh sandbox my-agent   # provision and start
oh shell my-agent     # connect (interactive shell)
oh clean my-agent     # tear down
```

Prefer VS Code or remote SSH? See [Connecting to a sandbox](https://oh.mifune.dev/getting-started/quickstart).

Inside the shell, start working:

```bash
claude                # terminal coding agent
pi                    # automations — Slack, heartbeats, extensions
```

## What you get

| | |
|---|---|
| **AI agents** | Claude Code, OpenAI Codex, Pi Agent, Mom (Slack bot) |
| **Runtimes** | Node 22, pnpm, Bun, uv (Python) |
| **DevOps** | Docker CLI + Compose, GitHub CLI, cloudflared, tmux, cron |
| **Browser** | agent-browser + Chromium (headless) |
| **Worktree-per-agent** | One branch per agent, one container, shared toolchain |
| **Heartbeats** | Cron-scheduled autonomous runs (`workspace/heartbeats/*.md`) |

## Where to go next

- [Quickstart](https://oh.mifune.dev/getting-started/quickstart) — full step-by-step
- [Onboarding](https://oh.mifune.dev/getting-started/onboarding) — auth wizard walkthrough
- [Compose overlays](https://oh.mifune.dev/guide/overlays) — Postgres, Slack, SSH, gateway, Cloudflare
- [Slack bot](https://oh.mifune.dev/slack/overview) — Mom + Pi via Socket Mode
- [CLI reference](https://oh.mifune.dev/cli/commands) — every `oh` command
- [Heartbeats](https://oh.mifune.dev/guide/heartbeats) — cron-scheduled autonomous tasks
- [Architecture](https://oh.mifune.dev/architecture/orchestrator-worktrees) — one container, N worktrees, one daemon

## Project layout

```
.devcontainer/    # Sandbox environment (Dockerfile, compose, overlays)
install/          # Provisioning scripts
workspace/        # Agent workspace template (bind-mounted)
packages/
  sandbox/        # @openharness/sandbox — CLI + container lifecycle
  slack/          # Vendored fork of pi-mom — Slack bot
docs/             # Documentation site (Nextra)
```

## Cleanup

```bash
oh clean my-agent
```

## Contributing & community

Issues and PRs welcome at [github.com/ryaneggz/open-harness](https://github.com/ryaneggz/open-harness). If Mifune Open Harness is useful to you, please [give us a star](https://github.com/ryaneggz/open-harness/stargazers).

## License

MIT.

---

[Full documentation](https://oh.mifune.dev/)
