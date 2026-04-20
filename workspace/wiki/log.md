# Wiki Operations Log

Append-only record of all wiki operations. Do not edit existing entries.
Rotation: wiki-lint trims to last 200 entries when exceeded.

<!-- Entry format:
## [INGEST|QUERY|LINT] — YYYY-MM-DD HH:MM UTC
- **Pages**: [page filenames created/updated]
- **Sources**: [source filenames referenced]
- **Summary**: [one sentence]
-->

## [INGEST] — 2026-04-19 12:45 UTC
- **Pages**: orchestrator-worktree-architecture.md
- **Sources**: .claude/specs/orchestrator-worktree-architecture.md, .claude/specs/multi-worktree-heartbeats-spec.md
- **Summary**: Adapted canonical orchestrator+worktree topology spec into a concept-type wiki page alongside docs-site propagation (issue #83).
