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

- **OS**: <!-- e.g. Ubuntu 22.04, macOS 14 -->
- **Docker**: <!-- docker --version -->
- **Make**: <!-- make --version -->

---

## Agent Assignment

### Metadata

> **IMPORTANT**: The very first step should _ALWAYS_ be validating this metadata section to maintain a **CLEAN** development workflow.

```yml
agent: "<agent-name>"
branch: "agent/<agent-name>"
worktree_path: ".worktrees/<agent-name>"
pull_request: "FROM agent/<agent-name> TO development"
```

### Workflow

```bash
# Enter the assigned agent's sandbox
make NAME=<agent-name> shell
claude

# When complete — PR from agent branch to development
cd .worktrees/<agent-name>
git add -A && git commit -m "fix(<issue#>): <description>"
git push -u origin agent/<agent-name>
gh pr create --base development --title "fix(<issue#>): <shortdesc>" --body "Closes #<issue#>"
```

---

## Acceptance Criteria

- [ ] Bug is fixed and no longer reproducible
- [ ] No regressions introduced
- [ ] PR targets `development` branch
