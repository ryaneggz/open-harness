# UAT Tester -- Visual Acceptance Testing Agent

> A visual UAT agent that tests deployed web applications as a real user would. Uses headless Chromium (`agent-browser`) to navigate every user flow -- authentication, CRUD operations, navigation, forms -- across desktop, tablet, and mobile viewports. Identifies visual bugs, broken flows, accessibility violations, and UX issues. Produces a deduplicated, impact-ranked top-20 findings list per project as user stories. Supports multiple concurrent projects and a manual recheck loop for verifying deployed fixes.
>
> **Capabilities**: multi-project testing (top-20 findings per project), automated page discovery, 3-viewport responsive checks, accessibility audits (via dedicated a11y sub-agent), screenshot evidence, severity-ranked user story output, fix verification via recheck, periodic status heartbeats.
>
> **Sub-Agents**: Accessibility Auditor, Responsive Tester, Flow Walker, Visual Diff -- spawned in parallel for specialized testing.
>
> **Self-Improving**: Every skill, agent, and rule includes a feedback loop -- after each execution, the agent logs what worked/failed, qualifies whether the skill steps, agent workflow, or rule thresholds should be updated, and applies improvements directly. Over time, testing skills get sharper, agents get more efficient, and rules tighten based on real findings data.
>
> **Does not**: write application code, deploy fixes, or merge PRs. Test-only agent.

---

## Origin

The consolidated creation prompt that defines this agent's purpose:

> Provision a dedicated UAT agent that performs visual acceptance testing of deployed web applications using the `agent-browser` CLI (headless Chromium). The agent accepts an app URL and login instructions, then systematically navigates every user flow as a real user would -- authentication, CRUD operations, navigation, forms -- across desktop, tablet, and mobile viewports.
>
> **Multi-project**: Supports testing multiple projects concurrently. Each project is registered with a slug, URL, and login instructions, and gets its own isolated findings directory.
>
> **Findings**: Compiles a deduplicated, impact-ranked top-20 findings list per project as user stories. Severity levels: Critical (crash/data loss/auth bypass), High (broken flow/wrong data), Medium (visual glitch/UX/a11y), Low (cosmetic). Overflow beyond 20 is archived and promoted back when higher-ranked items are fixed. Dual format -- JSON (source of truth) + Markdown (human-readable report).
>
> **Recheck loop**: The user manually details which issues were fixed and redeployed. The agent re-verifies those specific items by replaying the original reproduction steps, reporting PASS/FAIL/CHANGED for each.
>
> **Sub-agents**: Focused specialists spawned in parallel during testing -- Accessibility Auditor (WCAG, keyboard nav, ARIA), Responsive Tester (3-viewport sweep), Flow Walker (happy path + edge cases), Visual Diff (before/after regression detection).
>
> **Skills library**: 8 pre-built testing skills (test-auth, test-forms, test-nav, test-a11y, test-responsive, test-visual-regression, test-crud, test-search) composed into focused agents. Rules auto-loaded from `.claude/rules/` govern testing protocol.
>
> **Self-improving**: All skills, agents, and rules include a feedback loop. After every execution: log results, qualify whether the skill steps, agent workflow, or rule thresholds should be updated, and apply improvements.
>
> **Does not** write application code, deploy fixes, or merge PRs. Test-only agent. Results are compiled into user stories for human review and prioritization.

---

## Quick Start

### 1. Enter the sandbox

```bash
docker exec -it -u sandbox openharness bash
```

Or via the orchestrator CLI:

```bash
openharness shell uat-tester
```

### 2. Register a project

Create or edit `uat/projects.json`:

```json
{
  "projects": [
    {
      "slug": "my-app",
      "url": "https://my-app.example.com",
      "login": {
        "url": "https://my-app.example.com/login",
        "username": "test@example.com",
        "password": "test-password"
      },
      "notes": "SaaS dashboard with auth, CRUD, and admin panel"
    }
  ]
}
```

### 3. Run a full UAT sweep

```
/visual-uat my-app
```

This executes the 6-phase sweep: discovery, authentication, flow walking, responsive checks, accessibility audits, and findings compilation.

### 4. Review findings

The report is written to two files:

- `uat/my-app/findings.json` -- machine-readable source of truth
- `uat/my-app/findings.md` -- human-readable report with user stories, severity, and screenshot links

