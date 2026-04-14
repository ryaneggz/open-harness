# OpenHarness: UAT Agent

> **Fork of [Open Harness](https://github.com/ryaneggz/open-harness)** — specialized for visual acceptance testing of deployed web applications.

A project-agnostic UAT agent that tests deployed web apps as a real user would. Uses headless Chromium (`agent-browser`) to navigate every user flow — authentication, CRUD operations, navigation, forms — across desktop, tablet, and mobile viewports. Identifies visual bugs, broken flows, accessibility violations, and UX issues. Produces a deduplicated, impact-ranked top-20 findings list per project as user stories.

## What This Fork Changes

| Area | Base Harness | UAT Agent Fork |
|------|-------------|----------------|
| **Purpose** | General-purpose agent sandbox | Visual acceptance testing |
| **Skills** | Dev tools (ci-status, repair, release, prd, ralph) | 10 testing skills (visual-uat, recheck, test-auth/forms/nav/a11y/responsive/crud/search/visual-regression) |
| **Sub-agents** | Dev planning (Implementer, Critic, PM, Council) | Testing specialists (A11y Auditor, Responsive Tester, Flow Walker, Visual Diff) |
| **Rules** | Code quality, Next.js, git, issue-triage | UAT protocol, agent-browser hygiene, findings management, multi-project isolation |
| **Data** | Next.js app in `projects/` | `uat/` directory with per-project findings, screenshots, test plans |
| **Output** | Code, PRs, commits | User stories, findings.json, findings.md, screenshot evidence |
| **Self-improvement** | Memory protocol | Karpathy autoresearch loop (hypothesize → experiment → evaluate → keep/discard) |

## Origin Prompt

> Provision a dedicated UAT agent that performs visual acceptance testing of deployed web applications using the `agent-browser` CLI (headless Chromium). The agent accepts an app URL and login instructions, then systematically navigates every user flow as a real user would — authentication, CRUD operations, navigation, forms — across desktop, tablet, and mobile viewports.
>
> **Multi-project**: Supports testing multiple projects concurrently. Each project is registered with a slug, URL, and login instructions, and gets its own isolated findings directory.
>
> **Findings**: Compiles a deduplicated, impact-ranked top-20 findings list per project as user stories. Severity levels: Critical (crash/data loss/auth bypass), High (broken flow/wrong data), Medium (visual glitch/UX/a11y), Low (cosmetic). Overflow beyond 20 is archived and promoted back when higher-ranked items are fixed. Dual format — JSON (source of truth) + Markdown (human-readable report).
>
> **Recheck loop**: The user manually details which issues were fixed and redeployed. The agent re-verifies those specific items by replaying the original reproduction steps, reporting PASS/FAIL/CHANGED for each.
>
> **Sub-agents**: Focused specialists spawned in parallel — Accessibility Auditor (WCAG, keyboard nav, ARIA), Responsive Tester (3-viewport sweep), Flow Walker (happy path + edge cases), Visual Diff (before/after regression detection).
>
> **Skills library**: 8 pre-built testing skills composed into focused agents. Rules auto-loaded from `.claude/rules/` govern testing protocol.
>
> **Self-improving**: All skills, agents, and rules include a feedback loop via the Karpathy autoresearch pattern. After every execution: log results, hypothesize improvements, experiment, evaluate, keep or discard.
>
> **Does not** write application code, deploy fixes, or merge PRs. Test-only agent.

## Quick Start

```bash
# 1. Enter the sandbox
docker exec -it -u sandbox openharness bash

# 2. Start the agent
claude

# 3. Register a project and run UAT
/visual-uat my-app
# (agent prompts for URL and login if not registered)

# 4. Review findings
cat workspace/uat/my-app/findings.md

# 5. Recheck after fixes
/recheck my-app UAT-001 UAT-005
```

## Skills

| Skill | Purpose |
|-------|---------|
| `/visual-uat <slug>` | Full 6-phase UAT sweep |
| `/recheck <slug> [IDs]` | Re-verify fixes (PASS/FAIL/CHANGED) |
| `/test-auth` | Login, logout, registration, session persistence |
| `/test-forms` | Validation, submit, multi-step, file upload |
| `/test-nav` | Links, breadcrumbs, 404, back/forward |
| `/test-a11y` | WCAG A/AA, keyboard nav, ARIA, contrast |
| `/test-responsive` | Desktop/tablet/mobile viewports |
| `/test-visual-regression` | Before/after screenshot comparison |
| `/test-crud` | Create, read, update, delete operations |
| `/test-search` | Search, filter, sort, pagination |

## Sub-Agents

| Agent | Skills | Spawned By |
|-------|--------|------------|
| **A11y Auditor** | `/test-a11y` | `/visual-uat` per page |
| **Responsive Tester** | `/test-responsive` | `/visual-uat` per page |
| **Flow Walker** | `/test-auth`, `/test-forms`, `/test-nav`, `/test-crud`, `/test-search` | `/visual-uat` per flow |
| **Visual Diff** | `/test-visual-regression` | `/recheck` |

## Rules (Auto-loaded Guards)

| Rule | Guards |
|------|--------|
| `uat-testing.md` | Evidence required, dedup, top-20 cap, user story format, no app code |
| `agent-browser.md` | Session isolation, wait-before-capture, viewport naming |
| `findings-management.md` | JSON source of truth, severity criteria, dedup logic, archive protocol |
| `multi-project.md` | Project scoping, registration required, no cross-contamination |

## Findings Format

**Severity**: Critical > High > Medium > Low (tiebreaker: frequency, then user-facing-ness)

**User story**: `As a [user type], I [action], but [observed] instead of [expected]. Impact: [level].`

**Top-20 cap**: Active list maxes at 20 per project. Overflow archived. Fixed items removed; archived items promoted.

## Architecture

```
workspace/
  uat/                           # Per-project findings and evidence
    projects.json                # Project registry
    <slug>/findings.json         # Source of truth (top 20)
    <slug>/findings.md           # Human-readable report
    <slug>/findings-archive.json # Overflow
    <slug>/test-plan.md          # Discovered pages/flows
    <slug>/screenshots/          # Evidence by date
  .claude/
    skills/                      # 10 testing skills + quality-gate + strategy-review
    agents/                      # 4 focused testing sub-agents
    rules/                       # 4 UAT guards + git + code-quality
  SOUL.md                        # UAT tester persona
  AGENTS.md                      # Operating procedures
  IDENTITY.md                    # Agent metadata
  TOOLS.md                       # Environment + agent-browser reference
  MEMORY.md                      # Effectiveness tracking tables
```

## Self-Improvement (Autoresearch Loop)

Based on [Karpathy's autoresearch](https://github.com/karpathy/autoresearch):

1. **Hypothesize** — what change might improve detection?
2. **Experiment** — apply change, tag with `<!-- autoresearch -->`
3. **Evaluate** — did detection improve? Check MEMORY.md effectiveness tables
4. **Keep or Discard** — improved → keep. Not → revert
5. **Synthesize** — update Lessons Learned → feeds next hypothesis

MEMORY.md tracks: skill runs/findings, agent spawns/findings, rule enforcements/true positives/false positives.

---

**Base harness**: [ryaneggz/open-harness](https://github.com/ryaneggz/open-harness) | **Branch**: `agent/uat-tester` | **Issue**: #47
