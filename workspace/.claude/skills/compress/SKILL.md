---
name: compress
description: |
  Compress workspace identity files and rules to reduce input tokens.
  Strips articles, filler, hedging while preserving code, URLs, paths,
  tables, and technical terms. Creates .original.md backups.
  Inspired by Caveman (github.com/JuliusBrussee/caveman).
  TRIGGER when: first session start (if .original.md backups don't exist),
  after editing identity files, "compress", "reduce tokens", or "caveman compress".
argument-hint: "identity | rules | all | <file-path>"
---

# Compress

Reduce input token load by compressing workspace files into terse form.
~46% average savings on prose-heavy files.

## Instructions

### 1. Parse target

Arguments: `$ARGUMENTS`

| Argument | Files |
|----------|-------|
| `identity` | AGENTS.md, SOUL.md, TOOLS.md, USER.md, HEARTBEAT.md |
| `rules` | All `.claude/rules/*.md` files |
| `all` | Both identity and rules |
| `<path>` | Specific file |

If no argument, default to `all`.

### 2. For each target file

a. Check if `.original.md` backup exists. If not, copy current file to `<name>.original.md`.
   If backup exists, read the `.original.md` as source (always compress from original, not from already-compressed version).

b. Read the source content.

c. Apply compression rules:

**Strip**:
- Articles: a, an, the
- Filler: just, really, basically, simply, actually, essentially, generally, typically, usually, normally
- Hedging: might, perhaps, could potentially, it seems like, you may want to, consider
- Pleasantries: please, please note, note that, keep in mind, it's worth noting, importantly
- Transitional: however, therefore, additionally, furthermore, in addition, as a result, for example
- Verbose phrases: "in order to" → "to", "make sure to" → "ensure", "you should" → (drop), "it is important to" → (drop), "the reason is that" → "because"

**Preserve untouched**:
- Code blocks (``` ... ```)
- Inline code (`...`)
- URLs (http://, https://)
- File paths (/, ./, ../, ~/)
- JSON and YAML content
- Table structures (| ... |)
- Command examples (lines starting with $ or containing CLI commands)
- Technical terms, version numbers, selectors
- Headings (# ... ) — keep structure
- List markers (-, *, 1.) — keep structure

**Compress**:
- Multi-sentence explanations → single-line directive
- "You should work within the workspace/ directory" → "Work within workspace/"
- "The Next.js project lives in projects/next-app/" → "Next.js project: projects/next-app/"
- "Do not modify ~/install/ — those are provisioning scripts" → "Don't modify ~/install/ (provisioning scripts)"

d. Write compressed version to the original file path.

### 3. Report savings

For each file:
```
<filename>: <original_words> → <compressed_words> words (<percent>% reduction)
```

Summary:
```
Total: <total_original> → <total_compressed> words (~<tokens_saved> tokens saved per turn)
```

### 4. Verify freshness

Run `/freshness audit` to confirm all pairs are in sync after compression.
If any pair is flagged as drifted, report the discrepancy.

### 5. Memory Protocol

Log compression run to `memory/YYYY-MM-DD.md`.

## Guidelines

- Always compress from `.original.md` source, not from already-compressed version
- If a file is already compressed (backup exists, content matches), skip it
- Never compress IDENTITY.md (already terse metadata)
- Never compress MEMORY.md (agent-managed, evolves at runtime)
- Never compress README.md (human documentation)
- Never compress SKILL.md files (instructions need full clarity)
- Never compress agent definition .md files (prompts need full clarity)
- Test: after compression, verify all code blocks, URLs, paths, and tables survived intact

## Restore

To restore a file to its uncompressed version:
```bash
cp <name>.original.md <name>.md
```
