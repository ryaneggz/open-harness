# Plan: Scaffold `dc-designer` Agent Sandbox

## Context

Provision an agent sandbox for [shpeedle/ai-datacenter-designer](https://github.com/shpeedle/ai-datacenter-designer) — a 50MW-200MW hyperscale datacenter facility design project with 14 plan documents, a FreeCAD parametric 3D model (`model_datacenter.py`), and an interactive HTML viewer. The agent will be a full-stack datacenter design engineer that iterates on all artifacts.

The repo is cloned directly into the workspace from the host (using host git auth), making provisioning reproducible from the agent branch.

---

## Step 1: Create GitHub Issue

```bash
gh issue create \
  --title "[AGENT] dc-designer -- datacenter design engineer" \
  --label "agent" \
  --body "$(cat <<'EOF'
## Identity

- **Name**: dc-designer
- **Role**: Full-stack datacenter design engineer — iterates on plan documents, 3D model code, and interactive viewer for ai-datacenter-designer

## Context

Works on github.com/shpeedle/ai-datacenter-designer:
- 50MW→200MW facility design with 14 interconnected plan documents
- FreeCAD Python parametric 3D model (~700 lines)
- Interactive HTML viewer for design plans
- Cloned directly into workspace (host auth, no fork)

FreeCAD is NOT installed in the container. Agent focuses on code quality, documentation consistency, viewer improvements, and parametric logic.

## Metadata

```yml
agent: "dc-designer"
branch: "agent/dc-designer"
worktree_path: ".worktrees/agent/dc-designer"
```

## Acceptance Criteria

- [ ] Container running (`docker ps | grep dc-designer`)
- [ ] Workspace accessible (`make NAME=dc-designer shell`)
- [ ] Claude CLI installed (`claude --version`)
- [ ] Repo cloned at `workspace/ai-datacenter-designer/`
- [ ] Heartbeat synced (`make NAME=dc-designer heartbeat-status`)
EOF
)"
```

## Step 2: Provision Sandbox

```bash
make NAME=dc-designer BASE_BRANCH=main quickstart
```

## Step 3: Clone Target Repo into Workspace (from host)

```bash
git clone https://github.com/shpeedle/ai-datacenter-designer.git \
  .worktrees/agent/dc-designer/workspace/ai-datacenter-designer
```

This uses the host's git auth. The workspace is bind-mounted, so the clone appears instantly inside the container. Reproducible — re-running this command on a fresh provision restores the repo.

## Step 4: Scaffold Workspace Files

All files written to `.worktrees/agent/dc-designer/workspace/` via host Write tool.

### 4a. `SOUL.md`

- **File**: `.worktrees/agent/dc-designer/workspace/SOUL.md`
- **Content**: Datacenter design engineer persona
  - Core truths: isolated Docker sandbox, works on ai-datacenter-designer, expertise in power/cooling/network/structural/phasing
  - FreeCAD limitation: NOT installed, can read/review/refactor model code but cannot execute; request install if needed
  - Vibe: precise, quantitative, systems-thinking, cite watts/BTUs/sqft/costs, flag constraint violations
  - Boundaries: workspace-only, never fabricate specs, never merge PRs automatically
  - Continuity: MEMORY.md, daily logs, heartbeats.conf

### 4b. `MEMORY.md`

- **File**: `.worktrees/agent/dc-designer/workspace/MEMORY.md`
- **Content**: Seeded with:
  - **Git workflow**: clone at `~/workspace/ai-datacenter-designer/`, default branch `main`, commit format `<type>: <description>`, feature branches `design/<topic>`
  - **Design parameters**: 50MW Phase 1 → 200MW, 14 plan docs, model_datacenter.py, viewer.html, output/ STLs
  - **FreeCAD status**: not installed, can review code but not execute
  - **Repo structure**: directory tree summary
  - **Key constraints**: power budget, PUE target (<1.10), redundancy levels, 4-phase rollout

### 4c. Skills

**`design-consistency`** — `.worktrees/agent/dc-designer/workspace/.claude/skills/design-consistency/SKILL.md`
- Validates cross-document consistency across all 14 plan documents
- Gates: power budget, cooling capacity >= 1.1x power, space allocation, cost coherence, phase alignment, redundancy claims, PUE feasibility
- Structured output with PASS/FAIL per gate
- Triggered: before PRs, after plan edits, during design review heartbeats

**`model-review`** — `.worktrees/agent/dc-designer/workspace/.claude/skills/model-review/SKILL.md`
- Reviews model_datacenter.py for code quality and plan alignment
- Criteria: parameter extraction (no magic numbers), dimension alignment with plans, modularity (<50 lines/fn), error handling, documentation, naming with units, phase scaling
- Structured output with PASS/WARN/FAIL per criterion
- Triggered: before PRs touching model, during code review heartbeats

### 4d. Heartbeats

**`heartbeats.conf`** — `.worktrees/agent/dc-designer/workspace/heartbeats.conf`
```
# Weekly design review — Wednesday 10am MT
0 10 * * 3 | heartbeats/design-review.md | claude

# Weekly memory distillation — Sunday 8pm MT
0 20 * * 0 | heartbeats/memory-distill.md | claude
```

**`heartbeats/design-review.md`**: Weekly tasks — pull latest from origin, run design-consistency skill, run model-review skill, check viewer, identify highest-impact improvement, create branch + commit + push if actionable, log summary to daily memory. Reply `HEARTBEAT_OK` if nothing needs attention.

**`heartbeats/memory-distill.md`**: Weekly — read daily logs from past week, distill into MEMORY.md sections, do not delete daily logs. Reply `HEARTBEAT_OK` if nothing to distill.

## Step 5: Sync Heartbeats

```bash
make NAME=dc-designer heartbeat
```

## Step 6: Verify

```bash
# Container running
docker ps --filter "name=dc-designer"

# Workspace files present
ls .worktrees/agent/dc-designer/workspace/{SOUL.md,MEMORY.md,heartbeats.conf}

# Repo cloned
ls .worktrees/agent/dc-designer/workspace/ai-datacenter-designer/model_datacenter.py

# Skills present
ls .worktrees/agent/dc-designer/workspace/.claude/skills/{design-consistency,model-review}/SKILL.md

# Heartbeat synced
make NAME=dc-designer heartbeat-status

# Claude CLI (inside container)
docker exec --user sandbox dc-designer claude --version
```

---

## Key Files Modified/Created

| File | Action |
|------|--------|
| `.worktrees/agent/dc-designer/workspace/SOUL.md` | Write (custom persona) |
| `.worktrees/agent/dc-designer/workspace/MEMORY.md` | Write (seeded context) |
| `.worktrees/agent/dc-designer/workspace/heartbeats.conf` | Write (custom schedule) |
| `.worktrees/agent/dc-designer/workspace/heartbeats/design-review.md` | Write (new) |
| `.worktrees/agent/dc-designer/workspace/heartbeats/memory-distill.md` | Write (new) |
| `.worktrees/agent/dc-designer/workspace/.claude/skills/design-consistency/SKILL.md` | Write (new) |
| `.worktrees/agent/dc-designer/workspace/.claude/skills/model-review/SKILL.md` | Write (new) |
| `.worktrees/agent/dc-designer/workspace/ai-datacenter-designer/` | Clone (from host) |

## Reference Files (reuse patterns from)

- `/workspace/SOUL.md` — base template structure
- `/workspace/heartbeats.conf` — heartbeat config format
- `.worktrees/agent/portfolio-mgr/workspace/SOUL.md` — domain-specific persona example
- `.worktrees/agent/portfolio-mgr/workspace/.claude/skills/risk-metrics/SKILL.md` — gate-based skill with structured output
