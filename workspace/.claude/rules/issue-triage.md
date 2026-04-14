# Issue Triage

## Flow

1. Log op/no-op BEFORE mutation
2. Check guards — branch exists? PR exists? Assigned? Skip if any
3. Assign first: `gh issue edit --add-assignee @me`
4. Spawn Implementer + Critic + PM in parallel (never sequential)
5. Council synthesizes → final plan
6. PR body IS plan — no separate plan files
7. Branch: `feat/<issue#>-<shortdesc>` (lowercase, hyphens, max 40)
8. Commits: `<type>(#<issue>): <description>`
9. Memory protocol every run

## Sub-Agents

- Read IDENTITY.md + MEMORY.md for context
- < 500 words each, NOT full plans
- Adversarial/complementary — challenge each other
- Don't see each other's output — only Council sees all

## Templates

| Prefix | Label | Template |
|--------|-------|----------|
| `[FEAT]` | enhancement | feature.md |
| `[TASK]` | task | task.md |
| `[BUG]` | bug | bug.md |
| `[SKILL]` | skill | skill.md |
| none | — | task.md |

## Idempotency

`assignee=none` filter. Branch/PR/flock guards prevent duplicates.
