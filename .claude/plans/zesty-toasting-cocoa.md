# Heartbeat, Soul & Memory System (OpenClaw-style)

## Context

The sandbox project has no health monitoring, periodic task execution, agent personality, or persistent memory. OpenClaw's architecture provides three proven workspace files:

- **HEARTBEAT.md** — user-authored periodic task checklist; agent reads it on a timer, performs tasks or replies `HEARTBEAT_OK`; empty files skip the API call to save costs
- **SOUL.md** — agent persona/personality/boundaries; loaded every session to shape tone and behavior; user-seeded, agent-updatable
- **MEMORY.md** — curated long-term memory; agent-authored over time; stores durable facts, decisions, preferences, lessons learned; daily logs in `memory/YYYY-MM-DD.md` get periodically distilled into MEMORY.md

This plan adapts all three to our bash/Docker environment.

---

## Files to Create

### 1. `install/heartbeat.sh` (new, ~150 lines)

Core heartbeat loop script. Subcommands: `start`, `stop`, `status`.

**Configuration (env vars with defaults):**

| Variable | Default | Description |
|----------|---------|-------------|
| `HEARTBEAT_INTERVAL` | `1800` | Seconds between cycles (30 min) |
| `HEARTBEAT_ACTIVE_START` | _(unset)_ | Hour to start (0-23) |
| `HEARTBEAT_ACTIVE_END` | _(unset)_ | Hour to stop (0-23) |
| `HEARTBEAT_AGENT` | `claude` | Agent CLI to invoke |

**State directory:** `~/.heartbeat/` (inside container, not in workspace)
- `heartbeat.pid` — prevents duplicate instances
- `heartbeat.log` — timestamped log, auto-rotated at 1000 lines

**Key functions:**

- `is_heartbeat_empty()` — Strips HTML comments, headers, empty list items, whitespace. If nothing remains, returns true (skip). Missing file = not empty (run heartbeat). Port of OpenClaw's `isHeartbeatContentEffectivelyEmpty()`.
- `is_active_hours()` — If both `HEARTBEAT_ACTIVE_START` and `HEARTBEAT_ACTIVE_END` set, check `$(date +%H)`. Handles wrap-around.
- `run_heartbeat()` — Reads HEARTBEAT.md, checks gates (active hours, empty file), constructs prompt (includes SOUL.md context if present), invokes `claude -p "$prompt" --dangerously-skip-permissions` with `timeout 300`.
- `is_heartbeat_ok()` — Response under 300 chars containing `HEARTBEAT_OK` → suppress output, log one-line ack.
- `main_loop()` — Writes PID file, traps SIGTERM/SIGINT for clean shutdown, loops with interruptible `sleep $INTERVAL & wait $!`.
- `rotate_log()` — Truncates log to last 500 lines when over 1000.

**Heartbeat prompt sent to agent:**
```
[SOUL.md content injected here if file exists and is non-empty]

You are performing a periodic heartbeat check. Read the HEARTBEAT.md content below and follow its instructions strictly.

If all tasks are complete or nothing needs attention, reply with exactly: HEARTBEAT_OK
If any task requires action, perform it and report what you did. Keep responses concise.

If you learn anything worth remembering long-term, append it to memory/YYYY-MM-DD.md (create the memory/ directory and file if needed).

---
HEARTBEAT.md:
{file content}
---
```

