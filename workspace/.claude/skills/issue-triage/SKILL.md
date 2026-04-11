---
name: issue-triage
description: |
  Triage open, unassigned GitHub issues in ryaneggz/next-postgres-shadcn.
  Spawns parallel sub-agents (Implementer, Critic, PM) for independent analysis,
  then an Expert AI Council synthesizes the final plan as a draft PR.
  TRIGGER when: heartbeat (hourly), or when asked to triage issues, check for
  new issues, or run issue triage.
---

# Issue Triage

Autonomously triage open, unassigned GitHub issues by spawning parallel expert sub-agents,
synthesizing their analyses via an Expert AI Council, and opening a draft PR with the
implementation plan.

## Decision Flow

```mermaid
flowchart TD
    A[Query: gh api issues?assignee=none] --> B{Issues found?}
    B -->|No| C["Log: NO-OP"]
    C --> MEM_NOOP[Memory Protocol]
    MEM_NOOP --> Z1[HEARTBEAT_OK]

    B -->|Yes| D["Log: OP #N title"]
    D --> E{Branch exists?<br>git ls-remote feat/N-slug}
    E -->|Yes| F["Log: SKIP branch exists"]
    F --> MEM_SKIP1[Memory Protocol]
    MEM_SKIP1 --> Z2[HEARTBEAT_OK]

    E -->|No| G{Draft PR exists?<br>gh pr list --head}
    G -->|Yes| H["Log: SKIP PR exists"]
    H --> MEM_SKIP2[Memory Protocol]
    MEM_SKIP2 --> Z3[HEARTBEAT_OK]

    G -->|No| I[Assign: gh issue edit --add-assignee @me]
    I --> J[Spawn 3 Sub-agents in parallel]

    J --> J1[Implementer<br>how to build it<br>sonnet]
    J --> J2[Critic<br>what could go wrong<br>sonnet]
    J --> J3[PM<br>task breakdown<br>sonnet]

    J1 & J2 & J3 --> K[Expert AI Council<br>opus]
    K --> L{Select template type}
    L -->|feature| L1[Feature template]
    L -->|task| L2[Task template]
    L -->|bug| L3[Bug template]
    L -->|skill| L4[Skill template]

    L1 & L2 & L3 & L4 --> M[Populate Agent Assignment metadata]
    M --> N[Create branch: feat/N-slug]
    N --> O[Push branch]
    O --> P[gh pr create --draft<br>body = council plan]
    P --> Q[git checkout agent/next-postgres-shadcn]
    Q --> MEM_OP[Memory Protocol]
    MEM_OP --> Z4[Report: assigned + PR URL]
```

## Instructions

### 1. Query for unassigned issues

```bash
gh api "repos/ryaneggz/next-postgres-shadcn/issues?state=open&assignee=none&sort=created&direction=asc&per_page=1"
```

This returns the oldest open unassigned issue as a JSON array. Parse the first element for `number`, `title`, `body`, `url`, and `labels`.

### 2. Log op/no-op — BEFORE any mutation

If the array is empty:
```
echo "[issue-triage] NO-OP: No unassigned issues found"
```
Then run the **Memory Improvement Protocol** (step 11) and reply `HEARTBEAT_OK`. Stop here.

If an issue is found:
```
echo "[issue-triage] OP: Found issue #<N> \"<title>\""
```
Continue to step 3.

### 3. Guard: existing branch

```bash
git ls-remote --heads origin "feat/<N>-<shortdesc>"
```

Where `<shortdesc>` is derived from the title: lowercase, spaces to hyphens, strip non-alphanumeric, truncate to 40 chars.

If output is non-empty, log `[issue-triage] SKIP: Branch feat/<N>-<shortdesc> already exists` → Memory Protocol → `HEARTBEAT_OK`.

### 4. Guard: existing PR

```bash
gh pr list --repo ryaneggz/next-postgres-shadcn --head "feat/<N>-<shortdesc>" --state open --json number --jq 'length'
```

