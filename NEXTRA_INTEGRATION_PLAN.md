# Plan: Integrate Nextra Docs Theme into open-harness

## Goal
Integrate the Nextra docs theme into `ryaneggz/open-harness:development` in a way that improves documentation UX without breaking the current product site, harness workflows, or development ergonomics.

## Reference
- Nextra docs theme start guide: <https://nextra.site/docs/docs-theme/start>
- Target repo: `ryaneggz/open-harness`
- Target branch: `development`

## Desired outcome
- A working Nextra-powered docs experience exists in `open-harness`
- The implementation fits the existing repo structure and deployment model
- Existing homepage/app behavior is preserved or intentionally reworked
- Migration path for current docs is clear

## Open questions
1. Should Nextra replace the current root app UI or live under a dedicated docs route/app?
2. Should docs live in the existing app, a parallel app, or a docs-only section?
3. How should current README, AGENTS, workspace docs, and generated/reference docs map into Nextra content?
4. Do we want MDX docs only, or a hybrid of app pages plus docs pages?
5. What is the lowest-risk migration path for `development`?

## Recommended approach
Start with a non-destructive integration that adds Nextra as a dedicated documentation surface while preserving the current app and repo behavior.

Initial recommendation:
- keep current root product/app behavior intact
- introduce Nextra in a scoped docs experience
- migrate documentation incrementally
- avoid a full documentation rewrite in the first PR

## Workstreams

### 1. Architecture decision
Evaluate and choose one of these approaches:

#### Option A: Replace existing site with Nextra
Pros:
- simplest docs-first experience
- unified framework for docs

Cons:
- highest migration risk
- may disrupt current landing page/app structure
- may require significant route and layout rework

#### Option B: Add Nextra under a dedicated `/docs` surface
Pros:
- lowest-risk migration path
- preserves existing homepage/app
- allows incremental migration of docs

Cons:
- dual experience to maintain
- requires navigation alignment

#### Option C: Separate docs app/package within monorepo
Pros:
- clean isolation
- flexible deployment/story for docs

Cons:
- more setup complexity
- more CI/build surface area

*Recommendation:* Option B first.

### 2. Technical discovery
- inspect current app/router/layout structure
- identify compatibility between current Next.js version and Nextra requirements
- identify required packages and config changes
- determine whether MDX, page extensions, and theme config affect existing routes
- define navigation strategy between main site and docs

### 3. Content migration plan
Inventory current documentation sources:
- `README.md`
- `AGENTS.md`
- `workspace/AGENTS.md`
- `workspace/TOOLS.md`
- `workspace/IDENTITY.md`
- `workspace/HEARTBEAT.md`
- selected skill documentation

Classify content into:
- getting started
- concepts
- operations/runbooks
- CLI reference
- agent workflow docs
- workspace template docs

### 4. Implementation plan
Phase 1:
- install/configure Nextra and minimal docs theme setup
- add a docs route/surface
- create seed pages (`Getting Started`, `Architecture`, `CLI`, `Workspaces`)
- add navigation link from existing UI

Phase 2:
- migrate core docs into MDX
- organize sidebar/navigation
- add callouts, code blocks, and structured pages

Phase 3:
- de-duplicate root markdown/docs
- decide canonical doc sources
- update README to point users to docs site

### 5. Validation
- docs build succeeds locally and in CI
- existing app routes continue to work
- docs navigation works
- syntax highlighting/search/theme behavior are acceptable
- no regressions in existing deployment flow

## Deliverables
- architecture decision for Nextra placement
- phased implementation plan
- issue tracking the work
- draft PR containing the plan document for review before execution

## Acceptance criteria
- there is a clear approved integration strategy
- the first implementation PR scope is intentionally limited
- migration avoids breaking the current `development` branch experience
- follow-up execution tasks are well-defined

## Proposed next step
Open a planning issue and draft PR with this plan, then decide whether to implement Nextra under `/docs` or as a separate docs app.
