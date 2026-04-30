---
sidebar_position: 1
title: "Heartbeats Overview"
---

# Heartbeats Overview

A heartbeat is a periodic task defined as a Markdown file with YAML frontmatter. The daemon reads these files, parses their `schedule` field (a standard 5-field cron expression), and fires the task on each matching tick. The agent receives the file body as its prompt and executes the listed steps.

Heartbeats offload scheduling concerns from the agent prompt. Instead of embedding reminders like "check CI every hour" into an agent's identity files, you place that instruction in a dedicated heartbeat file. The agent's SOUL.md stays focused on persona and principles; the recurring task lives in `workspace/heartbeats/`.

## Why Heartbeats

Without heartbeats, recurring tasks have two bad alternatives:

- **Manual invocation**: the human or another process must remember to trigger the task.
- **Embedded reminders in agent prompts**: the agent's context fills up with scheduling logic that belongs elsewhere.

Heartbeats solve both problems. The daemon polls the `heartbeats/` directory every minute, compares each file's cron expression to the current time, and spawns the agent when a schedule matches. The agent reads the file body, executes the steps, and reports `HEARTBEAT_OK` or a failure summary.

## The Daemon Model

The heartbeat daemon is a long-running process managed via tmux. Inside a sandbox it runs under the session name `heartbeat-<name>` (or as a background service depending on how the sandbox was provisioned).

The daemon:

1. Watches `workspace/heartbeats/` for `.md` files.
2. Parses YAML frontmatter from each file on startup and whenever `heartbeat-daemon sync` is called.
3. Schedules each entry using the `schedule` cron expression.
4. At each firing, spawns the agent specified by the `agent` field with the file body as the task prompt.
5. Respects the optional `active` window field — if set, the task only fires within the specified hour range.

Files without a `schedule` field are skipped. A `schedule` line prefixed with `#` disables the heartbeat without deleting the file, which is useful for temporary suspension.

## Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `schedule` | Yes | 5-field cron expression. Without this field the file is ignored. |
| `agent` | No | Agent to run (default: `claude`). |
| `active` | No | Active-hours window in `start-end` format (e.g., `9-21` for 9am–9pm UTC). Omit for always-on. |

## File Location

Heartbeat files live in `workspace/heartbeats/` relative to the agent's workspace root. Any `.md` file in that directory is a candidate; the daemon reads all of them on sync and picks up only those with a valid `schedule` field.

## Disabling a Heartbeat

Comment out the `schedule` line in the frontmatter:

```yaml
---
# schedule: "0 9 * * *"
agent: claude
---
```

The daemon skips entries with a commented-out schedule. Re-enable by removing the `#` and running `heartbeat-daemon sync`, or by waiting for the next auto-sync (the daemon watches for file changes and reloads within 500ms).

## Creating Heartbeats

Use the `/heartbeat` skill to write a new heartbeat file and sync the daemon in one step:

```bash
/heartbeat check CI status every hour
```

The skill derives a kebab-case name, converts plain-English timing to a cron expression, writes the file, and confirms the daemon picked it up.