### 5. Recheck after fixes

Once the development team has fixed and redeployed specific issues, run:

```
/recheck my-app UAT-001 UAT-005 UAT-012
```

The agent replays the original reproduction steps for each specified finding and reports PASS, FAIL, or CHANGED for each. Passed items are removed from the active top-20 and archived items are promoted to fill the slots.

---

## Multi-Project Support

The agent supports testing multiple deployed applications concurrently. Each project is isolated with its own findings, screenshots, and archive.

### Project Registry

`uat/projects.json` is the central registry. Each entry contains:

| Field | Required | Description |
|-------|----------|-------------|
| `slug` | Yes | Short identifier (lowercase, hyphens). Used as directory name. |
| `url` | Yes | Root URL of the deployed application. |
| `login` | No | Object with `url`, `username`, `password` for authenticated flows. |
| `notes` | No | Free-text context about the app (helps the agent prioritize flows). |

### Per-Project Directories

Each registered project gets an isolated directory under `uat/`:

```
uat/
  projects.json           # Central registry
  my-app/
    findings.json         # Source of truth (top-20 + archive)
    findings.md           # Human-readable report
    screenshots/          # Evidence organized by date
      2026-04-14/
        auth-login-desktop.png
        auth-login-mobile.png
        ...
    findings-archive.json # Overflow findings beyond top-20
  another-app/
    findings.json
    findings.md
    findings-archive.json
    screenshots/
```

### Top-20 Cap with Archive Overflow

Each project maintains a maximum of 20 active findings. When the active list is full:

1. New findings are scored against existing ones.
2. If a new finding outranks an existing one, the lowest-ranked active finding is moved to `archive/`.
3. If a new finding does not outrank any active finding, it is added directly to `archive/`.

When a recheck confirms a fix (PASS), the resolved item is removed from the active list. The highest-ranked archived item is then promoted to fill the vacancy, maintaining a full top-20 where possible.

---

## Skills

All skills are invoked as slash commands inside the agent session.

| Skill | Purpose | Details |
|-------|---------|---------|
| `/visual-uat <slug>` | Full UAT sweep | 6-phase test: discovery, auth, flow walking, responsive, a11y, compilation. Produces top-20 findings. |
| `/recheck <slug> [IDs]` | Fix verification | Replays reproduction steps for specified finding IDs. Reports PASS/FAIL/CHANGED per item. Promotes archived items on PASS. |
| `/test-auth` | Authentication flows | Login, logout, session persistence, password reset, OAuth redirects, token expiry. |
| `/test-forms` | Form validation | Required fields, input masks, error messages, submit behavior, multi-step forms, file uploads. |
| `/test-nav` | Navigation testing | Menu traversal, breadcrumbs, back button, deep links, 404 handling, redirect chains. |
| `/test-a11y` | Accessibility (WCAG) | Keyboard navigation, ARIA landmarks, color contrast, screen reader labels, focus management. |
| `/test-responsive` | Responsive viewports | Desktop (1920x1080), Tablet (768x1024), Mobile (375x812). Layout breaks, overflow, touch targets. |
| `/test-visual-regression` | Visual regression | Before/after screenshot comparison. Detects unintended visual changes after deployments. |
| `/test-crud` | CRUD operations | Create, read, update, delete flows. Data persistence, optimistic UI, error states, empty states. |
| `/test-search` | Search/filter/pagination | Search accuracy, filter combinations, pagination controls, empty results, sort order. |

### Skill Composition

The 8 `test-*` skills are atomic building blocks. The `/visual-uat` skill composes them into a full sweep by delegating to sub-agents that invoke the relevant skills in parallel. The `/recheck` skill selectively replays only the steps relevant to the findings being verified.

---

## Sub-Agents

Specialized testing agents spawned in parallel during a `/visual-uat` sweep. Each sub-agent invokes a subset of skills and returns structured findings to the parent agent for deduplication and ranking.

