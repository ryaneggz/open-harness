---
sidebar_position: 3
title: "Worktrees"
---

# Worktrees

Open Harness uses `git worktree` to give each in-flight branch its own working tree on disk — no branch switching, no stashing, no risk of accidentally committing to the wrong branch. Each agent or task can occupy its own worktree simultaneously.

## What a Worktree Is

A git worktree is a second (or third, or fourth) checkout of the same repository on a different branch. All worktrees share the same `.git` directory and object store. Creating a worktree does not clone anything — it is a lightweight operation that creates a new directory linked to the repo.

Inside the container, the primary checkout lives at `/home/orchestrator/harness`. Worktrees live under `/home/orchestrator/harness/.worktrees/`, which maps back to `.worktrees/` in the project root on the host.

## Directory Layout

```
/home/orchestrator/harness/                       ← primary checkout (development branch)
/home/orchestrator/harness/.worktrees/            ← worktree root (gitignored)
/home/orchestrator/harness/.worktrees/.gitkeep    ← tracked so the directory exists in git
/home/orchestrator/harness/.worktrees/task/164-docusaurus-docs-site/   ← worktree for task branch
/home/orchestrator/harness/.worktrees/feat/42-slack-thread-replies/    ← worktree for feature branch
```

The `.worktrees/` directory is gitignored via `.gitignore`. Only `.worktrees/.gitkeep` is committed, ensuring the directory exists after a fresh clone without committing any worktree content.

## Creating a Worktree

To cut a new branch and check it out in a worktree in one step:

```bash
BASE=development
git worktree add -b task/164-docusaurus-docs-site \
  .worktrees/task/164-docusaurus-docs-site $BASE
```

To add an existing branch as a worktree:

```bash
git worktree add .worktrees/task/164-docusaurus-docs-site task/164-docusaurus-docs-site
```

To remove a worktree when the branch is merged:

```bash
git worktree remove .worktrees/task/164-docusaurus-docs-site
```

## Branch Naming Convention

Branch names follow the format `<prefix>/<issue#>-<short-desc>` where:

- `<prefix>` is one of: `feat`, `fix`, `task`, `audit`, `skill`, `agent`
- `<issue#>` is the GitHub issue number the branch addresses
- `<short-desc>` is kebab-case, five words or fewer

Examples: `task/164-docusaurus-docs-site`, `feat/42-slack-thread-replies`

The worktree path mirrors the branch name exactly: `.worktrees/<prefix>/<issue#>-<short-desc>`.

PRs always target the `development` branch (the default target branch for this repo). New branches are always cut from `development`.

## Isolation Rules

Each worktree provides file-level isolation. Two agents can work simultaneously on different branches without any conflict at the working-tree level. However, there are important constraints to respect:

**Do not stash and switch branches.** When a primary checkout has uncommitted changes that belong to a separate PR, use a worktree instead. Stashing and switching branches risks losing context. The correct flow is:

1. Cut a worktree off the target base: `git worktree add -b <new-branch> .worktrees/<new-branch> development`
2. Copy any in-flight files into the worktree with `cp`
3. Commit in the worktree — the primary checkout remains untouched

Before discarding duplicated state from the primary checkout, verify byte-equivalence using `md5sum` to confirm the worktree commit matches the working-tree files.

**Stacked PRs.** When a branch depends on another open PR, stack it instead of waiting. Rebase the dependent branch onto the parent branch, update the PR base with `gh pr edit <pr#> --base <parent-branch>`, and let GitHub auto-retarget when the parent merges.

## Heartbeat Daemon and Worktrees

The heartbeat daemon in `packages/sandbox/src/lib/heartbeat/` watches the `workspace/heartbeats/` directory inside every active worktree. When a new worktree appears (detected by watching `.git/worktrees/`), the daemon discovers it automatically and starts managing its heartbeat schedules. See the [Daemon](./daemon) page for details.

## Practical Example

The worktree for this documentation task was created as:

```bash
git worktree add -b task/164-docusaurus-docs-site \
  .worktrees/task/164-docusaurus-docs-site development
```

Work happens in `/home/orchestrator/harness/.worktrees/task/164-docusaurus-docs-site/`. A PR is opened targeting `development`. When the PR merges, the worktree is removed with `git worktree remove .worktrees/task/164-docusaurus-docs-site`.
