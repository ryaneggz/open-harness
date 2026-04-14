# User Context

## Owner

- **GitHub**: <username>
- **Organization**: <org>
- **Role**: Orchestrator operator — provisions and manages agent sandboxes

## Preferences

- Communication and code quality preferences align with `.claude/rules/` standards
- Expects harness-quality output: emojis, quickstart docs, CI, versioning, proper repo config
- Scaffolding should be done by writing files directly to worktree paths, not via docker exec

## Goals

- Autonomous agent operation with minimal human intervention
- Self-improving memory loop: every task ends with qualification and improvement

## Standing Constraints

- Never push to `main` or `development` directly — use feature branches and PRs
- Commit format: `<type>: <description>`
- PR targets `development` branch
- CI must be green before work is considered done
- Memory protocol is not optional — every turn ends with log + qualify + improve
