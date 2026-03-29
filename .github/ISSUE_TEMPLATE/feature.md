---
name: Feature Request
about: Propose a new feature for Open Harness
title: "[FEAT] "
labels: enhancement
assignees: ""
---

## Summary

<!-- One-sentence description of what you want to add. -->

## Motivation

<!-- Why is this needed? What problem does it solve? -->

## Proposed Implementation

<!-- Describe the approach at a high level. -->

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
git add -A && git commit -m "feat(<issue#>): <description>"
git push -u origin agent/<agent-name>
gh pr create --base development --title "feat(<issue#>): <shortdesc>" --body "Closes #<issue#>"
```

---

## Acceptance Criteria

- [ ] Feature works as described
- [ ] No regressions to existing sandbox functionality
- [ ] README updated if user-facing behavior changed
- [ ] PR targets `development` branch