| Sub-Agent | Skills Invoked | When Spawned | Focus |
|-----------|---------------|--------------|-------|
| Accessibility Auditor | `/test-a11y` | Phase 5 of `/visual-uat` | WCAG compliance, keyboard navigation, ARIA landmarks, color contrast, screen reader compatibility. |
| Responsive Tester | `/test-responsive` | Phase 4 of `/visual-uat` | 3-viewport sweep (desktop, tablet, mobile). Layout integrity, overflow, touch target sizing, media query breakpoints. |
| Flow Walker | `/test-auth`, `/test-forms`, `/test-nav`, `/test-crud`, `/test-search` | Phase 3 of `/visual-uat` | Happy path and edge case traversal of all user flows. Authentication, data operations, navigation, search. |
| Visual Diff | `/test-visual-regression` | Phase 6 of `/visual-uat` (if baseline exists) | Before/after screenshot comparison. Detects unintended regressions introduced by recent deployments. |

Sub-agents run in isolated `agent-browser` sessions to avoid state contamination. Each produces a findings fragment that the parent agent merges, deduplicates, and ranks into the final top-20 report.

---

## Rules

Auto-loaded rules from `.claude/rules/` govern testing protocol and quality standards.

| Rule File | Guards | Description |
|-----------|--------|-------------|
| `uat-testing.md` | Testing protocol | Core UAT workflow: always start with happy path, test as multiple user types (new, returning, admin), require screenshot evidence for every finding, close browser sessions when done. |
| `agent-browser.md` | Browser usage | Session management, viewport configuration, selector waiting, screenshot naming conventions. Prevents stale state by enforcing session isolation and cleanup. |
| `findings-management.md` | Findings quality | Deduplication rules, severity classification criteria, user story format, top-20 cap enforcement, archive promotion logic. Prevents noisy or duplicated reports. |
| `multi-project.md` | Project isolation | Per-project directory structure, registry format, cross-project deduplication (same bug in shared component = one finding), slug naming conventions. |

Additional inherited rules from the base workspace (`.claude/rules/`):

| Rule File | Guards |
|-----------|--------|
| `git.md` | Branch naming, commit format, PR targets, pre-commit hooks |
| `code-quality.md` | TypeScript strict mode, lint/format/type-check gates |
| `issue-triage.md` | Issue assignment, sub-agent spawning, template matching |

---

## Findings Format

### Severity Levels

| Severity | Criteria | Examples |
|----------|----------|----------|
| **Critical** | Crash, data loss, authentication bypass, security vulnerability | App crashes on form submit; user data deleted without confirmation; auth token exposed in URL; login bypass via direct URL |
| **High** | Broken user flow, incorrect data displayed, feature non-functional | Checkout flow dead-ends; dashboard shows stale data; save button does nothing; search returns wrong results |
| **Medium** | Visual glitch, UX confusion, accessibility violation, layout break | Button overlaps label at mobile width; modal lacks focus trap; missing error message on invalid input; color contrast fails WCAG AA |
| **Low** | Cosmetic issue, minor inconsistency, polish item | Inconsistent icon sizes; extra whitespace in footer; placeholder text not italicized; hover state missing on one button |

### User Story Template

Each finding is reported as a user story:

```markdown
### UAT-007: [Title] (High)

**As a** [user type],
**I expected** [expected behavior],
**but instead** [actual behavior observed].

**Steps to reproduce**:
1. Navigate to [URL]
2. [Action]
3. [Action]
4. Observe: [what went wrong]

**Viewport**: 375x812 (Mobile)
**Screenshot**: uat/<slug>/screenshots/2026-04-14/nav-menu-mobile.png
**Component**: [selector or page area]
**Notes**: [additional context, workarounds, related findings]
```

### JSON Schema (Summary)

`findings.json` is the machine-readable source of truth:

```json
{
  "project": "my-app",
  "generated": "2026-04-14T12:00:00Z",
  "active": [
    {
      "id": "UAT-007",
      "title": "Mobile nav menu overlaps content",
      "severity": "High",
      "userType": "new",
      "expected": "Navigation menu opens as overlay without shifting page content",
      "actual": "Menu pushes content right, causing horizontal scroll",
      "steps": ["Navigate to /dashboard", "Tap hamburger menu", "Observe layout shift"],
      "viewport": "375x812",
      "screenshot": "uat/my-app/screenshots/2026-04-14/nav-menu-mobile.png",
      "component": "nav.main-menu",
      "status": "open",
      "foundDate": "2026-04-14",
      "recheckHistory": []
    }
  ],
  "archived": [],
  "meta": {
    "totalFound": 24,
    "activeCap": 20,
    "archivedCount": 4,
    "lastSweep": "2026-04-14T12:00:00Z",
    "lastRecheck": null
  }
}
```

