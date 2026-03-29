---
name: Task
about: A discrete unit of work to be completed
title: "[TASK] "
labels: task
assignees: ""
---

## Description

<!-- What needs to be done? Be specific. -->

## Context

<!-- Any relevant background, links, or dependencies. -->

---

## Agent Assignment

### Metadata

> **IMPORTANT**: The very first step should _ALWAYS_ be validating this metadata section to maintain a **CLEAN** development workflow.

```yml
agent: "<agent-name>"
branch: "agent/<agent-name>"
worktree_path: "worktrees/<agent-name>"
pull_request: "FROM agent/<agent-name> TO development"
```

### Workflow

```bash
# Enter the assigned agent's sandbox
make NAME=<agent-name> shell
claude

# When complete — PR from agent branch to development
cd worktrees/<agent-name>
git add -A && git commit -m "task(<issue#>): <description>"
git push -u origin agent/<agent-name>
gh pr create --base development --title "task(<issue#>): <shortdesc>" --body "Closes #<issue#>"
```

---

## Done When

- [ ] <!-- Criteria 1 -->
- [ ] <!-- Criteria 2 -->
- [ ] PR targets `development` branch