If result > 0, log `[issue-triage] SKIP: Draft PR already exists` → Memory Protocol → `HEARTBEAT_OK`.

### 5. Assign the issue

```bash
gh issue edit <N> --repo ryaneggz/next-postgres-shadcn --add-assignee @me
```

### 6. Spawn parallel sub-agents

Launch 3 Agent tool calls **in a single message** (parallel execution). Each sub-agent is defined in `.claude/agents/`:

| Sub-agent | Agent file | Perspective | Model |
|-----------|-----------|-------------|-------|
| **Implementer** | `.claude/agents/implementer.md` | "Here's how I'd build this" — practical approach, affected files, architecture | sonnet |
| **Critic** | `.claude/agents/critic.md` | "Here's what could go wrong" — edge cases, security, performance, failure modes | sonnet |
| **PM** | `.claude/agents/pm.md` | "Here's how to break it down" — tasks, contracts, model delegation, ordering | sonnet |

Pass each sub-agent:
- Issue number, title, body, URL, and labels
- Instruction to read `IDENTITY.md` and `MEMORY.md` for stack context
- Instruction to follow their agent definition's output format exactly

The three perspectives are **adversarial/complementary**: Implementer proposes, Critic challenges, PM structures. Sub-agents do NOT see each other's output.

### 7. Expert AI Council

Launch a single Agent tool call using the council agent (`.claude/agents/council.md`):

```mermaid
flowchart TD
    IN1[Implementer Analysis<br>how to build it] --> COUNCIL[Expert AI Council]
    IN2[Critic Analysis<br>what could go wrong] --> COUNCIL
    IN3[PM Task Breakdown<br>how to decompose] --> COUNCIL

    COUNCIL --> CLASSIFY{Classify issue type}
    CLASSIFY -->|"[FEAT] or label:enhancement"| FEAT[Use feature.md template]
    CLASSIFY -->|"[TASK] or label:task"| TASK[Use task.md template]
    CLASSIFY -->|"[BUG] or label:bug"| BUG[Use bug.md template]
    CLASSIFY -->|"[SKILL] or label:skill"| SKILL[Use skill.md template]
    CLASSIFY -->|"no match"| TASK

    FEAT & TASK & BUG & SKILL --> RESOLVE[Resolve conflicts<br>between analyses]
    RESOLVE --> VALIDATE[Validate PM tasks<br>against technical analyses]
    VALIDATE --> FORMAT[Format final plan<br>using template structure]
    FORMAT --> META["Populate metadata block:<br>agent, branch, worktree_path,<br>pull_request"]
    META --> OUTPUT[Final plan output<br>= PR body]
```

Pass the Council:
- All three sub-agent analyses
- Issue number, title, shortdesc (for metadata block)
- Instruction to read `.github/ISSUE_TEMPLATE/` for the matching template structure
- The Agent Assignment metadata values to populate:
  ```yml
  agent: "next-postgres-shadcn"
  branch: "feat/<N>-<shortdesc>"
  worktree_path: ".worktrees/agent/next-postgres-shadcn"
  pull_request: "FROM feat/<N>-<shortdesc> TO development"
  ```

The Council's output becomes the PR body directly.

### 8. Create feature branch

```bash
SHORTDESC=$(echo "<title>" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9 ]//g' | tr ' ' '-' | cut -c1-40 | sed 's/-$//')
BRANCH="feat/<N>-${SHORTDESC}"

git fetch origin agent/next-postgres-shadcn
git checkout -b "$BRANCH" origin/agent/next-postgres-shadcn
git push -u origin "$BRANCH"
```

### 9. Open draft PR

```bash
gh pr create \
  --repo ryaneggz/next-postgres-shadcn \
  --base development \
  --head "$BRANCH" \
  --title "<type>(#<N>): <title>" \
  --draft \
  --body "<council output>"
```

The `<type>` is determined by the Council's classification:
- `[FEAT]` → `feat`
- `[TASK]` → `task`
- `[BUG]` → `fix`
- `[SKILL]` → `skill`

