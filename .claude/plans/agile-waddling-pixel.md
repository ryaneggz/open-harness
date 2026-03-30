# Plan: Root-Level CLAUDE.md and AGENTS.md

## Context

The project has a `workspace/` folder that serves as the template for all agent sandboxes, but the project root has no CLAUDE.md or AGENTS.md. The root-level Claude Code instance currently has no instructions defining its role. We need root-level files that clearly scope the orchestrator's purpose: managing sandboxed agents via `.worktrees/`, not writing application code.

Additionally, the Makefile and `.gitignore` still reference `worktrees/` (no dot) while the actual directory on disk is `.worktrees/`. This needs to be reconciled.

## Changes

### 1. Create `/home/ryaneggz/ruska-ai/sandboxes/AGENTS.md` (new file)

The canonical root instruction file. Content defines:

- **Identity**: You are the harness orchestrator, not a coding agent
- **Permissions**: Git-only operations (per `.claude/settings.local.json`)
- **Lifecycle** with three phases:
  - **Setup**: Create GitHub issue → `make NAME=X quickstart` → `make NAME=X shell` → start agent
  - **Validate**: `make list` to check running sandboxes, `make NAME=X shell` to verify workspace files exist (`AGENTS.md`, `SOUL.md`, `MEMORY.md`), `make NAME=X heartbeat-status` for heartbeat health
  - **Teardown**: Commit/push any unmerged work → `make NAME=X stop` → `make NAME=X clean`
- **Git workflow**: Branch conventions (`agent/<name>` from `development`), commit format, PR targets
- **Project structure**: Brief map pointing to key directories
- **Boundary**: All coding/building/testing happens inside sandboxes, never at root

### 2. Create `/home/ryaneggz/ruska-ai/sandboxes/CLAUDE.md` as symlink → `AGENTS.md`

Matches the `workspace/` convention where `CLAUDE.md` symlinks to `AGENTS.md`.

```bash
cd /home/ryaneggz/ruska-ai/sandboxes && ln -s AGENTS.md CLAUDE.md
```

### 3. Update Makefile: `worktrees/` → `.worktrees/`

Line 16: Change `WORKTREE = worktrees/$(NAME)` → `WORKTREE = .worktrees/$(NAME)`

### 4. Update `.gitignore`: `worktrees/` → `.worktrees/`

```
worktrees/*          →  .worktrees/*
!worktrees/.gitkeep  →  !.worktrees/.gitkeep
```

### 5. Track `.worktrees/.gitkeep`

Ensure `.worktrees/.gitkeep` exists and is tracked (replacing the deleted `worktrees/.gitkeep`).

## Files to Modify

| File | Action |
|------|--------|
| `AGENTS.md` | Create (new) |
| `CLAUDE.md` | Create symlink → `AGENTS.md` |
| `Makefile` | Edit line 16: `worktrees/` → `.worktrees/` |
| `.gitignore` | Edit: `worktrees/` → `.worktrees/` |
| `.worktrees/.gitkeep` | Ensure exists and tracked |

## Verification

1. `cat CLAUDE.md` resolves through symlink and shows AGENTS.md content
2. `make list` still works (references `.worktrees/` correctly)
3. `git status` shows the new files staged cleanly
4. `.worktrees/` contents are still gitignored (except `.gitkeep`)
