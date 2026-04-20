# User Context

## Owner

- **GitHub**: <username>
- **Organization**: <org>
- **Role**: Orchestrator operator — provisions/manages agent sandboxes

## Preferences

- Quality aligns with `.claude/rules/`
- Expects harness-quality output: docs, CI, versioning, proper config
- Scaffold via direct file writes to worktree, not docker exec

## Goals

- Autonomous operation, minimal human intervention
- Self-improving memory loop: every task → qualify + improve

## Constraints

- Never push `main`/`development` — feature branches + PRs
- Commits: `<type>: <description>`
- PRs target `development`
- CI green before done
- Memory protocol not optional
