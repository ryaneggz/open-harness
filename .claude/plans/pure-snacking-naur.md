# Plan: Rename `/setup-check` to `/doctor`

## Context

The `/setup-check` skill runs `npm run test:setup` (8 vitest tests) and auto-remediates failures. The user wants it named `/doctor` instead — more intuitive for a diagnostic + fix skill.

## Changes

### 1. Rename skill directory

```
workspace/.claude/skills/setup-check/  →  workspace/.claude/skills/doctor/
```

Update `name:` in frontmatter from `setup-check` to `doctor`.

### 2. Update AGENTS.md skills table

```
- | `/setup-check` | After rebuild/restart — verify full stack health, auto-fix failures (`npm run test:setup`) |
+ | `/doctor`      | Diagnose and fix the full stack — run tests, auto-remediate, re-verify (`npm run test:setup`) |
```

### 3. Update provision skill reference

In `.claude/skills/provision/SKILL.md` step 7 report block, change:
```
- /setup-check            # re-run health checks anytime
+ /doctor                 # diagnose and fix issues anytime
```

## Files

| File | Action |
|------|--------|
| `workspace/.claude/skills/setup-check/SKILL.md` | Delete (via mv) |
| `workspace/.claude/skills/doctor/SKILL.md` | Create (renamed + updated frontmatter) |
| `workspace/AGENTS.md` | Edit: rename in skills table |
| `.claude/skills/provision/SKILL.md` | Edit: update reference |

## Verification

- `/doctor` appears in skill list
- `workspace/.claude/skills/setup-check/` no longer exists
- No remaining references to `setup-check` as a skill name