`claude -p` runs in one-shot mode → naturally creates an isolated session each time (matching OpenClaw's `isolatedSession` behavior).

### 2. `workspace/HEARTBEAT.md` (new)

User-editable periodic task checklist. Ships "effectively empty" so heartbeat is skipped by default until user adds real tasks.

```markdown
# Heartbeat

<!--
  The agent reads this file periodically during heartbeat cycles.
  Add tasks below for the agent to check on each cycle.
  If empty (only headers/comments), the heartbeat is skipped to save API costs.
-->

## Tasks

-
```

### 3. `workspace/SOUL.md` (new)

Agent persona and behavioral boundaries. System-seeded template, user/agent-updatable. Loaded as context in every heartbeat prompt (and available to agents in normal sessions via AGENTS.md reference).

```markdown
# SOUL.md — Who You Are

## Core Truths
- You are a coding agent running inside an isolated Docker sandbox
- Be genuinely helpful, not performatively helpful
- Try first, ask later — you have full permissions in this sandbox
- Have opinions and preferences; don't be unnecessarily neutral

## Boundaries
- Work within the workspace/ directory — it persists across restarts
- Do not modify files in ~/install/ unless explicitly asked
- If you change this file, tell the user — it's your identity

## Vibe
- Be direct and concise
- Prefer working code over lengthy explanations
- When stuck, try a different approach before asking for help

## Continuity
- MEMORY.md is your long-term memory — read it at session start
- memory/YYYY-MM-DD.md files are your daily logs — append to today's file
- HEARTBEAT.md defines your periodic responsibilities
- These files *are* your memory across sessions
```

### 4. `workspace/MEMORY.md` (new)

Curated long-term memory. Starts with structure only — agent fills it over time. Daily logs go to `memory/YYYY-MM-DD.md` and get periodically distilled here.

```markdown
# MEMORY.md — Long-Term Memory

<!--
  This file stores curated, durable memories across sessions.
  The agent reads it at session start and updates it as needed.

  Daily logs go to memory/YYYY-MM-DD.md (append-only).
  Periodically distill daily logs into this file during heartbeats.
-->

## Decisions & Preferences

## Lessons Learned

## Project Context
```

### 5. `workspace/memory/.gitkeep` (new)

Empty file to ensure the `memory/` directory exists in the repo and image. Daily log files (`YYYY-MM-DD.md`) will be created here by the agent.

---

## Files to Modify

### 6. `Makefile`

- Add env var defaults at top: `HEARTBEAT_INTERVAL ?= 1800`, etc.
- Add to `.PHONY`: `heartbeat heartbeat-stop heartbeat-status`
- Add three targets:

```makefile
heartbeat:        # docker exec -d --user sandbox $(NAME) bash -c '...'
heartbeat-stop:   # docker exec --user sandbox $(NAME) bash -c '... stop'
heartbeat-status: # docker exec --user sandbox $(NAME) bash -c '... status'
```

Uses `--user sandbox` since `docker exec` defaults to root (no `USER` directive in Dockerfile). Uses `-d` (detached) for `heartbeat` so the loop runs in background.

### 7. `docker-compose.yml`

Add `environment:` block passing heartbeat config vars with defaults:

```yaml
environment:
  - HEARTBEAT_INTERVAL=${HEARTBEAT_INTERVAL:-1800}
  - HEARTBEAT_ACTIVE_START=${HEARTBEAT_ACTIVE_START:-}
  - HEARTBEAT_ACTIVE_END=${HEARTBEAT_ACTIVE_END:-}
  - HEARTBEAT_AGENT=${HEARTBEAT_AGENT:-claude}
```

### 8. `workspace/AGENTS.md`

Add sections documenting the three new files and how agents should interact with them:

- **Soul** section — reference SOUL.md, explain it defines persona/tone
- **Memory** section — explain MEMORY.md + `memory/YYYY-MM-DD.md` workflow:
  - Read MEMORY.md at session start for context
  - Append notable events/decisions to `memory/YYYY-MM-DD.md` during work
  - Periodically distill daily logs into MEMORY.md
  - If user says "remember this", write it to MEMORY.md immediately
- **Heartbeat** section — explain HEARTBEAT.md, control commands, log location

### 9. `README.md`

- Add `HEARTBEAT.md`, `SOUL.md`, `MEMORY.md`, `memory/`, `install/heartbeat.sh` to Structure tree
- Add three heartbeat targets to Makefile Targets table
- Add a "Heartbeat, Soul & Memory" section with overview and usage examples

---

## Implementation Order

1. Create `install/heartbeat.sh` (chmod +x)
2. Create `workspace/HEARTBEAT.md`
3. Create `workspace/SOUL.md`
4. Create `workspace/MEMORY.md`
5. Create `workspace/memory/.gitkeep`
6. Update `Makefile` — add vars, .PHONY, targets
7. Update `docker-compose.yml` — add environment block
8. Update `workspace/AGENTS.md` — add soul, memory, heartbeat sections
9. Update `README.md` — update structure, targets, add new section

## Verification

1. `make NAME=test-hb build && make NAME=test-hb run` — container starts normally
2. Verify `SOUL.md`, `MEMORY.md`, `HEARTBEAT.md`, `memory/` exist in container workspace
3. `make NAME=test-hb heartbeat-status` — reports "not running"
4. `make NAME=test-hb heartbeat` — starts heartbeat loop
5. `make NAME=test-hb heartbeat-status` — shows running PID, log tail
6. Check log shows "HEARTBEAT.md is effectively empty, skipping" (default template)
7. Edit `workspace/HEARTBEAT.md` to add a real task, wait for next cycle, verify agent runs and SOUL.md context is included in the prompt
8. Verify agent can write to `memory/YYYY-MM-DD.md` during heartbeat
9. `make NAME=test-hb heartbeat-stop` — cleanly stops
10. `make NAME=test-hb stop` — container shutdown sends SIGTERM, heartbeat exits cleanly
