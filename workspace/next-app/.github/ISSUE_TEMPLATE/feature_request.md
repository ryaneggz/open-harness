---
name: Feature Request
about: Propose a new feature with enough detail for autonomous agent implementation
title: "feat: "
labels: ["enhancement"]
assignees: ""
---

## Metadata

> **IMPORTANT**: The very first step should _ALWAYS_ be validating this metadata section to maintain a **CLEAN** development workflow.

```yml
pull_request_title: "FROM feat/[issue#]-[shortdesc] TO development"
branch: "feat/[issue#]-[shortdesc]"
worktree_path: "$WORKSPACE/.worktrees/feat-[issue#]"
```

---

## User Stories

<!-- Define the feature from the user's perspective FIRST. Every story follows the format:
     "As a [role], I want [capability] so that [benefit]."
     These stories drive all downstream decisions — integration points, storage, UI, and acceptance criteria. -->

- As a **[role]**, I want **[capability]** so that **[benefit]**.
- As a **[role]**, I want **[capability]** so that **[benefit]**.

---

## Summary

<!-- Brief context beyond the user stories. Include visual references if applicable. -->



### Visual Reference

<!-- Screenshots, mockups, or links to reference implementations. -->

---

## Key Integration Points

<!-- Backend files/functions that need changes. Describe the ROLE each plays. -->

| File | Function(s) | Role |
|------|-------------|------|
| `backend/src/...` | `function_name()` | _e.g., Entry point where feature must be loaded into agent context_ |

---

## UI Integration Points

<!-- Which existing frontend components are modified or extended? Where does the new UI live? -->

| Component / Route | Change Type | Description |
|-------------------|-------------|-------------|
| _e.g., `BaseToolMenu` (`+` button)_ | Modify | _e.g., Add skill toggle to existing menu_ |
| _e.g., `/skills`_ | New page | _e.g., Dedicated CRUD management page_ |

---

## Storage

<!-- Where and how is data persisted? Specify the pattern to follow. -->

- **Persistence layer**: <!-- e.g., LangGraph Store, Supabase PostgreSQL, filesystem -->
- **Namespace / table**: <!-- e.g., `(user_id, "skills")` -->
- **Model pattern**: <!-- e.g., Pydantic model following BaseRepo/ServiceContext pattern -->

---

## Architectural Decisions

<!-- Explicit decisions that prevent misinterpretation. State the source of truth, state management approach, etc. -->

- **Source of truth**: <!-- e.g., Backend — NOT localStorage. Server-persisted configuration. -->
- **State management**: <!-- e.g., React Query cache invalidation on mutations -->
- **Auth / scoping**: <!-- e.g., User-scoped via session user_id -->

---

## Documentation

<!-- Links to design principles, reference implementations, or relevant specs. -->

- 

---

## Development Setup

### Dependencies

| Service | Address | Notes |
|---------|---------|-------|
| Redis | `localhost:6379` | Docker container |
| Postgres | `localhost:5432` | Docker container |

### Commands

```bash
# See package.json for scripts
```

### Wiki

> **⚠️ IMPORTANT:** Wiki lives in a **separate repo**. Changes to `@wiki` must be committed directly to the wiki repo, **not** the main project repo.

---

## Design Principles

- Simplicity is beauty, complexity is pain.
- _ALWAYS_ look at the current codebase first — achieve the goal in the **least amount of changes**.
- TDD-first: write tests before implementation.
- <!-- Add any feature-specific principles here -->

---

## Validation Tools

<!-- Explicit tool callouts for E2E or integration validation. -->

- [ ] Load `agent-browser` skill with screenshots to validate E2E. This validates test assumptions for completion promise.

---

## Acceptance Criteria

<!-- Every criterion must be binary — testable by an agent with a pass/fail outcome. Avoid subjective language. -->

- [ ] Implementation plan is thoroughly documented
- [ ] All previous & new tests pass, validated using `agent-browser` CLI
- [ ] New code follows existing repo/service/route patterns (e.g., BaseRepo, ServiceContext)
- [ ] No new dependencies added beyond what's already in the project (or justified in PR description)
- [ ] <!-- Add feature-specific criteria -->