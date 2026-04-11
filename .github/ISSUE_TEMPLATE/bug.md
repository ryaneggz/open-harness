---
name: Bug Report
about: Report something that is broken
title: "[BUG] "
labels: bug
assignees: ""
---

## Description

<!-- What is broken? -->

## Steps to Reproduce

1. <!-- Step 1 -->
2. <!-- Step 2 -->
3. <!-- Step 3 -->

## Expected Behavior

<!-- What should happen? -->

## Actual Behavior

<!-- What happens instead? -->

## Environment

- **Node.js**: <!-- node --version -->
- **Next.js**: <!-- from package.json -->
- **PostgreSQL**: 16-alpine
- **Browser**: <!-- e.g. Chrome 120, Firefox 121 -->

---

## Agent Assignment

### Metadata

> **IMPORTANT**: Validate this metadata before starting work.

```yml
agent: "next-postgres-shadcn"
branch: "agent/next-postgres-shadcn"
worktree_path: ".worktrees/agent/next-postgres-shadcn"
pull_request: "FROM agent/next-postgres-shadcn TO development"
```

### Workflow

```bash
# Enter the sandbox
openharness shell next-postgres-shadcn
claude

# When complete — PR from agent branch to development
cd .worktrees/agent/next-postgres-shadcn
git add -A && git commit -m "fix(<issue#>): <description>"
git push -u origin agent/next-postgres-shadcn
gh pr create --base development --title "fix(<issue#>): <shortdesc>" --body "Closes #<issue#>"
```

---

## Acceptance Criteria

- [ ] Bug is fixed and no longer reproducible
- [ ] Regression test added (Vitest or Playwright)
- [ ] Lint + format + type-check pass
- [ ] Verified via agent-browser at `https://next-postgres-shadcn.ruska.dev`
- [ ] No regressions introduced
- [ ] PR targets `development` branch
