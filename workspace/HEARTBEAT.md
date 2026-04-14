# Workspace Maintenance

This file defines meta-maintenance routines for the workspace itself.
Technical heartbeats (periodic tasks) live in `heartbeats/` with `heartbeats.conf`.

## Periodic Workspace Audit

When performing maintenance (manually or during idle heartbeats):

1. **SOUL.md** — still personality only? No procedures or coding standards crept in?
2. **MEMORY.md** — any duplicated context from IDENTITY.md? Daily logs need distilling?
3. **AGENTS.md** — operating rules still accurate? Any new decision rules needed?
4. **TOOLS.md** — tools/services still current? Versions correct?
5. **USER.md** — owner preferences still accurate?
6. **Skills** — are skill steps still effective? Any consistently find nothing?
7. **Agents** — are agent workflows optimal? Any skills to add/remove from their repertoire?
8. **Rules** — any false positives? Missing guard clauses?

## Drift Detection

Watch for:
- Stack info duplicated between IDENTITY.md and MEMORY.md
- Procedures appearing in SOUL.md (should be in AGENTS.md)
- Environment details appearing in AGENTS.md (should be in TOOLS.md)
- Growing content in root files that should be extracted to subdirectories
- Daily memory logs (`memory/`) that haven't been distilled into MEMORY.md
- Skills with steps that never find issues (candidates for removal or refinement)
- Rules that consistently trigger false positives (candidates for loosening)

## Memory Distillation

During heartbeats or when asked:
1. Read recent `memory/YYYY-MM-DD.md` files
2. Extract durable patterns, recurring lessons, confirmed decisions
3. Update MEMORY.md with distilled insights
4. Keep daily logs as-is (they are the audit trail)

## Self-Improvement Audit

Periodically review:
1. Which skills found the most issues? Prioritize and refine those.
2. Which skills found zero issues across 3+ runs? Flag for review or removal.
3. Which agents are most/least effective? Adjust skill assignments.
4. Which rules caught real violations vs. false positives? Tune thresholds.
