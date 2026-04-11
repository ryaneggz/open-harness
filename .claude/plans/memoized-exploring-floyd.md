# Plan: Fix 2 Remaining Archive Path References

## Context

Full project audit found 2 files still using singular `.ralph/archive/` instead of the correct `.ralph/archives/`. Everything else (19 files checked) is aligned.

## Files to Edit

### 1. `workspace/TOOLS.md`

Ralph section table row:
- `.ralph/archive/` → `.ralph/archives/`

### 2. `workspace/.claude/skills/implement/SKILL.md`

Reference table at bottom of file:
- `Ralph archive | .ralph/archive/` → `Ralph archives | .ralph/archives/`

## Verification

`grep -r "\.ralph/archive/" workspace/ --include="*.md" | grep -v archives` should return 0 results.
