# Operating Procedures

## Rules

1. Read IDENTITY.md, USER.md, and MEMORY.md at session start
2. Work within `workspace/` — it persists across container restarts
3. Do not modify `~/install/` — those are provisioning scripts
4. Coding standards live in `.claude/rules/` — they load automatically
5. `CLAUDE.md` and `AGENTS.md` are symlinked — editing either updates both
6. Memory protocol runs at the end of every task (see below)
7. `.openharness/` is available in the workspace root as a symlink to the project-level Open Harness config

## File Responsibilities

| File | Owns | Does NOT contain |
|------|------|-----------------|
| IDENTITY.md | Name, role, mission, stack, URLs | Procedures, personality |
| USER.md | Owner prefs, constraints, goals | Stack details, procedures |
| SOUL.md | Personality, tone, values, guardrails | Coding standards, procedures |
| AGENTS.md | Operating procedures, decision rules | Environment details, tool reference |
| TOOLS.md | Environment, tools, services, workflows | Personality, procedures |
| HEARTBEAT.md | Meta-maintenance routines | Task heartbeats (those are in `heartbeats/`) |
| MEMORY.md | Learned decisions, lessons | Static stack info (that's in IDENTITY.md) |

## Decision Rules

- New personality/tone insight -> SOUL.md
- New user preference or constraint -> USER.md
- New tool, service, or workflow -> TOOLS.md
- New operating rule or procedure -> AGENTS.md
- New learned fact or recurring pattern -> MEMORY.md
- New maintenance check -> HEARTBEAT.md
- New coding standard -> `.claude/rules/`

## Response Style

- Lead with working code, not explanations
- Direct and concise
- Keep commits small and focused

## Memory Protocol

At the end of every task (heartbeat, skill, or interactive session):

1. **Log**: Append a structured entry to `memory/YYYY-MM-DD.md` with result, action, and one observation
2. **Qualify**: Ask — did I learn something durable? Is there a recurring pattern? Can I improve a skill?
3. **Improve**: If yes, update `MEMORY.md` (Lessons Learned or relevant section). If no, move on.
4. **Never skip**: Even no-ops get logged.

## Heartbeats

- **Schedule config**: `heartbeats.conf` — maps `.md` files to cron expressions
- **Format**: `<cron> | <file> | [agent] | [active_start-active_end]` (pipe-delimited)
- **Task files**: `heartbeats/` directory (default: `heartbeats/default.md`)
- **Manage from host**: `openharness heartbeat sync <name>`, `openharness heartbeat stop <name>`, `openharness heartbeat status <name>`
- **Logs**: `~/.heartbeat/heartbeat.log`
- Schedules auto-sync on container startup from `heartbeats.conf`
- If a heartbeat file is empty (only headers/comments), that execution is skipped to save API costs
- If nothing needs attention, reply `HEARTBEAT_OK`
