# MEMORY.md — Long-Term Memory

<!--
  Curated, durable memories across sessions. Read at session start.
  Daily logs: memory/YYYY-MM-DD.md (append-only).
  Distill daily logs here during heartbeats.

  What belongs here: runtime decisions, learned patterns, lessons from experience.
  What does NOT belong here: static stack/identity info (that's in IDENTITY.md),
  environment details (TOOLS.md), or coding standards (.claude/rules/).
-->

## Decisions & Preferences

<!-- Runtime decisions that emerged from experience, not initial setup -->

## Lessons Learned

<!-- Populated by the agent over time via Memory Improvement Protocol -->

- **gh auth blocks issue triage** (2026-04-07 → 2026-04-08): Sandbox lacks GH_TOKEN / gh auth. Issue triage has skipped 5 consecutive runs. Fix: provision GH_TOKEN in environment or run `gh auth login` once. This is a setup gap, not transient.

## Triage History

<!-- Populated by issue-triage skill. Track patterns: issue types, planner quality, recurring themes. -->
