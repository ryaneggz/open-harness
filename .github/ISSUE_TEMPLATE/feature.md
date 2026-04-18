---
name: Feature Request
about: Propose a new feature for the Next.js application
title: "[FEAT] "
labels: enhancement
assignees: ""
---

## Summary

<!-- One-sentence description of the feature. -->

## Motivation

<!-- Why is this needed? What problem does it solve? -->

## Proposed Implementation

<!-- Describe the approach. Consider:
  - Which Next.js routes/pages are affected? (src/app/)
  - New shadcn/ui components needed? (npx shadcn@latest add ...)
  - Database changes? (Prisma migration needed?)
  - API routes? (src/app/api/)
-->

## Design

<!-- Optional: mockups, wireframes, or ASCII sketches of the UI -->

---

## Agent Assignment

### Metadata

> **IMPORTANT**: Validate this metadata before starting work.

```yml
agent: "orchestrator"
branch: "agent/orchestrator"
worktree_path: ".worktrees/agent/orchestrator"
pull_request: "FROM agent/orchestrator TO development"
```

### Workflow

```bash
# Enter the sandbox
openharness shell orchestrator
claude

# When complete — PR from agent branch to development
cd .worktrees/agent/orchestrator
git add -A && git commit -m "feat(<issue#>): <description>"
git push -u origin agent/orchestrator
gh pr create --base development --title "feat(<issue#>): <shortdesc>" --body "Closes #<issue#>"
```

---

## Acceptance Criteria

- [ ] Feature works as described
- [ ] TypeScript strict — no `any` types
- [ ] Vitest tests added for new logic
- [ ] Playwright E2E test covers the happy path
- [ ] Lint + format + type-check pass (`pnpm run lint && pnpm run format:check && pnpm run type-check`)
- [ ] Verified via agent-browser at `https://oh.ruska.dev`
- [ ] Prisma migration included if schema changed
- [ ] PR targets `development` branch