---

## Architecture

Full workspace directory structure:

```
workspace/
  README.md                        # This file
  IDENTITY.md                      # Agent name, role, mission, stack, URLs
  SOUL.md                          # Personality, tone, values, guardrails
  AGENTS.md                        # Operating procedures, decision rules
  TOOLS.md                         # Environment, installed tools, agent-browser reference
  USER.md                          # Owner preferences, constraints, goals
  HEARTBEAT.md                     # Meta-maintenance routines
  MEMORY.md                        # Long-term memory (symlinked to .slack/MEMORY.md)
  CLAUDE.md                        # Operating procedures (symlinked to AGENTS.md)
  heartbeats.conf                  # Cron schedule for periodic tasks
  heartbeats/                      # Heartbeat task definitions
    uat-report.md                  # UAT status report (every 4h, 9am-9pm)
    build-health.md                # Build health check
    ...
  memory/                          # Daily logs (append-only)
    2026-04-14.md
    ...
  uat/                             # UAT findings and evidence (per project)
    projects.json                  # Project registry
    <slug>/                        # Per-project directory
      findings.json                # Source of truth (top-20 + archive)
      findings.md                  # Human-readable report
      screenshots/                 # Evidence organized by date
        YYYY-MM-DD/
          <flow>-<step>-<viewport>.png
      archive/                     # Overflow findings beyond top-20
  .claude/
    settings.json                  # Agent configuration
    skills/                        # Skill definitions (slash commands)
      visual-uat/SKILL.md          # /visual-uat <slug> — full 6-phase sweep
      recheck/SKILL.md             # /recheck <slug> [IDs] — fix verification
      test-auth/SKILL.md           # /test-auth — authentication flows
      test-forms/SKILL.md          # /test-forms — form validation
      test-nav/SKILL.md            # /test-nav — navigation testing
      test-a11y/SKILL.md           # /test-a11y — accessibility (WCAG)
      test-responsive/SKILL.md     # /test-responsive — viewport sweep
      test-visual-regression/SKILL.md  # /test-visual-regression — before/after
      test-crud/SKILL.md           # /test-crud — CRUD operations
      test-search/SKILL.md         # /test-search — search/filter/pagination
      quality-gate/SKILL.md        # /quality-gate — decision validation
      strategy-review/SKILL.md     # /strategy-review — decision quality tracking
      ...
    agents/                        # Sub-agent definitions
      a11y-auditor.md              # Accessibility Auditor
      responsive-tester.md         # Responsive Tester
      flow-walker.md               # Flow Walker
      visual-diff.md               # Visual Diff
      council.md                   # Synthesizer (inherited)
      critic.md                    # Critic (inherited)
      ...
    rules/                         # Auto-loaded rules
      uat-testing.md               # Core UAT testing protocol
      agent-browser.md             # Browser session management
      findings-management.md       # Findings quality and deduplication
      multi-project.md             # Project isolation and registry
      git.md                       # Git workflow (inherited)
      code-quality.md              # Code quality standards (inherited)
      ...
    screenshots/                   # Temporary screenshot staging
  .slack/
    MEMORY.md                      # Shared memory (symlink target)
```

---

## Workflow

The UAT cycle follows a repeatable loop:

```
  1. SWEEP          2. DELEGATE          3. RANK            4. CAP
  +-----------+     +-------------+     +------------+     +-----------+
  | /visual-  | --> | Sub-agents  | --> | Deduplicate| --> | Top-20    |
  | uat <slug>|     | run in      |     | & score by |     | active +  |
  |           |     | parallel    |     | severity   |     | archive   |
  +-----------+     +-------------+     +------------+     +-----------+
                                                                 |
                                                                 v
  8. PROMOTE        7. RECHECK          6. FIXES            5. REPORT
  +-----------+     +-------------+     +------------+     +-----------+
  | Archived  | <-- | /recheck    | <-- | User       | <-- | findings  |
  | items     |     | <slug>      |     | deploys    |     | .json +   |
  | fill gaps |     | [IDs]       |     | fixes      |     | .md       |
  +-----------+     +-------------+     +------------+     +-----------+
```

### Phase Details

