---
name: setup-slack
description: Configure Mom Slack bot on an existing sandbox. Sets up Slack tokens, AI auth (OAuth or API key), and verifies Mom is running.
argument-hint: "[sandbox-name]"
---

# Setup Slack (Mom) for a Sandbox

Configure the Mom Slack bot on an existing sandbox so it can interact with users via Slack.

## 1. Resolve Parameters

Arguments received: `$ARGUMENTS`

- **NAME**: first positional argument (sandbox name). If empty, enter interactive mode.

### Interactive Mode

If NAME is missing, ask:

1. **Which sandbox?** Show running containers (`make list`) and ask which one to configure.

## 2. Verify Prerequisites

Run these checks before proceeding:

```bash
# Container must be running
docker ps --filter "name=<NAME>" --format "{{.Names}}" | grep -q "<NAME>"

# Mom must be installed
docker exec --user sandbox <NAME> bash -c 'which mom || command -v mom'
```

If Mom is not installed, the sandbox may have been provisioned before the Mom integration. Tell the user:
```
Mom is not installed in this sandbox. Rebuild with:
  make NAME=<NAME> rebuild
```

## 3. Configure Slack Tokens

Check if Slack tokens are already configured:

```bash
cat .worktrees/agent/<NAME>/config/.env 2>/dev/null || echo "No config/.env found"
```

If tokens are **not set**, ask the user for them. To create a Slack app and get tokens:

First, read the manifest file bundled with this skill and show it to the user:

```bash
cat .claude/skills/setup/slack/slack-manifest.json
```

Then walk the user through setup:

```
  1. Go to https://api.slack.com/apps → Create New App → From a manifest
  2. Paste the manifest JSON shown above and create the app
  3. Settings → Socket Mode → generate App-Level Token with connections:write scope (xapp-...)
  4. Install App → Install to workspace → copy Bot User OAuth Token (xoxb-...)
```

Once the user provides tokens, write them to `config/.env` using the Write tool:

```
.worktrees/agent/<NAME>/config/.env
```

Content:
```
MOM_SLACK_APP_TOKEN=xapp-...
MOM_SLACK_BOT_TOKEN=xoxb-...
```

## 4. Configure AI Authentication

Mom uses Claude (via pi-coding-agent) to generate responses. It needs Anthropic auth configured inside the sandbox. Check current state:

```bash
docker exec --user sandbox <NAME> bash -c 'cat ~/.pi/mom/auth.json 2>/dev/null; echo "---"; echo "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:+set}"'
```

If `auth.json` is empty (`{}`) and no API key is set, ask the user which auth method they prefer:

### Option A: OAuth (recommended — no API key needed)

Tell the user to run these commands. They must do this interactively:

```
Run inside the sandbox to authenticate via browser:

  make NAME=<NAME> shell
  pi --login

Follow the browser URL to authenticate with Anthropic. Once done:

  cp ~/.pi/agent/auth.json ~/.pi/mom/auth.json
  exit
```

After the user confirms they've completed this, verify:

```bash
docker exec --user sandbox <NAME> bash -c 'cat ~/.pi/mom/auth.json | head -1'
```

The file should no longer be `{}`.

### Option B: API Key

If the user has an `ANTHROPIC_API_KEY`, add it to `config/.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

This is sourced automatically by the `mom-start` Makefile target.

## 5. Start Mom

No container restart needed — `config/` is bind-mounted and sourced at runtime:

```bash
make NAME=<NAME> mom-stop 2>/dev/null; make NAME=<NAME> mom-start
```

## 6. Verify Mom

```bash
make NAME=<NAME> mom-status
```

Expected: Mom is running with a PID. If not, check `config/.env` has correct tokens and try `mom-start` again.

### Test connectivity

Run Mom in the foreground briefly to check for errors:

```bash
docker exec --user sandbox <NAME> bash -c '[ -f ~/config/.env ] && set -a && . ~/config/.env && set +a; mom --sandbox=host ~/workspace/mom-data 2>&1' &
sleep 5 && kill %1
```

Look for `⚡️ Mom bot connected and listening!` — if you see scope errors, the user needs to add missing scopes in their Slack app and reinstall.

## 7. Report

```
Slack is configured for '<NAME>'!

  Config:       .worktrees/agent/<NAME>/config/.env
  Auth:         ~/.pi/mom/auth.json (inside container)
  Mom status:   make NAME=<NAME> mom-status
  Mom start:    make NAME=<NAME> mom-start
  Mom stop:     make NAME=<NAME> mom-stop
  Mom logs:     docker exec --user sandbox <NAME> tail -50 ~/workspace/mom-data/mom.log

  To update tokens: edit config/.env, then make NAME=<NAME> mom-stop && make NAME=<NAME> mom-start
  Test: mention the bot in a Slack channel or send it a DM.
```
