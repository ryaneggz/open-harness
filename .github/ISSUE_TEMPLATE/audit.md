---
name: Audit
about: Review or audit existing code, config, or processes
title: "[AUDIT] "
labels: audit
assignees: ""
---

## Scope

<!-- What is being audited? Files, directories, systems, or processes. -->

## Objective

<!-- What are you looking for? e.g. security issues, dead code, config drift, compliance gaps -->

## Checklist

- [ ] <!-- Area 1 to review -->
- [ ] <!-- Area 2 to review -->
- [ ] <!-- Area 3 to review -->

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

# If the audit produces fixes — PR from agent branch to development
cd worktrees/<agent-name>
git add -A && git commit -m "audit(<issue#>): <description>"
git push -u origin agent/<agent-name>
gh pr create --base development --title "audit(<issue#>): <shortdesc>" --body "Closes #<issue#>"
```

---

## Deliverables

- [ ] Findings documented in the PR description or a report file
- [ ] Fixes applied (if applicable)
- [ ] PR targets `development` branch (if changes were made)
