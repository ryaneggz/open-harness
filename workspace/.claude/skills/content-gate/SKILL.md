---
name: content-gate
description: |
  Validate content quality before publishing. Checks frontmatter, conciseness,
  structure, links, code blocks, length, and visual rendering via agent-browser.
  TRIGGER when: before committing docs/content/** or docs/wiki/pages/**,
  after /wiki-ingest, "check content quality", "content gate".
argument-hint: "<file-path> or 'all' for all content files"
---

# Content Gate

Validate content files against 7 quality metrics before publishing. Read-only audit — does not modify files.

## Instructions

### 1. Parse target

Arguments: `$ARGUMENTS`

| Argument | Files |
|----------|-------|
| `all` | `docs/content/docs/**/*.mdx` + `docs/wiki/pages/**/*.md` |
| `<file-path>` | Specific file |

If no argument, default to `all`.

Skip: index files, meta.json, .gitkeep.

### 2. For each target file, run checks 3-9

### 3. Frontmatter check

Parse YAML between `---` markers at the top of the file. Verify both `title` and `description` keys exist and are non-empty strings.

- PASS: both present and non-empty
- FAIL: either missing or empty

### 4. Conciseness check

Same prohibited patterns as `/eval-conciseness`:
- Articles: `\b(a|an|the)\b` (case-insensitive, word-boundary)
- Filler: `\b(just|really|basically|simply|actually|essentially|generally|typically|usually|normally)\b`
- Hedging: `\b(might|perhaps)\b`, `could potentially`, `it seems like`, `you may want to`
- Pleasantries: `\bplease\b`, `note that`, `keep in mind`, `it's worth noting`, `importantly`
- Verbose: `in order to`, `make sure to`, `you should`, `it is important to`

**Exclude** from scanning:
- Code blocks (``` ... ```)
- Inline code (`` ` ... ` ``)
- URLs (http://, https://)
- File paths (starting with /, ./, ../, ~/)
- YAML frontmatter (between `---` markers)
- Table cell content between `|` markers that contains code or paths

Count total scannable words (prose outside exclusion zones).

Compute density: `filler_hits / total_scannable_words`

Gate: `PASS` if density < 0.02. `FAIL` if >= 0.02.

### 5. Structure check

Extract all markdown headings (`#`, `##`, `###`, etc.). Verify heading levels are hierarchical — no level is skipped.

- PASS: h1 -> h2 -> h3 (each level introduced before its children)
- FAIL: e.g., h1 then h3 without h2 in between

### 6. Links check

Find all `[text](path)` patterns where path ends in `.md` or `.mdx`. Resolve each path relative to the file's directory. Verify the target file exists on disk.

- PASS: all internal link targets exist
- FAIL: one or more targets missing (list them)

### 7. Code blocks check

Find all fenced code blocks (triple-backtick blocks). Verify each opening fence has a language tag (e.g., ```typescript, ```bash, ```yaml).

- PASS: all fenced code blocks have language tags
- FAIL: one or more code blocks missing language tags (list line numbers)

### 8. Length check

Count words in prose content — exclude frontmatter and code blocks.

Gate: `PASS` if word count > 50. `FAIL` if <= 50.

### 9. Render check (agent-browser)

Determine the route for the file:
- Files in `docs/content/docs/` -> `/docs/<slug>` (strip extension, map path)
- Files in `docs/wiki/pages/` -> `/wiki/<slug>` (strip extension, map path)

Run:
1. `agent-browser open "http://localhost:3001/<route>"`
2. `agent-browser is visible "h1"` — verify page heading renders
3. `agent-browser is visible "[data-sidebar]"` — verify sidebar present
4. `agent-browser snapshot -c` — capture screenshot
5. `agent-browser close`

- PASS: h1 visible and sidebar present
- FAIL: either element missing
- SKIP: if dev server not running on port 3001, skip render check with note

### 10. Report

Output per-file results:

```
CONTENT GATE — <file-path>
=====================================================
Frontmatter:  PASS  [title + description present]
Conciseness:  0.008 [PASS < 0.02]
Structure:    PASS  [h1 -> h2 -> h3, no skips]
Links:        PASS  [3/3 targets exist]
Code blocks:  PASS  [2/2 have language tags]
Length:       PASS  [247 words > 50 min]
Renders:      PASS  [h1 visible, sidebar present]

Overall Gate: PASS
```

For FAIL items, list specifics:
```
FAIL: Frontmatter — missing "description" key
FAIL: Conciseness — density 0.031: "the" (line 12), "simply" (line 18), "you should" (line 24)
FAIL: Structure — h3 at line 15 without preceding h2
FAIL: Links — target not found: ../setup/install.md (line 8)
FAIL: Code blocks — no language tag at line 22, line 45
FAIL: Length — 32 words (minimum 50)
FAIL: Renders — h1 not visible on page /docs/getting-started
```

## Integration Points

- Called by `/wiki-ingest` after creating/updating pages (before commit)
- Called before committing to `docs/content/docs/`
- Can be added to pre-commit hook for content paths

## Memory Protocol

Log eval run to `memory/YYYY-MM-DD.md`:

```markdown
## [Content Gate] -- HH:MM UTC
- **Result**: OP | NO-OP
- **Action**: gated N files
- **Passed**: M | **Failed**: F
- **Observation**: [one sentence summary]
```

## Guidelines

- Read-only audit tool — does NOT modify files
- Always read from actual files, never cached state
- Render check requires docs dev server running on port 3001
- Skip render check gracefully if server not available
