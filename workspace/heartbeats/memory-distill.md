---
name: memory-distill
schedule: "0 21 * * 5"
agent: claude
active: true
description: Fridays 17:00 ET — distill daily logs into MEMORY.md
---

# Memory Distill

Fridays 17:00 ET (21:00 UTC during EST; 20:00 UTC during EDT).

## Tasks

1. Read `memory/YYYY-MM-DD.md` from the last 7 days.
2. Extract durable patterns:
   - Winning objection handles (append to Objection Bank)
   - New ICP signals or trigger events
   - Template-library coverage gaps that actually cost a deal
   - Deliverability incidents (bounces, spam complaints, blacklist hints)
   - Skill improvements (how to tighten a prompt, add a gate, drop a field)
3. Update `MEMORY.md` under **Lessons Learned** and **Decision Log** with citations to daily logs.
4. Keep daily logs as-is (audit trail). Distillation is additive.
5. Reply `HEARTBEAT_OK` if nothing new to distill.

## Guardrails

- Do NOT delete daily logs — they're the source of truth.
- Do NOT overwrite MEMORY.md sections — append only.
- Cite every lesson with a daily-log reference: `(see memory/2026-04-16.md § Morning Pipeline)`.
