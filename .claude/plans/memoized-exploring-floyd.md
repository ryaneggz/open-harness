# Plan: 5-Expert Council → Validated Roadmap → Implementer Heartbeat

## Context

The app's mission: **document Open Harness, let users promote forks, curate Docker registries with monthly licensing**. Currently a polished landing page with zero backend. The agent infrastructure is mature but has nothing to build ON.

**Core principle: SIGNAL OVER FEATURES.** We do not build what sounds good — we build what users demonstrably want. Every roadmap item must have a validation signal before it enters the "Build Now" phase. Building features no one wants is worse than building nothing.

This plan delivers four things:
1. **5 expert sub-agents + AI council** that produce a prioritized product roadmap
2. **Product validation gate** — roadmap items require evidence of user demand before implementation
3. **Public roadmap** as a pinned GitHub issue + `/roadmap` page on the app
4. **Implementer heartbeat** that runs throughout the day, picks the top *validated* roadmap item, converts it to a Ralph PRD, and runs the Ralph loop inside a tmux session — with the **final user story always being "archive Ralph + submit draft PR with human review steps"**

---

## Phase A: Expert Sub-Agents + Strategic Council (7 files)

### A1. `workspace/.claude/agents/expert-product.md`

**Product Architect** — "What data models, APIs, and features does this SaaS need, and in what order?"

- `model: sonnet`, `tools: Read, Glob, Grep, Bash`
- Proposes 3-5 roadmap items: Prisma models (Users, Forks, Registries, Subscriptions), API surface, first pages beyond landing
- Ranks by dependency ordering (what must exist before the next thing)
- Each item: title, 1-sentence description, prerequisites, complexity (S/M/L)
- Reads IDENTITY.md, MEMORY.md, `.claude/rules/{nextjs,prisma}.md`
- Constraint: ONE focused set of proposals, under 600 words

### A2. `workspace/.claude/agents/expert-docs.md`

**Documentation Architect** — "How should Open Harness docs and fork showcase UX work?"

- `model: sonnet`, `tools: Read, Glob, Grep, Bash`
- Proposes 3-5 items: Open Harness framework docs, "create your own harness" guide, fork gallery, MDX setup
- Current state: FAQ #6 mentions multi-stack but shows nothing; no /docs route
- Reads current landing page components for existing patterns
- Constraint: under 600 words

### A3. `workspace/.claude/agents/expert-security.md`

**Security Engineer** — "What auth and access control foundation does this SaaS need?"

- `model: sonnet`, `tools: Read, Glob, Grep, Bash`
- Proposes 3-5 items: GitHub OAuth, session management, authorization, payment security, security headers
- Key: app is publicly accessible via cloudflared with ZERO auth currently
- Constraint: under 600 words

### A4. `workspace/.claude/agents/expert-registry.md`

**Registry & DevOps Expert** — "How should Docker registry curation and licensing work?"

- `model: sonnet`, `tools: Read, Glob, Grep, Bash`
- Proposes 3-5 items: GHCR/Docker Hub API integration, "curate your registry" UX, subscription-gated pulls, billing/Stripe
- Context: release workflow already pushes to GHCR with CalVer tags
- Constraint: under 600 words

### A5. `workspace/.claude/agents/expert-agent-systems.md`

**Agent Systems Architect** — "What agent capability most accelerates building this SaaS?"

- `model: sonnet`, `tools: Read, Glob, Grep, Bash`
- Proposes 3-5 items: plan-execution skill, Ralph hardening, implementer heartbeat integration
- Gap: issue-triage creates draft PRs but nothing implements them; Ralph untested
- Constraint: under 600 words

### A6. `workspace/.claude/agents/strategic-council.md`

**Strategic AI Council** — Synthesizes all 5 into a unified, *signal-validated* prioritized roadmap.