The PR body IS the plan. No files are committed to the branch — it exists only to host the draft PR. Implementation commits come later when the plan is approved.

### 10. Cleanup

```bash
git checkout agent/next-postgres-shadcn
```

### 11. Memory Improvement Protocol

This runs at the end of **EVERY** execution — op, no-op, or guard skip.

```mermaid
flowchart TD
    TASK_END[Task complete<br>op or no-op] --> LOG["1. LOG<br>Append structured entry to<br>memory/YYYY-MM-DD.md"]
    LOG --> Q1{Error or<br>unexpected state?}
    Q1 -->|Yes| LESSON["Record lesson"]
    Q1 -->|No| Q2{Guard caught<br>duplicate?}
    Q2 -->|Yes| CONFIRM["Note: idempotency confirmed"]
    Q2 -->|No| Q3{Recurring pattern<br>in recent logs?}
    Q3 -->|Yes| DISTILL["Distill to MEMORY.md"]
    Q3 -->|No| Q4{Skill improvement<br>possible?}
    Q4 -->|Yes| SUGGEST["Note suggestion in daily log"]
    Q4 -->|No| DONE_NOOP["No improvement needed"]

    LESSON --> IMPROVE{Actionable?}
    CONFIRM --> IMPROVE
    DISTILL --> IMPROVE
    SUGGEST --> IMPROVE

    IMPROVE -->|Yes| UPDATE["Update MEMORY.md:<br>Lessons Learned or<br>Triage History"]
    IMPROVE -->|No| DONE_NOOP

    UPDATE --> REPORT["HEARTBEAT_OK — memory updated"]
    DONE_NOOP --> REPORT2["HEARTBEAT_OK"]
```

**a) Log** — append to `memory/YYYY-MM-DD.md`:

```markdown
## Issue Triage — HH:MM UTC
- **Result**: OP | NO-OP | SKIP
- **Issue**: #<N> "<title>" (or "none")
- **Action taken**: assigned + draft PR / skipped (guard) / no issues
- **Duration**: ~Xs
- **Observation**: <one sentence — what was notable, unexpected, or confirmed>
```

**b) Qualify** — ask yourself:
- Did I encounter an error or unexpected state? → Log as lesson
- Did a guard catch a duplicate? → Note idempotency confirmed
- Did the planner council produce a good plan? → Note what worked/didn't
- Is there a recurring pattern across recent daily logs? → Distill into MEMORY.md
- Can this skill be improved based on this run? → Note suggestion

**c) Improve** — if qualification found something actionable:
- Append to `MEMORY.md > Lessons Learned` for durable insights
- Append to `MEMORY.md > Triage History` for patterns
- Do NOT update MEMORY.md for routine no-ops — only when there's signal

**d) Report** — end with:
- `HEARTBEAT_OK` (routine no-op)
- `HEARTBEAT_OK — memory updated` (learned something)
- Full report (op — what was done + what was learned)

## Reference

### Issue Template Mapping

| Title Prefix | Label | Template | Commit Type |
|-------------|-------|----------|-------------|
| `[FEAT]` | enhancement | feature.md | feat |
| `[TASK]` | task | task.md | task |
| `[BUG]` | bug | bug.md | fix |
| `[SKILL]` | skill | skill.md | skill |
| no match | — | task.md | task |

### Key Resources

| Resource | Path |
|----------|------|
| Agent: Implementer | `.claude/agents/implementer.md` |
| Agent: Critic | `.claude/agents/critic.md` |
| Agent: PM | `.claude/agents/pm.md` |
| Agent: Council | `.claude/agents/council.md` |
| Rule: Issue Triage | `.claude/rules/issue-triage.md` |
| Issue Templates | `.github/ISSUE_TEMPLATE/` |
| Identity | `IDENTITY.md` |
| Memory | `MEMORY.md` |
| Daily Logs | `memory/YYYY-MM-DD.md` |
