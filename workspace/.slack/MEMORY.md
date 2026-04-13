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

- **Default PR base branch is `development`** (2026-04-12): When creating or editing GitHub PRs for this repo, explicitly set the base branch to `development`. Do not assume GitHub defaults are correct.
- **Implementation must use dedicated feature worktrees** (2026-04-12): Execution work should happen in dedicated git worktrees under `.worktrees/feat/`. Each workflow, bugfix, or PR gets its own unique worktree directory and must not reuse another worktree.

## Lessons Learned

<!-- Populated by the agent over time via Memory Improvement Protocol -->

- **gh auth resolved** (2026-04-08 07:00 UTC): gh CLI auth blocker from 2026-04-07 is now resolved. First successful issue triage query at 07:00 UTC after 5 consecutive skips. Provisioning now includes GH_TOKEN.
- **Ralph archive fix** (2026-04-08): ralph.sh only archived on branch change, never on completion. Fixed: archive on COMPLETE signal and max-iteration exit. Also fixed prd.json US-FINAL path format (singular→plural, merged→separate dirs). Always verify `.ralph/archives/` after Ralph runs.
- **Avoid shell interpolation when writing markdown with backticks** (2026-04-12): Creating GitHub issue/PR bodies or markdown docs via inline shell strings caused broken formatting (`$` prefixes, stripped code spans like `threadTs`, and command-not-found warnings). Prefer heredocs with single-quoted delimiters or write temp/body files directly, then inspect rendered text with `gh issue view` / `gh pr view` before considering the task done.
- **When asked to reflect process improvements, persist durable workflow constraints** (2026-04-12): User process requirements such as base branch selection and mandatory dedicated worktrees should be written to memory promptly so later planning/implementation automatically follows them.

## Triage History

<!-- Populated by issue-triage skill. Track patterns: issue types, planner quality, recurring themes. -->
