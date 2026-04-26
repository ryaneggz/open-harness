---
title: "Setup"
---


Connect the Slack bot to your workspace in three steps: create a Slack app, configure credentials, and enable the compose overlay.

## Create a Slack app

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps) and create a new app.
2. Enable **Socket Mode** (Settings → Socket Mode → Enable), then generate an **App-Level Token** with the `connections:write` scope. This becomes your `SLACK_APP_TOKEN`.
3. Add the following **Bot Token Scopes** under OAuth & Permissions:

| Scope | Purpose |
|-------|---------|
| `app_mentions:read` | Detect @mentions |
| `channels:history` | Read channel messages |
| `channels:read` | List channels |
| `chat:write` | Send messages |
| `files:read` | Access shared files |
| `files:write` | Upload files |
| `groups:history` | Read private channel messages |
| `groups:read` | List private channels |
| `im:history` | Read DMs |
| `im:read` | List DMs |
| `im:write` | Send DMs |
| `users:read` | Resolve user names |

4. Subscribe to bot events under Event Subscriptions: `app_mention`, `message.channels`, `message.groups`, `message.im`.
5. Enable direct messages: App Home → Show Tabs → enable the **Messages Tab** → check **Allow users to send Slash commands and messages from the messages tab**.
6. Install the app to your workspace and copy the **Bot User OAuth Token**. This becomes your `SLACK_BOT_TOKEN`.

## Environment variables

Set these before starting the sandbox:

| Variable | Required | Description |
|----------|----------|-------------|
| `SLACK_APP_TOKEN` | Yes | App-level token (`xapp-...`) |
| `SLACK_BOT_TOKEN` | Yes | Bot User OAuth Token (`xoxb-...`) |

```bash
export SLACK_APP_TOKEN=xapp-...
export SLACK_BOT_TOKEN=xoxb-...
```

You can also place them in a `.env` file at the project root.

## Authentication

The agent needs LLM provider credentials to process messages. The recommended method uses the interactive login flow inside the container:

1. Start the sandbox: `openharness sandbox`
2. Enter the container: `openharness shell`
3. Run `openharness`, then use the `/login` command
4. Choose your provider (Anthropic, OpenAI, etc.) and complete the browser flow

Credentials are stored in `~/.openharness/agent/auth.json` inside the container and persist across restarts via the `agent-auth` Docker volume.

Alternatively, pass credentials as environment variables directly:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
# or
export OPENAI_API_KEY=sk-...
```

## Enable the overlay

The Slack overlay is enabled by default. Verify it is listed in `.openharness/config.json`:

```json
{
  "composeOverrides": [
    ".devcontainer/docker-compose.slack.yml"
  ]
}
```

See [Compose Overlays](../guide/overlays.md) for the full list of available overlays and how to combine them.

## Configure the provider

The agent reads its LLM provider from `settings.json` in the workspace directory. Set your preferred provider and model:

```json
{
  "defaultProvider": "anthropic",
  "defaultModel": "claude-sonnet-4-20250514"
}
```

If `settings.json` is missing or the provider is not set, the agent will exit with an error at startup. Run `openharness` inside the container and use the `/model` command to set the provider interactively.

## Start

Once credentials are in place and the overlay is enabled, start the sandbox:

```bash
openharness sandbox
```

The agent auto-starts when `SLACK_APP_TOKEN` and `SLACK_BOT_TOKEN` are set. Add it to any channels where you want it to operate — it only sees messages in channels it has been invited to.
