---
title: "Onboarding"
---


The onboarding wizard runs once after your first sandbox start. It auto-detects what's configured in `.env` and only prompts for steps that aren't already set up.

```bash
openharness onboard              # from the host
# or, inside the container:
bash ~/install/onboard.sh
```

## How auto-detection works

Each step checks whether its service is already configured before prompting:

| Step | Auto-detected when |
|------|--------------------|
| LLM Provider | `~/.pi/agent/auth.json` exists or `OPENAI_API_KEY` is set |
| GitHub CLI | `gh auth status` succeeds |
| Slack | `SLACK_APP_TOKEN` and `SLACK_BOT_TOKEN` are in `.env` |
| SSH Key | `~/.ssh/id_ed25519.pub` exists |
| Cloudflare | Tunnel config exists in `~/.cloudflared/` |
| Claude Code | Credentials exist in `~/.claude/` |

If a service is already configured, onboarding marks it as done and moves on. The entrypoint also auto-starts services that are ready (e.g., Mom starts automatically if Slack tokens are in `.env`).

## Steps

### Step 1 -- LLM Provider (OpenAI)

- Launches `openharness` (Pi agent CLI) for interactive login
- Authenticates with an LLM provider (OpenAI, Anthropic, etc.)
- Auth is shared with Mom (Slack bot) automatically
- **Skipped if** `~/.pi/agent/auth.json` already exists

### Step 2 -- GitHub CLI

- Checks `gh auth status`
- Runs `gh auth login` if not authenticated
- Required for creating PRs, issues, and releases from inside the sandbox
- When prompted for a preferred protocol, **choose SSH** — `gh` will generate an ed25519 key and upload it to your GitHub account for you, which lets Step 4 fast-path
- **Skipped if** already authenticated

### Step 3 -- Slack (Mom Bot)

- If tokens are in `.env`, validates that Mom is connected
- If Mom was already started by the entrypoint, confirms it's running without restarting
- If tokens are not set, walks through Slack app creation and token setup
- Persists tokens to `.env` for future container rebuilds
- **Skipped if** tokens are set and Mom is already connected

### Step 4 -- SSH Key

- Checks for `~/.ssh/id_ed25519.pub`; generates one if missing
- Verifies GitHub SSH access (`ssh -T git@github.com`)
- Prompts you to add the key to GitHub if access fails
- Typically a no-op when Step 2 ran `gh auth login` with the SSH protocol — the key and upload are already done
- **Skipped if** key exists and GitHub access is verified

### Step 5 -- Cloudflare Tunnel (optional)

- Only runs if `cloudflared` is installed in the container
- Runs `cloudflared login` for Cloudflare authentication
- Prompts for tunnel name, hostname, and local port
- Creates a tunnel config for public URL access to your dev server
- **Skipped if** `cloudflared` is not installed or tunnel is already configured

### Step 6 -- Claude Code

- Checks for existing credentials in `~/.claude/`
- Runs `claude --version` to trigger OAuth if needed
- Required for using Claude Code as your terminal coding agent
- **Skipped if** credentials already exist
- **Short-circuited entirely** if the [`claude-host` overlay](../guide/overlays.md#sharing-host-claude-state-claude-host) is active — host `~/.claude/.onboarded` is read directly, so no sandbox auth is needed

## After onboarding

The wizard:
- Installs project dependencies (`pnpm install`)
- Starts the Next.js dev server on port 3000
- Starts the Cloudflare tunnel (if configured)
- Writes an onboarded marker so it won't run again

Once complete, agents are ready to use:
- `claude` -- terminal coding agent
- `pi` -- automations (Slack, heartbeats, extensions)

## Re-running

To re-verify all steps:

```bash
openharness onboard --force
```

## Troubleshooting

**SSH key not recognized by GitHub**: Copy the public key printed during Step 4 and add it at [github.com/settings/keys](https://github.com/settings/keys). If you ran Step 2 (`gh auth login`) with the SSH protocol, the key is usually already uploaded — re-run `openharness onboard --only ssh` to re-verify.

**GitHub CLI auth fails**: Try `gh auth login --web` for browser-based auth, or use a [personal access token](https://github.com/settings/tokens).

**Cloudflare login opens no browser**: Run `cloudflared login` manually -- it prints a URL you can paste into any browser.

**Claude Code auth fails**: Run `claude` directly inside the container to trigger the OAuth flow interactively.

**Slack bot not responding**: Check `tmux attach -t slack` for error output. Common causes: LLM auth missing (complete Step 1 first), invalid tokens, or Slack app not installed to workspace.