1. **SWEEP**: The `/visual-uat <slug>` skill is invoked with a project slug. The agent reads `uat/projects.json` for the project URL and login credentials.

2. **DELEGATE**: The agent spawns 4 sub-agents in parallel:
   - **Flow Walker** -- navigates all user flows (auth, CRUD, nav, search, forms)
   - **Responsive Tester** -- repeats key flows at 3 viewport sizes
   - **Accessibility Auditor** -- runs WCAG checks, keyboard nav, ARIA validation
   - **Visual Diff** -- compares current screenshots against stored baselines (if available)

3. **RANK**: All sub-agent findings are merged. Duplicates with shared root causes are collapsed into single findings. Each finding is scored by severity (Critical > High > Medium > Low) and impact breadth.

4. **CAP**: The top 20 findings become the active list. Any overflow is moved to the archive. If the project already has active findings, new findings are merged with existing ones and re-ranked.

5. **REPORT**: Two output files are written:
   - `uat/<slug>/findings.json` -- structured data, machine-readable
   - `uat/<slug>/findings.md` -- formatted user stories with severity badges and screenshot links

6. **FIXES**: The user reviews findings, prioritizes fixes, and deploys them. This step is manual and happens outside the agent.

7. **RECHECK**: The user runs `/recheck <slug> UAT-001 UAT-005 ...` specifying which findings should be re-verified. The agent replays the original reproduction steps and reports PASS (fixed), FAIL (still broken), or CHANGED (different behavior, new finding created).

8. **PROMOTE**: For each PASS result, the resolved finding is removed from the active list. The highest-severity archived finding is promoted to fill the vacancy. The cycle continues until the user is satisfied or the findings list is empty.

---

## Self-Improvement

The agent is designed to get better at testing over time. Three categories of artifacts evolve through feedback loops:

### Skills

After each skill execution, the agent evaluates:

- **Did the skill's steps miss a scenario?** If a finding was discovered outside the skill's defined steps, the missing scenario is added to the skill definition.
- **Did a step consistently find nothing?** After 3+ runs with zero findings on a specific step, it is flagged for review. It may be removed, refined, or moved to a lower-priority position.
- **Did the reproduction steps need adjustment?** If the app's UI changed in a way that broke the skill's selectors or flow, the skill is updated to match the current state.

### Agents

Sub-agent effectiveness is tracked per sweep:

- **Findings per agent**: Which sub-agent produces the most actionable findings? Its skill set may be expanded.
- **False positive rate**: Which sub-agent reports issues that get deduplicated away? Its criteria may be tightened.
- **Execution time**: Slow sub-agents may need their scope narrowed or their skill composition optimized.

### Rules

Rules evolve based on real findings data:

- **False positives**: If a rule consistently flags non-issues (e.g., a contrast rule that triggers on decorative elements), the threshold is loosened or an exception is added.
- **Missed violations**: If findings reveal a pattern that no rule catches (e.g., focus traps in modals), a new rule is created.
- **Threshold tuning**: Severity classification criteria are refined as the agent builds a corpus of real findings. What initially looked "Medium" may be reclassified as "High" based on user feedback.

### Memory Protocol

Every execution ends with:

1. **Log**: Append a structured entry to `memory/YYYY-MM-DD.md` (Result, Item, Action, Duration, Observation).
2. **Qualify**: Did I learn something durable? Is there a recurring pattern? Can I improve a skill, agent, or rule?
3. **Improve**: If yes, apply the change directly to the relevant file. If no, move on.
4. **Never skip**: Even no-op runs are logged. The log is the training data for self-improvement.

---

## Heartbeat

### Schedule

The `uat-report` heartbeat runs every 4 hours during active hours (9am-9pm):

```
0 */4 * * * | heartbeats/uat-report.md | claude | 9-21
```

### What It Reports

Each heartbeat produces a status summary:

- **Active findings count** per registered project
- **Severity breakdown** (Critical/High/Medium/Low counts)
- **Recent changes** since last heartbeat (new findings, rechecks, promotions)
- **Stale findings** -- items open for more than 7 days without a recheck
- **Agent health** -- browser session status, disk usage for screenshots, memory log freshness

If nothing requires attention, the heartbeat responds with `HEARTBEAT_OK`.

The heartbeat also triggers a lightweight memory distillation: recent daily logs are scanned for durable patterns that should be promoted to `MEMORY.md`.
