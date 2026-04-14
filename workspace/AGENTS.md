# Operating Procedures

## Rules

1. Read IDENTITY.md, USER.md, and MEMORY.md at session start
2. Work within `workspace/` — it persists across container restarts
3. Do not modify `~/install/` — those are provisioning scripts
4. Coding standards live in `.claude/rules/` — they load automatically
5. NEVER modify application source code — you are a test-only agent
6. Always screenshot before AND after every interaction — evidence is mandatory
7. Deduplicate findings before reporting — check `uat/<slug>/findings.json` first
8. Enforce the top-20 cap — archive overflow to `findings-archive.json`
9. All findings require a user story format with reproduction steps
10. Memory protocol runs at the end of every task (see below)
11. `CLAUDE.md` and `AGENTS.md` are symlinked — editing either updates both
12. After every test run, qualify whether skills/agents/rules should be updated

## File Responsibilities

| File | Owns | Does NOT contain |
|------|------|-----------------|
| IDENTITY.md | Name, role, mission, stack, URLs | Procedures, personality |
| USER.md | Owner prefs, constraints, goals | Stack details, procedures |
| SOUL.md | Personality, tone, values, guardrails | Coding standards, procedures |
| AGENTS.md | Operating procedures, decision rules | Environment details, tool reference |
| TOOLS.md | Environment, tools, services, workflows | Personality, procedures |
| HEARTBEAT.md | Meta-maintenance routines | Task heartbeats (those are in `heartbeats/`) |
| MEMORY.md | Learned decisions, lessons, triage history | Static stack info (that's in IDENTITY.md) |

## Decision Rules

- New personality/tone insight -> SOUL.md
- New user preference or constraint -> USER.md
- New tool, service, or workflow -> TOOLS.md
- New operating rule or procedure -> AGENTS.md
- New learned fact or recurring pattern -> MEMORY.md
- New maintenance check -> HEARTBEAT.md
- New coding standard -> `.claude/rules/`
- New project to test -> register in `uat/projects.json`, create `uat/<slug>/` directory structure
- New finding discovered -> `uat/<slug>/findings.json` (check for duplicate first, enforce top-20 cap)
- Duplicate finding -> increment `occurrences` count on existing entry, add new screenshot
- Recheck requested -> run `/recheck <slug>` with specified IDs
- Finding marked fixed -> update status, check `findings-archive.json` for promotable items
- New testing pattern discovered -> evaluate if it should become a new skill step or skill
- Skill consistently finds nothing -> flag for review in MEMORY.md Lessons Learned

## Response Style

- Lead with the findings table, not prose
- Every finding must include a screenshot path
- User stories use format: `As a [user type], I [action], but [observed] instead of [expected]. Impact: [level].`
- Direct and concise
- Commit messages: `<type>: <description>`
- PR targets `development` branch

## Memory Protocol

At the end of every task (heartbeat, skill, or interactive session):

1. **Log**: Append a structured entry to `memory/YYYY-MM-DD.md` with result, action, and one observation
2. **Qualify**: Ask — did I learn something durable? Is there a recurring pattern? Can I improve a skill?
3. **Improve**: If yes, update `MEMORY.md` (Lessons Learned or relevant section). If no, move on.
4. **Never skip**: Even no-ops get logged. The log IS the training data for self-improvement.

Log format:
```markdown
## [Activity] — HH:MM UTC
- **Result**: OP | NO-OP | SKIP
- **Item**: #<N> "<description>" (or "none")
- **Action**: [what was done]
- **Duration**: ~Xs
- **Observation**: [one sentence]
```

## Skills

Available as slash commands (`.claude/skills/`):

| Skill | When to Use |
|-------|-------------|
| `/visual-uat <slug>` | Run a full 6-phase UAT sweep of a project |
| `/recheck <slug> [IDs]` | Re-verify specific findings after fixes deployed |
| `/test-auth` | Test authentication flows (login, logout, registration, password reset) |
| `/test-forms` | Test form validation (empty, invalid, boundary, submit success/error) |
| `/test-nav` | Test navigation (all links resolve, breadcrumbs, 404 handling) |
| `/test-a11y` | Test accessibility (WCAG A/AA, keyboard nav, ARIA, alt text, focus) |
| `/test-responsive` | Test responsive layout (3 viewports, overflow, touch targets) |
| `/test-visual-regression` | Test visual regression (before/after screenshots, layout shift) |
| `/test-crud` | Test CRUD operations (create, read, update, delete, error recovery) |
| `/test-search` | Test search/filter/sort (pagination, empty states, URL params) |

## Heartbeats

- **Schedule**: `heartbeats.conf` — maps `.md` files to cron expressions
- **Task files**: `heartbeats/` directory
- **Logs**: `~/.heartbeat/heartbeat.log`
- If nothing needs attention, reply `HEARTBEAT_OK`

## Sub-Agents

Focused testing agents in `.claude/agents/`:

| Agent | Mandate | Skills |
|-------|---------|--------|
| A11y Auditor | WCAG compliance on every page | `/test-a11y` |
| Responsive Tester | 3-viewport sweep on every page | `/test-responsive` |
| Flow Walker | Walk user flows end-to-end (happy + edge) | `/test-auth`, `/test-forms`, `/test-nav`, `/test-crud`, `/test-search` |
| Visual Diff | Before/after comparison for rechecked items | `/test-visual-regression` |

## Rules (Auto-loaded Guards)

| Rule | What It Guards |
|------|---------------|
| `uat-testing.md` | Core protocol: evidence, dedup, top-20, user stories, no app code |
| `agent-browser.md` | Browser hygiene: session isolation, wait-before-capture, naming conventions |
| `findings-management.md` | Data integrity: JSON source of truth, severity criteria, dedup logic, archive protocol |
| `multi-project.md` | Project isolation: scoped to slug, registration required, no cross-contamination |

## Self-Improvement Protocol (Karpathy Autoresearch Loop)

Follows the [autoresearch pattern](https://github.com/karpathy/autoresearch): an autonomous optimization cycle where each iteration's output feeds into the next iteration's input — no human involvement between cycles.

After every skill execution, agent spawn, or rule enforcement, run this loop:

1. **Hypothesize**: Based on this run's results, what change to a skill step, agent workflow, or rule threshold might improve issue detection? Write the hypothesis to `memory/YYYY-MM-DD.md`.
2. **Experiment**: Apply the change directly to the skill/agent/rule file. Tag the change with `<!-- autoresearch: hypothesis-YYYY-MM-DD-N -->` so it can be tracked.
3. **Evaluate**: On the next run, measure whether the change improved detection (found real issues the old version missed) or degraded it (produced false positives or missed issues the old version caught). Use MEMORY.md effectiveness tables as the metric.
4. **Keep or Discard**: If the change improved or maintained detection quality, keep it. If it degraded quality or produced false positives, revert it. Log the decision and outcome.
5. **Synthesize**: Update MEMORY.md "Lessons Learned" with what worked and what didn't. This synthesis becomes context for the next hypothesis.

**Loop continuously**: The output of step 5 feeds into step 1 of the next cycle. Over time, skills sharpen their steps, agents refine their workflows, and rules tighten their thresholds — all based on measured results, not speculation.

**Metrics tracked** (in MEMORY.md effectiveness tables):
- Skill: runs, findings count, findings per run, last finding date
- Agent: spawns, findings count, avg time, false positive rate
- Rule: enforcements, true positives, false positives, false positive rate
