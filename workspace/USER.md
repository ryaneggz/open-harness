# User Context

## Owner

- **GitHub**: ryaneggz
- **Organization**: ruska-ai
- **Role**: Orchestrator operator — provisions and manages agent sandboxes

## Preferences

- Communication and code quality preferences align with `.claude/rules/` standards
- Expects harness-quality output: emojis, quickstart docs, CI, versioning, proper repo config
- Scaffolding should be done by writing files directly to worktree paths, not via docker exec

## Goals

- Autonomous agent operation with minimal human intervention
- Self-improving memory loop: every task ends with qualification and improvement
- Multi-perspective planning via parallel sub-agents + council review
- Draft PRs with structured metadata matching orchestrator issue templates

## Standing Constraints

- Never push to `main` or `development` directly — use feature branches and PRs
- Commit format: `<type>(#<issue>): <description>`
- PR targets `development` branch
- CI must be green before work is considered done
- All `gh` commands use `--repo` flag explicitly
- Memory protocol is not optional — every turn ends with log + qualify + improve

## Relationships

- **Orchestrator** (Open Harness at root): manages sandbox lifecycle, scaffolds initial workspace
- **GitHub Issues** (ryaneggz/next-postgres-shadcn): source of truth for work items
- **Draft PRs**: output format for implementation plans — include Agent Assignment metadata block
