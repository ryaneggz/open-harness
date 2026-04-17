---
name: freshness
description: |
  Audit .original.md ↔ .md pairs for drift. Report stale files and optionally
  re-compress drifted pairs. Prevents silent divergence between human-readable
  originals and token-compressed versions.
  TRIGGER when: after editing identity/rules files, "check freshness",
  "are originals stale", before releases, or periodically via heartbeat.
argument-hint: "audit | fix | <file-path>"
---

# Freshness

Detect and resolve drift between `.original.md` (human-readable source) and `.md` (compressed) file pairs.

## Instructions

### 1. Parse target

Arguments: `$ARGUMENTS`

| Argument | Behavior |
|----------|----------|
| `audit` | Report only — no modifications (default) |
| `fix` | Re-compress drifted pairs where `.original.md` is newer |
| `<path>` | Audit a specific file pair |

If no argument, default to `audit`.

### 2. Enumerate pairs

Find all `.original.md` files in two locations:

| Location | Pattern |
|----------|---------|
| Identity files | `*.original.md` in workspace root |
| Rules files | `.claude/rules/*.original.md` |

For each `.original.md`, derive the compressed counterpart by removing `.original` from the filename:
- `SOUL.original.md` → `SOUL.md`
- `.claude/rules/api.original.md` → `.claude/rules/api.md`

### 3. Check each pair

For each pair, run these checks:

a. **Existence** — both files must exist.
   - Missing `.md` → status: `MISSING_COMPRESSED`
   - Missing `.original.md` → status: `MISSING_ORIGINAL`

b. **Last-modified commit** — compare `git log -1 --format='%H %ct' -- <file>` for both files.
   - Same commit hash → status: `IN_SYNC`
   - Different commit hash → status: `DRIFTED`

c. **Drift direction** — when drifted, compare timestamps (`%ct`):
   - `.original.md` is newer → the compressed version is stale (safe to fix via `/compress`)
   - `.md` is newer → compressed was edited directly (requires manual resolution)

### 4. Report

Output a table:

```
## Freshness Audit

| File | Status | Detail |
|------|--------|--------|
| SOUL | IN_SYNC | both at e031d03 |
| AGENTS | DRIFTED | .original newer (abc1234 vs e031d03) — run /compress |
| .claude/rules/api | DRIFTED | .md newer (def5678 vs e031d03) — manual fix needed |
```

Summary line:
```
Result: <N> pairs checked, <M> in sync, <D> drifted, <X> missing
```

### 5. Fix mode

When argument is `fix`:

- For pairs where `.original.md` is newer: run `/compress <file-path>` on the original to regenerate the compressed version.
- For pairs where `.md` is newer: **do not auto-fix**. Warn:
  ```
  ⚠ <filename>.md was edited directly. Copy changes to <filename>.original.md first, then run /compress.
  ```
- For missing files: warn and skip.

### 6. Memory protocol

Log freshness audit to `memory/YYYY-MM-DD.md`:

```markdown
## [Freshness Audit] — HH:MM UTC
- **Result**: <N> pairs, <M> in sync, <D> drifted
- **Action**: audit | fix
- **Drifted**: <list of drifted files, or "none">
- **Fixed**: <list of fixed files, or "none">
```

## Guidelines

- Always compare using `git log`, not file modification time (`stat`) — git history is authoritative
- Never auto-fix when the compressed `.md` is the newer side — that means someone edited it directly and those changes would be lost
- If a file has no git history (untracked), flag it as `UNTRACKED` and skip comparison
- The `/compress` skill handles the actual compression — `/freshness fix` delegates to it
- Excluded from checks: `token-conservation.md`, `IDENTITY.md`, `MEMORY.md`, `README.md`, `SKILL.md` files (these are never compressed per `/compress` guidelines)
