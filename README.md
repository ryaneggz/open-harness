# Slack Assistant -- Example AI Assistant via Slack

A basic example Slack AI assistant accessible via the Mom bot integration. Runs inside an isolated Docker sandbox in the Open Harness framework.

> Forked from [Open Harness](https://github.com/ryaneggz/open-harness)

## What It Does

- Responds to Slack mentions and DMs via the Mom bot
- Answers questions, reviews code, researches topics
- Maintains memory of interactions to improve over time

## Heartbeats

| Schedule | File | Purpose |
|---|---|---|
| Weekdays 6pm MT | `daily-summary.md` | Summarize Slack interactions |
| Sunday 8pm MT | `memory-distill.md` | Distill daily logs into MEMORY.md |

## Prerequisites

Mom requires two Slack tokens exported on the host **before** starting the container:

```bash
export MOM_SLACK_APP_TOKEN=xapp-...
export MOM_SLACK_BOT_TOKEN=xoxb-...
```

Use `/setup:slack` from the project root to configure an existing sandbox, or see the [Slack Integration docs](../../README.md#slack-integration-mom) for app setup.

## Getting Started

```bash
# From project root
make NAME=slack-assistant shell
claude

# Management
make NAME=slack-assistant mom-status
make NAME=slack-assistant heartbeat-status
make NAME=slack-assistant stop
make NAME=slack-assistant clean
```
