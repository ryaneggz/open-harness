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

> **Git workflow**: see [.claude/rules/git.md](../../.claude/rules/git.md)

---

## Acceptance Criteria

- [ ] Bug is fixed and no longer reproducible
- [ ] Regression test added (Vitest or Playwright)
- [ ] Lint + format + type-check pass
- [ ] Verified via agent-browser at `https://oh.ruska.dev`
- [ ] No regressions introduced
- [ ] PR targets the default target branch (see `.claude/rules/git.md`)