- `model: opus`, `tools: Read, Glob, Grep, Bash`
- Evaluation axes: **Signal (30%)**, Feasibility (25%), Dependencies (25%), Strategic Alignment (20%)
- **Signal axis** (replaces generic "Impact"):
  - GitHub issue reactions (thumbs up, heart, rocket) on related issues
  - Comment count and engagement quality on related issues
  - Fork activity (are forks already building this?)
  - Explicit user requests in issues/discussions
  - Community size indicators (stars, forks, watchers on ryaneggz/open-harness)
  - Score 0 if no signal exists — **do not assume demand**
- Synthesis rules:
  - **Signal over speculation**: An item with 5 thumbs-up beats a "brilliant idea" with zero signal
  - **Unvalidated items go to "Later"**: No signal = no implementation priority, regardless of how good it sounds
  - **Infrastructure items exempt**: Auth, security headers, health endpoints are prerequisites — they don't need user demand
  - Dependency ordering: auth → models → features → registry → licensing
  - Complementary proposals merge if complexity stays manageable
  - Agent autonomy is a multiplier
- Deduplicates, merges, scores, ranks
- Produces 8-12 roadmap items with: rank, title, description, category, phase (Now/Next/Later), complexity, **signal (evidence string or "none")**
- **Phase assignment rules**:
  - **Now**: Has signal + dependencies met + complexity ≤ M, OR is infrastructure prerequisite
  - **Next**: Has signal but dependencies not met, OR complexity L with signal
  - **Later**: No signal, speculative, or blocked by multiple prerequisites
- Output formatted as the **pinned GitHub issue body** directly
- Includes a **"How to vote"** section telling users to react with 👍 on issues they want
- Constraint: under 2000 words

### A7. `workspace/.claude/skills/strategic-proposal/SKILL.md`

**Orchestrator skill.** Pattern from `issue-triage` SKILL.md.

- Trigger: "build roadmap", "strategic proposal", "what should we build next"
- Flow:
  1. Guard: `gh auth status` — SKIP if unauthenticated
  2. Read IDENTITY.md, MEMORY.md, schema.prisma, app routes, open issues
  3. Compose briefing with product vision + gap inventory
  4. Spawn 5 Agent tool calls in ONE message (parallel sonnet)
  5. Spawn strategic-council (opus) with all 5 proposals
  6. Find/create pinned issue with label `roadmap` (title: "Product Roadmap")
  7. Update pinned issue body with council output
  8. Write roadmap data to `src/data/roadmap.ts`
  9. Memory Protocol

---

## Phase B: Public Roadmap Page (4 files)

### B1. `workspace/next-app/src/data/roadmap.ts`

Typed roadmap data. Generated/updated by the `/strategic-proposal` skill.

```typescript
export type RoadmapPhase = "now" | "next" | "later";
export type RoadmapCategory = "product" | "docs" | "security" | "registry" | "agent";
export type Complexity = "S" | "M" | "L";

export interface RoadmapItem {
  rank: number;
  title: string;
  description: string;
  category: RoadmapCategory;
  phase: RoadmapPhase;
  complexity: Complexity;
  signal: string;           // evidence of user demand, or "infrastructure" for prereqs, or "none"
  issueNumber?: number;
  dependencies?: string[];
}

export const roadmap: RoadmapItem[] = [];
```

### B2. `workspace/next-app/src/components/roadmap/roadmap-card.tsx`

Client component for individual roadmap items:
- Category color coding (product=blue, docs=green, security=red, registry=purple, agent=orange)
- Complexity badge (S=green, M=yellow, L=red)
- Phase indicator
- **Signal indicator**: shows evidence of demand (reaction count, "infrastructure", or "needs votes")
- Optional GitHub issue link (so users can vote with 👍)
- Uses existing shadcn `Card`, `Badge` components

### B3. `workspace/next-app/src/app/roadmap/page.tsx`

Server component. Three sections: "Building Now", "Up Next", "On the Horizon".
- Imports `roadmap` from `@/data/roadmap`
- Renders `RoadmapCard` for each item grouped by phase
- **"How to influence the roadmap"** callout at top: explains that users vote with 👍 on GitHub issues to signal demand — items with votes get built first
- Metadata for SEO: title "Roadmap | Open Harness"
- Uses existing shadcn `Card`, `Badge`, `Separator`

