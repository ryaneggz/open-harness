---
name: eval-conciseness
description: |
  Score workspace files for conciseness using filler-word density.
  Measures prohibited-pattern density (articles, filler, hedging) in
  compressed files. Reports PASS/FAIL per file.
  TRIGGER when: after /compress, "score conciseness", "eval files",
  "check compression quality", or periodically via heartbeat.
argument-hint: "identity | rules | all | <file-path>"
---

# Eval Conciseness

Score compressed workspace files for conciseness. Deterministic, zero-cost filler-density check.

## Instructions

### 1. Parse target

Arguments: `$ARGUMENTS`

| Argument | Files |
|----------|-------|
| `identity` | AGENTS.md, SOUL.md, TOOLS.md, USER.md, HEARTBEAT.md |
| `rules` | All `.claude/rules/*.md` compressed files |
| `all` | Both identity and rules |
| `<path>` | Specific file |

If no argument, default to `all`.

### 2. For each target file

Skip files not in the compression system: IDENTITY.md, MEMORY.md, README.md, SKILL.md files, token-conservation.md.

### 3. Compute filler-word density

a. Scan for remaining prohibited patterns (same list as `/compress` strip rules):
   - Articles: `\b(a|an|the)\b` (case-insensitive, word-boundary)
   - Filler: `\b(just|really|basically|simply|actually|essentially|generally|typically|usually|normally)\b`
   - Hedging: `\b(might|perhaps)\b`, `could potentially`, `it seems like`, `you may want to`
   - Pleasantries: `\bplease\b`, `note that`, `keep in mind`, `it's worth noting`, `importantly`
   - Verbose: `in order to`, `make sure to`, `you should`, `it is important to`

b. **Exclude** from scanning:
   - Code blocks (``` ... ```)
   - Inline code (`` ` ... ` ``)
   - URLs (http://, https://)
   - File paths (starting with /, ./, ../, ~/)
   - YAML frontmatter (between `---` markers)
   - Table cell content between `|` markers that contains code or paths

c. Count total scannable words (prose outside exclusion zones).

d. Compute density: `filler_hits / total_scannable_words`

e. Gate: `PASS` if density < 0.02 (fewer than 2% filler words remaining). `FAIL` if >= 0.02.

### 4. Report

Output a scored table:

```markdown
## Conciseness Eval

| File | Words | Filler Hits | Density | Gate |
|------|-------|-------------|---------|------|
| AGENTS | 927 | 8 | 0.009 | PASS |
| SOUL | 105 | 0 | 0.000 | PASS |
| api | 51 | 3 | 0.059 | FAIL |

Result: N files scored, M PASS, F FAIL
```

For any FAIL, list the filler words found and their locations:
```
FAIL: api.md — filler words: "the" (line 3), "simply" (line 7), "you should" (line 12)
```

### 5. Memory protocol

Log eval run to `memory/YYYY-MM-DD.md`:

```markdown
## [Conciseness Eval] -- HH:MM UTC
- **Result**: OP | NO-OP
- **Action**: scored N files
- **Passed**: M | **Failed**: F
- **Observation**: [one sentence summary]
```

## Guidelines

- This is a scoring/audit tool — it does NOT modify files
- Always read from the actual files, never from cached state
- The filler-density check must respect the same exclusion zones as `/compress`
- Compressed files are the single source of truth — no originals exist
- To fix a FAIL: run `/compress <file-path>` or manually remove filler words
