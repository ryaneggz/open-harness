# HEARTBEAT — Meta-Maintenance Audit

Meta-maintenance routines for identity-file hygiene, drift detection, and memory distillation. Task heartbeats (cron) live in `heartbeats/*.md` as YAML-frontmatter markdown.

## Periodic Audit (weekly, end of Friday distill)

Verify each identity file owns only its concern:

| File | Contains | Does NOT contain |
|------|---------|-------------------|
| `IDENTITY.md` | name, role, mission, stack, URLs, branch | procedures, personality, ICP thresholds |
| `SOUL.md` | personality, tone, values, guardrails | coding standards, procedures |
| `USER.md` | principal profile, territory, ICP, owner prefs | stack details, procedures |
| `AGENTS.md` | operating procedures, decision rules | environment details, personality |
| `TOOLS.md` | environment, tools, services, workflows | personality, procedures |
| `MEMORY.md` | learned decisions, lessons, triage history | static stack info |

Drift = lint failure. Surface and propose a move.

## Drift Checks

- Stack info in `MEMORY.md`? → `IDENTITY.md` or `TOOLS.md`
- Procedures in `SOUL.md`? → `AGENTS.md`
- ICP in `IDENTITY.md`? → `USER.md`
- Coding standards anywhere except `.claude/rules/`? → move
- `qual_*` field definitions outside `schema.json` / spec 01? → collapse

## Memory Distillation (weekly, `memory-distill` heartbeat)

1. Read `memory/YYYY-MM-DD.md` from last 7 days.
2. Extract durable patterns: winning objection handles, new ICP signals, template-coverage gaps, deliverability incidents.
3. Update `MEMORY.md` under **Lessons Learned** and **Decision Log** with citations to daily logs.
4. Keep daily logs as-is (audit trail). Distillation is additive.
5. `HEARTBEAT_OK` if nothing new.

## Template-Library Hygiene (weekly, piggybacks on pipeline-review)

1. `/template-library --gaps` — list missing vertical × touch combinations.
2. Prioritize gaps where pending `new` or `contacted` leads exist.
3. Top 3 gaps → surface to owner; `template-write/` drafts proposals.