### B4. Edit `workspace/next-app/src/components/landing/navbar.tsx`

Add "Roadmap" link to navigation alongside existing GitHub/Demo links.

---

## Phase C: Implementer Heartbeat + Ralph-in-tmux (3 files)

### C1. `workspace/.claude/skills/implement/SKILL.md`

**Implementation skill.** Picks the top roadmap/backlog item and runs Ralph in tmux.

```yaml
name: implement
description: |
  Pick the highest-priority unimplemented roadmap item, convert it to a Ralph PRD,
  and run the Ralph loop inside a tmux session. The final user story always submits
  a draft PR with human review steps (What, Why, How).
  TRIGGER when: heartbeat (every 2h, 9am-9pm) or when asked to implement the next
  roadmap item, run ralph, or start building.
```

**Flow:**

1. **Guard: tmux session check**
   ```bash
   tmux has-session -t ralph 2>/dev/null
   ```
   If a `ralph` session already exists → `HEARTBEAT_OK` (implementation in progress)

2. **Guard: open draft PR check**
   ```bash
   gh pr list --repo ryaneggz/next-postgres-shadcn --author @me --state open --draft --json number --jq 'length'
   ```
   If > 0 draft PRs open → `HEARTBEAT_OK` (previous work awaiting review)

3. **Pick highest priority *validated* item**
   - Read pinned roadmap issue (label `roadmap`) to get current priorities
   - **Only consider items in phase "Now"** — these have validated signal or are infrastructure prereqs
   - Cross-reference with open issues and existing branches
   - Pick the top-ranked "Now" item that has no branch and no PR yet
   - **Skip items with signal: "none"** — unvalidated features must not be built
   - If nothing validated to pick → `HEARTBEAT_OK` (this is correct — don't build speculatively)

4. **Create GitHub issue if not exists**
   - If the roadmap item doesn't have a linked issue, create one
   - Assign to `@me`

5. **Generate Ralph PRD**
   - Run `/prd` with the roadmap item details to produce a PRD
   - Run `/ralph` to convert PRD to `.ralph/prd.json`
   - **RALPH EXECUTION RULES** (injected into `.ralph/CLAUDE.md` or `prompt.md` before launch):
     - **1:1 iteration-to-story**: Each Ralph iteration works on exactly ONE user story. Never combine stories. Never skip ahead.
     - **Browser QA is mandatory for UI stories**: After implementing any story that touches frontend (components, pages, styles), use the `agent-browser` skill to navigate to the affected page, interact with the UI, take a screenshot, and verify the change works visually. If the browser QA fails, fix the issue in the SAME iteration before marking `passes: true`.
     - **Reconcile issues during QA**: If browser testing reveals a problem (layout broken, component not rendering, data not loading), debug and fix it immediately. Do not leave broken UI for the next iteration.
     - **Backend stories get integration verification**: After implementing API routes or server actions, verify they work by calling them (curl, fetch, or via the UI if a page exists).
     - **Quality gate per story**: Every story must pass `npm run type-check && npm run lint && npm test` before `passes: true`. If checks fail, fix in the same iteration.
   - **CRITICAL**: Inject a final user story into prd.json:
     ```json
     {
       "id": "US-FINAL",
       "title": "Archive Ralph run, submit draft PR, and verify CI green",
       "description": "As the agent, I archive the Ralph run, submit all work as a draft PR with review docs, and confirm CI passes.",
       "acceptanceCriteria": [
         "All previous stories have passes: true",
         "Archive .ralph/prd.json and .ralph/progress.txt to .ralph/archive/YYYY-MM-DD-<feature>/ before PR creation",
         "Create feature branch: feat/<N>-<shortdesc> from agent/next-postgres-shadcn",
         "Push all commits to the feature branch",
         "Create draft PR to development with body containing: ## What (summary of all changes made across stories), ## Why (motivation — link to roadmap item and GitHub issue, explain the user signal that justified building this), ## How (implementation approach, key architecture decisions, tradeoffs), ## Manual Review Steps (numbered checklist: specific pages to visit, interactions to test, edge cases to verify — written for a human reviewer who has NOT seen the code), ## Acceptance Criteria (consolidated from all user stories)",
         "PR title follows format: feat(#<N>): <description>",
         "Run /ci-status after push — poll until CI completes",
         "If CI fails: read failure logs, fix the issue, push again, re-poll until GREEN",
         "This story is NOT complete until CI pipeline is GREEN — do not mark passes: true with red CI"
       ],
       "priority": 999,
       "passes": false,
       "notes": "ALWAYS the last story. Archive MUST happen before PR. CI MUST be green before passes: true."
     }
     ```

6. **Launch Ralph in tmux**
   ```bash
   tmux new-session -d -s ralph -c /home/sandbox/workspace \
     "cd .ralph && ./ralph.sh --tool claude 15 2>&1 | tee ralph-$(date +%Y%m%d-%H%M).log; echo 'Ralph session complete. Press any key to close.'; read"
   ```

7. **Memory Protocol**: log to `memory/YYYY-MM-DD.md`

### C2. `workspace/heartbeats/implement.md`

Thin heartbeat file (follows existing pattern):

```markdown
# Implementer Heartbeat

Pick the highest-priority roadmap item and run a Ralph implementation
loop inside a tmux session. The final Ralph story always submits a
draft PR with human manual review steps (What, Why, How).

## Tasks

1. Run the `/implement` skill — it handles all logic
2. If Ralph session already running or draft PR awaiting review, reply `HEARTBEAT_OK`
3. If nothing to implement, reply `HEARTBEAT_OK`
4. If Ralph started, report: issue number, tmux session name, roadmap item
5. Run the Memory Improvement Protocol (AGENTS.md)

## Reporting

- In progress / nothing to do: `HEARTBEAT_OK`
- Ralph launched: issue number + tmux session `ralph` + roadmap item title
- Append summary to `memory/YYYY-MM-DD.md`
```

### C3. Edit `workspace/heartbeats.conf` — append one line

```
0 */2 * * * | heartbeats/implement.md | claude | 9-21
```

Schedule: **every 2 hours, 9am-9pm** — active working hours only. The tmux guard prevents overlapping runs.

---

## Files to Edit (3 existing)

### D1. `workspace/heartbeats.conf`

Append: `0 */2 * * * | heartbeats/implement.md | claude | 9-21`

### D2. `workspace/IDENTITY.md` — update Heartbeats line

```
- **Heartbeats**: Build health (every 30m, 9am-9pm), Issue triage (hourly, 24/7), Backlog ranking (daily 08:00 UTC), Implementer (every 2h, 9am-9pm)
```

### D3. `workspace/AGENTS.md`

Add to Skills table:
```
| `/strategic-proposal` | Spawn 5 experts + AI council, produce prioritized product roadmap |
| `/implement` | Pick top roadmap item, run Ralph loop in tmux, submit draft PR |
```

Add to Sub-Agents table:
```
| Expert: Product | "What data models + features does this SaaS need?" |
| Expert: Docs | "How should Open Harness docs + fork showcase work?" |
| Expert: Security | "What auth + access control foundation is needed?" |
| Expert: Registry | "How should Docker registry curation + licensing work?" |
| Expert: Agent Systems | "What agent capability accelerates building this?" |
| Strategic Council | Synthesizes 5 expert proposals into prioritized roadmap (opus) |
```

---

## Execution Order

1. **Phase A** — Create 5 expert agents + council + skill (7 files, no dependencies between them)
2. **Phase B** — Create roadmap data type, card component, page, edit navbar (4 files)
3. **Phase C** — Create implement skill + heartbeat + edit heartbeats.conf (3 files)
4. **Edits** — Update IDENTITY.md, AGENTS.md
5. **Verify** — lint, type-check, build
6. **Sync** — `heartbeat.sh sync` inside container
7. **Smoke test** — Run `/strategic-proposal` to populate roadmap, verify pinned issue + /roadmap page

## Phase D: Automated Tests for Harness Processes (3-4 test files)

Tests verify that the repeated, automated processes in the harness produce correct outputs. These run in CI alongside existing tests.

### D4. `workspace/next-app/src/test/roadmap-data.test.ts`

Unit tests for roadmap data integrity:
- Every `RoadmapItem` in `roadmap.ts` has all required fields (rank, title, description, category, phase, complexity, signal)
- Items in phase "now" must have `signal !== "none"` (validated demand or infrastructure)
- Ranks are unique and sequential
- Categories are valid enum values
- Dependencies reference existing items by title
- Empty roadmap array is valid (initial state)

### D5. `workspace/next-app/src/test/roadmap-page.test.tsx`

Component tests for the roadmap page:
- Renders three phase sections ("Building Now", "Up Next", "On the Horizon")
- Renders correct number of cards per phase
- Each card shows title, description, category badge, complexity badge, signal indicator
- "How to influence the roadmap" callout is visible
- GitHub issue links are present when `issueNumber` is set
- Empty state renders correctly when roadmap is empty

### D6. `workspace/next-app/src/test/ralph-prd.test.ts`

Validation tests for Ralph PRD structure (used by `/implement` skill to verify generated PRDs):
- PRD has required fields: `project`, `branchName`, `description`, `userStories`
- `branchName` follows `ralph/<feature>` or `feat/<N>-<shortdesc>` pattern
- Every story has: `id`, `title`, `description`, `acceptanceCriteria`, `priority`, `passes`, `notes`
- Every story's `acceptanceCriteria` includes "Typecheck passes"
- UI stories (title contains "UI", "page", "component", "display", "form") include "Verify in browser using agent-browser skill"
- **The final story (highest priority number) is always US-FINAL**: title contains "draft PR", acceptance criteria include CI green check, archive step
- Stories are ordered by priority (ascending) with no gaps
- No story depends on a higher-priority story (dependency ordering is correct)

### D7. `workspace/next-app/src/test/implement-guards.test.ts`

Unit tests for implement skill guard logic (importable helper functions):
- `isRalphSessionRunning()` — returns true when tmux session `ralph` exists
- `hasPendingDraftPR()` — returns true when open draft PRs exist for the author
- `getTopValidatedItem(roadmap)` — returns the highest-ranked "now" phase item with signal, or null
- `getTopValidatedItem([])` — returns null for empty roadmap
- `getTopValidatedItem(allLaterItems)` — returns null when nothing is validated
- Validates that guard ordering is correct: tmux check → draft PR check → validated item check

**Helper module**: `workspace/next-app/src/lib/implement-guards.ts` — extracted guard logic as pure functions that both the skill and tests can use. The skill instructions reference these functions.

---

## Verification

### Automated (run in CI via `npm test`)
1. **Roadmap data tests**: Validate data integrity rules — signal requirement for "now" phase, field completeness
2. **Roadmap page tests**: Component renders phases, cards, signal indicators, vote callout
3. **Ralph PRD tests**: US-FINAL always present and last, browser QA in UI stories, CI green required
4. **Implement guard tests**: Guard ordering, validated-only selection, empty/null cases

### Manual (one-time smoke tests)
5. **Type check**: `npm run type-check` passes with new types + page
6. **Build**: `npm run build` succeeds with `/roadmap` route
7. **Agent files**: All 7 `.md` files have correct frontmatter
8. **Skill test**: `/strategic-proposal` spawns 5 experts → council → pinned issue + roadmap.ts populated
9. **Roadmap page**: `/roadmap` renders on dev server with categorized items
10. **Navbar**: "Roadmap" link visible
11. **Heartbeat sync**: `heartbeat.sh sync` shows 5 heartbeats including `0 */2 * * *`
12. **Implement guard**: `/implement` returns HEARTBEAT_OK when no tmux session and no items
13. **Ralph final story**: Verify prd.json always has `US-FINAL` as the last story with draft PR + CI green
