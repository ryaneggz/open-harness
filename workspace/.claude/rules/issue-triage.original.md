# Issue Triage Workflow

## Decision Flow

When triaging issues from `ryaneggz/next-postgres-shadcn`:

1. **Always log first** — echo op/no-op BEFORE any mutation
2. **Check all guards** — branch exists? PR exists? Already assigned? Skip if any guard triggers
3. **Assign before planning** — `gh issue edit --add-assignee @me` locks the issue
4. **Parallel sub-agents** — spawn Implementer, Critic, PM simultaneously (never sequentially)
5. **Council synthesizes** — single Expert AI Council pass produces the final plan
6. **PR body IS the plan** — no separate plan files committed to the branch
7. **Feature branch convention** — `feat/<issue#>-<shortdesc>` (lowercase, hyphens, max 40 chars)
8. **Commit format** — `<type>(#<issue>): <description>`
9. **Memory protocol** — log + qualify + improve at the end of EVERY run

## Sub-Agent Rules

- Each sub-agent reads IDENTITY.md and MEMORY.md for stack context
- Sub-agents produce concise analyses (< 500 words each), NOT full plans
- The three perspectives must be adversarial/complementary — they should challenge each other
- Sub-agents do NOT see each other's output — only the Council sees all three

## Template Matching

| Issue Title Prefix | Label | Template |
|-------------------|-------|----------|
| `[FEAT]` | enhancement | feature.md |
| `[TASK]` | task | task.md |
| `[BUG]` | bug | bug.md |
| `[SKILL]` | skill | skill.md |
| no match | — | task.md (default) |

## Idempotency

- Query uses `assignee=none` — already-assigned issues are invisible
- Branch guard prevents duplicate branches
- PR guard prevents duplicate PRs
- flock prevents overlapping heartbeat runs
