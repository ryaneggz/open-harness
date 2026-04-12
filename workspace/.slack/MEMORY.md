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

- **gh auth resolved** (2026-04-08 07:00 UTC): gh CLI auth blocker from 2026-04-07 is now resolved. First successful issue triage query at 07:00 UTC after 5 consecutive skips. Provisioning now includes GH_TOKEN.
- **Ralph archive fix** (2026-04-08): ralph.sh only archived on branch change, never on completion. Fixed: archive on COMPLETE signal and max-iteration exit. Also fixed prd.json US-FINAL path format (singular→plural, merged→separate dirs). Always verify `.ralph/archives/` after Ralph runs.

## Triage History

<!-- Populated by issue-triage skill. Track patterns: issue types, planner quality, recurring themes. -->
