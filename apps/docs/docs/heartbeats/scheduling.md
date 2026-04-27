---
sidebar_position: 3
title: "Scheduling Heartbeats"
---

# Scheduling Heartbeats

## Cron Syntax

Heartbeat schedules use standard 5-field cron expressions:

```
┌───────────── minute       (0–59)
│ ┌─────────── hour         (0–23)
│ │ ┌───────── day of month (1–31)
│ │ │ ┌─────── month        (1–12)
│ │ │ │ ┌───── day of week  (0–6, Sunday = 0)
│ │ │ │ │
* * * * *
```

Common patterns:

| Expression | Meaning |
|------------|---------|
| `*/5 * * * *` | Every 5 minutes |
| `0 * * * *` | Every hour, on the hour |
| `0 9 * * *` | Daily at 9am UTC |
| `0 9 * * 1` | Every Monday at 9am UTC |
| `50 23 * * *` | Daily at 11:50pm UTC |
| `0 */2 * * *` | Every 2 hours |
| `*/30 * * * *` | Every 30 minutes |

The daemon uses 5-field cron only — no seconds field, no @yearly/@monthly shorthand.

## The `schedule` Field

The `schedule` field in frontmatter is the only required field. Without it the daemon ignores the file entirely.

```yaml
---
schedule: "0 9 * * *"
agent: claude
---
```

Quote the expression to avoid YAML parsing issues with `*`.

## The `active` Field

The `active` field restricts firing to a UTC hour window. Format: `start-end` (integers, 0–23).

```yaml
---
schedule: "0 * * * *"
agent: claude
active: 9-18
---
```

This heartbeat fires every hour but only between 9am and 6pm UTC. Outside that window the daemon sees the cron tick but skips spawning the agent. Use this for noisy or expensive checks that do not need to run overnight.

Omit `active` entirely for heartbeats that should run at all hours.

## The `agent` Field

Specifies which agent binary runs the task. Defaults to `claude` if omitted.

```yaml
---
schedule: "*/30 * * * *"
agent: claude
---
```

Other values can be used when multiple agents are available in the sandbox (e.g., `codex`).

## Disabling a Heartbeat

Prefix the `schedule` line with `#` to disable without deleting the file:

```yaml
---
# schedule: "0 9 * * *"
agent: claude
---
```

The daemon treats this as a file with no schedule and skips it. Remove the `#` to re-enable.

## Syncing the Daemon

The daemon watches `workspace/heartbeats/` and reloads within 500ms of any file change. Manual sync is rarely needed, but available when you want to confirm a new file was picked up immediately:

```bash
heartbeat-daemon sync
```

Check which heartbeats are currently registered and their next fire times:

```bash
heartbeat-daemon status
```

Restart the daemon if it is not running:

```bash
heartbeat-daemon start
```

## Creating Heartbeats with `/heartbeat`

The `/heartbeat` skill writes the file and syncs the daemon in one step. Pass a plain-English description:

```bash
/heartbeat check Slack bot health every 5 minutes
/heartbeat run wiki lint daily at 6am
/heartbeat cut a nightly release at 11:50pm
```

The skill:

1. Derives a kebab-case filename from the description.
2. Converts plain-English timing to a 5-field cron expression.
3. Writes `workspace/heartbeats/<name>.md` with correct frontmatter.
4. Waits 1 second, then runs `heartbeat-daemon status` to confirm the entry appeared.

If the daemon is not running or the heartbeat does not appear in status output, the skill falls back to `heartbeat-daemon sync` and re-checks.

## Heartbeat Lifecycle

```
File written to workspace/heartbeats/
        |
        v
Daemon detects change (within 500ms)
        |
        v
Frontmatter parsed — entry registered with cron expression
        |
        v
Cron tick fires — active window checked
        |
        v (within window, or no window set)
Agent spawned with file body as prompt (300s timeout)
        |
        v
Agent replies HEARTBEAT_OK or failure summary
        |
        v
Result written to heartbeat.log
```

A file with a commented-out `schedule` exits the lifecycle at the parse step — no entry is registered and the agent is never spawned.
