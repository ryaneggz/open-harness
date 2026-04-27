---
sidebar_position: 1
title: "Slack"
---

# Slack

Open Harness ships a vendored Slack bot built on the `pi-mom` library (`packages/slack/`). The bot lets agents post messages, reply in threads, and respond to Slack events — all driven by the Pi Agent running inside the sandbox.

## How it works

The Slack integration runs as the Pi Agent (`pi`) inside the sandbox. Pi reads its LLM provider and model from the agent's `settings.json`, then connects to Slack using the Socket Mode API. Unlike the upstream `pi-mom` npm package, the Open Harness fork supports configurable providers (not just Anthropic), thread replies via `postInThread`, and tool-output suppression so only errors appear in threads.

## Required environment variables

Set these in `.devcontainer/.env` before starting the sandbox:

| Variable | Description |
|---|---|
| `SLACK_APP_TOKEN` | Socket Mode app-level token (starts with `xapp-`) |
| `SLACK_BOT_TOKEN` | Bot OAuth token (starts with `xoxb-`) |

The Slack overlay (`docker-compose.slack.yml`) injects these into the sandbox container. Without both tokens set, the bot will not connect.

## Enabling the overlay

Add the Slack overlay when starting the sandbox:

```bash
docker compose \
  -f .devcontainer/docker-compose.yml \
  -f .devcontainer/docker-compose.slack.yml \
  up -d --build
```

## Starting the bot

Inside the sandbox, run Pi Agent in a dedicated tmux session:

```bash
tmux new-session -d -s agent-pi 'pi 2>&1 | tee /tmp/agent-pi.log'
```

The session name `agent-pi` follows the harness naming convention (`agent-<identifier>`). Attach at any time with:

```bash
tmux attach -t agent-pi
```

## First-time authentication

Pi Agent requires a one-time OAuth flow on first run. Inside the sandbox:

```bash
pi
```

Follow the browser prompt to authenticate. Credentials are persisted in the `pi-auth` named volume (or a host bind-mount if using `docker-compose.pi-host.yml`) so you do not need to re-authenticate on container restart.

## Configuring the LLM provider

The bot reads the provider and model from the agent's `settings.json` in the workspace. Edit that file to switch between Anthropic, OpenAI, or any other supported provider. The `OPENAI_API_KEY` environment variable is also injected by the Slack overlay if set in `.env`.

## Source code

The bot lives in `packages/slack/src/`. All changes go there — never patch the compiled output in `packages/slack/dist/` directly. After editing source, rebuild:

```bash
pnpm run build
```

Commit both `src/` and `dist/` together.
