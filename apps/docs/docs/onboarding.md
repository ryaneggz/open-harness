---
sidebar_position: 4
title: "Onboarding"
---

# Onboarding

The onboarding wizard runs once after your first sandbox start. It auto-detects what is already configured and only prompts for steps that still need attention. Run it from the host:

```bash
oh onboard
```

To target a specific named sandbox:

```bash
oh onboard my-agent
```

To re-run a single step (useful after rotating credentials):

```bash
oh onboard slack
oh onboard github
oh onboard llm
```

To force all steps even if already configured:

```bash
oh onboard --force
```

## Steps

### Step 1 — LLM provider

Authenticates with an LLM provider (Anthropic, OpenAI, Google, or another supported provider) so Claude Code, Pi, and the Mom Slack bot can make API calls.

The wizard launches `openharness` in interactive mode to complete the OAuth flow. Auth is stored in `~/.pi/agent/auth.json` inside the sandbox and shared with Mom automatically.

**Skipped when:** `~/.pi/agent/auth.json` already exists, or `OPENAI_API_KEY` is set in the environment.

### Step 2 — GitHub CLI

Authenticates the `gh` CLI so the agent can create PRs, open issues, and push branches directly from the sandbox.

```bash
gh auth login && gh auth setup-git
```

When prompted for a preferred protocol, choose SSH. The CLI generates an ed25519 key and uploads it to your GitHub account, which means Step 4 (SSH) can fast-path.

**Skipped when:** `gh auth status` succeeds.

### Step 3 — Slack (Mom bot)

Configures the Mom Slack bot with a Socket Mode app token (`SLACK_APP_TOKEN`) and a bot token (`SLACK_BOT_TOKEN`).

If the tokens are already in `.devcontainer/.env`, the wizard validates that Mom is connected. If Mom was started automatically by the container entrypoint, it confirms it is running without restarting. If tokens are missing, the wizard walks through Slack app creation.

Tokens are persisted to `.env` so they survive container rebuilds.

**Skipped when:** both tokens are set and Mom is already connected.

To set tokens manually, add them to `.devcontainer/.env`:

```bash
SLACK_APP_TOKEN=xapp-...
SLACK_BOT_TOKEN=xoxb-...
```

### Step 4 — SSH key

Checks for `~/.ssh/id_ed25519.pub` inside the sandbox and generates a new key if missing. Then verifies GitHub SSH access:

```bash
ssh -T git@github.com
```

If Step 2 ran `gh auth login` with the SSH protocol, the key is already uploaded and this step is a no-op.

**Skipped when:** the key exists and GitHub SSH access is verified.

### Step 5 — Cloudflare tunnel (optional)

Only runs if `cloudflared` is installed in the sandbox image. Creates a named tunnel for public URL access to dev servers running inside the sandbox.

**Skipped when:** `cloudflared` is not installed or a tunnel config already exists in `~/.cloudflared/`.

### Step 6 — Claude Code

Checks for Claude Code credentials in `~/.claude/` and triggers the OAuth flow if missing.

**Skipped when:** credentials exist, or the `claude-host` compose overlay is active (which mounts host `~/.claude` directly into the sandbox).

## After onboarding

Once all configured steps pass, agents are ready:

```bash
claude     # terminal coding agent
pi         # automations — Slack, heartbeats, extensions
```

The wizard also installs project dependencies and writes an onboarded marker so it does not run again on the next container start.

## Troubleshooting

**SSH key not recognized by GitHub:** Copy the public key printed during Step 4 and add it at [github.com/settings/keys](https://github.com/settings/keys). Alternatively, re-run `oh onboard github` to redo the GitHub step.

**GitHub CLI auth fails:** Try `gh auth login --web` for browser-based auth, or use a [personal access token](https://github.com/settings/tokens).

**Cloudflare login opens no browser:** Run `cloudflared login` manually inside the sandbox. It prints a URL you can paste into any browser.

**Claude Code auth fails:** Run `claude` directly inside the sandbox to trigger the OAuth flow interactively.

**Slack bot not responding:** Attach to the tmux session to see error output:

```bash
tmux attach -t agent-mom
```

Common causes: LLM auth missing (complete Step 1 first), invalid tokens, or the Slack app is not installed to your workspace.
