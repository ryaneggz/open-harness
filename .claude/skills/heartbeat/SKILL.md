---
name: heartbeat
description: |
  Create a new heartbeat and activate it immediately.
  Writes a frontmatter-based .md file to workspace/heartbeats/, then syncs
  the daemon so it starts firing on the next cron tick.
  TRIGGER when: user asks to create, add, or set up a heartbeat, periodic task,
  or scheduled check.
argument-hint: "<description of what the heartbeat should do>"
---

# Create Heartbeat

Create a new heartbeat definition and sync the daemon so it's live immediately.

## 0. Parse the Request

From the user's message (`$ARGUMENTS` or conversation context), extract:

- **NAME**: kebab-case identifier (e.g., `system-time`, `build-health`). Derive from the task description if not explicitly given.
- **SCHEDULE**: cron expression. Convert plain English to 5-field cron:
  - "every minute" → `*/1 * * * *`
  - "every 5 minutes" → `*/5 * * * *`
  - "every 30 minutes" → `*/30 * * * *`
  - "hourly" → `0 * * * *`
  - "every 2 hours" → `0 */2 * * *`
  - "daily at 8am" → `0 8 * * *`
  - "nightly" → `0 0 * * *`
  - Default if unspecified: `*/30 * * * *`
- **AGENT**: which agent runs it. Default: `claude`
- **ACTIVE** (optional): active-hours window (e.g., `9-21` for 9am–9pm UTC). Omit if not specified.
- **TASK**: what the heartbeat should do — the body instructions.

## 1. Guard: Check for Duplicates

```bash
ls workspace/heartbeats/
```

If `workspace/heartbeats/<NAME>.md` already exists, tell the user and ask whether to overwrite or pick a different name. Do not silently overwrite.

## 2. Write the Heartbeat File

Create `workspace/heartbeats/<NAME>.md` with this structure:

```markdown
---
schedule: "<SCHEDULE>"
agent: <AGENT>
active: <ACTIVE>          ← omit this line entirely if no active window
---

# <Title>

<Task description and instructions>

## Tasks

<Numbered steps the agent should execute>

## Reporting

- If all tasks succeed, reply `HEARTBEAT_OK`
- If any task fails, report the specific failure with error output
```

Keep the body focused. The heartbeat runner has a 300-second timeout — design tasks that complete well within that.

## 3. Verify

The daemon watches the `heartbeats/` directory and auto-syncs within 500ms of file changes. No manual sync command is needed.

To confirm the daemon picked up the new heartbeat, wait 1 second then check status:

```bash
heartbeat-daemon status
```

If the daemon is not running or the heartbeat doesn't appear, fall back to manual sync:

```bash
heartbeat-daemon sync
```

Report:

```
Heartbeat created: heartbeats/<NAME>.md
Schedule: <SCHEDULE> (<human-readable>)
Agent: <AGENT>
Active: <ACTIVE or "always">
Status: synced and live
```

## Notes

- Heartbeat .md files live in `workspace/heartbeats/`
- The frontmatter parser requires `schedule` — without it the file is skipped
- `agent` defaults to `claude` if omitted
- `active` is optional — omit entirely for always-on heartbeats
- Commented-out `schedule` (prefixed with `#`) disables the heartbeat without deleting it
- The runner spawns the agent with `--dangerously-skip-permissions` and a 300s timeout
- If the heartbeat body is empty (only headers/comments), the runner skips it to save API costs
- A response under 300 chars containing `HEARTBEAT_OK` is treated as success
