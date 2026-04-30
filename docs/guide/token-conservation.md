---
title: "Token Conservation"
sidebar_position: 9
---


Reduce token usage across all agent sessions using Caveman-inspired compression techniques. Achieves ~46% input token reduction on identity files and rules that load every turn.

Inspired by [Caveman](https://github.com/JuliusBrussee/caveman) and the [Karpathy autoresearch](https://github.com/karpathy/autoresearch) principle: fewer tokens doesn't mean less intelligence — it means more signal, less noise.

## Why It Matters

Every agent session loads identity files (AGENTS.md, SOUL.md, TOOLS.md, USER.md, HEARTBEAT.md) and auto-loaded rules on every turn. Uncompressed, this costs ~3,400 tokens per turn. Over a 50-turn session: ~170K tokens just for context.

With compression: ~1,820 tokens per turn. **~77K tokens saved per session.**

## How It Works

### Output Compression (Rule)

The `token-conservation.md` rule auto-loads and governs agent output style:

- Drop articles (a, the, an), filler (just, really, basically), hedging (might, perhaps)
- Use fragment syntax: "Work within workspace/" not "You should work within the workspace/ directory"
- Pattern: `[thing] [action] [reason]. [next step].`
- Code, URLs, paths, JSON, tables preserved unchanged

### Input Compression (Skill)

The `/compress` skill rewrites workspace files into terse form:

```
/compress identity    # Compress AGENTS.md, SOUL.md, TOOLS.md, USER.md, HEARTBEAT.md
/compress rules       # Compress all .claude/rules/*.md
/compress all         # Both
```

Compresses files in-place — no backup copies. Skips files that are already compressed (filler density < 2%). Restore via `git checkout -- <file>`.

### Pre-compressed Templates

Base workspace templates ship pre-compressed. New agents start with compressed files out of the box.

## Intensity Levels

| Level | Style | When |
|-------|-------|------|
| **Lite** | Professional terseness, grammar intact | User stories, README, PR descriptions |
| **Full** | Articles dropped, fragments OK | Default for all agent responses |
| **Ultra** | Telegraphic, abbreviations | Sub-agent output consumed by other agents |

## What Gets Compressed

| Target | Compressed? | Reason |
|--------|-------------|--------|
| AGENTS.md | Yes | Loaded every turn, prose-heavy |
| SOUL.md | Yes | Loaded every turn |
| TOOLS.md | Yes | Loaded every turn |
| USER.md | Yes | Loaded every turn |
| HEARTBEAT.md | Yes | Loaded every turn |
| `.claude/rules/*.md` | Yes | Auto-loaded every turn |
| IDENTITY.md | No | Already terse metadata |
| MEMORY.md | No | Agent-managed, evolves at runtime |
| README.md | No | Human documentation |
| SKILL.md files | No | Instructions need full clarity |
| Agent .md files | No | Prompts need full clarity |
| JSON/YAML | No | Structured data |

## What's Preserved Unchanged

Never compress: code blocks, inline code, URLs, file paths, JSON, YAML frontmatter, tables, command examples, error output, commit messages, technical terms, version numbers.

## Measured Savings

| File | Before | After | Reduction |
|------|--------|-------|-----------|
| AGENTS.md | ~1,119 tokens | ~600 tokens | 46% |
| SOUL.md | ~162 tokens | ~90 tokens | 44% |
| TOOLS.md | ~335 tokens | ~180 tokens | 46% |
| USER.md | ~171 tokens | ~95 tokens | 44% |
| HEARTBEAT.md | ~223 tokens | ~125 tokens | 44% |
| Rules (8 files) | ~1,352 tokens | ~730 tokens | 46% |
| **Per turn** | **~3,362** | **~1,820** | **~46%** |

## Opting Out

Agents can exit terse mode:
- Say "normal mode" or "stop caveman"
- Re-enter with "caveman" or "terse mode"

To restore a file to its pre-compression version:
```bash
git checkout -- workspace/AGENTS.md
```

## Session Behavior

Token conservation is active every response by default. Persists across turns. Does not revert after many messages. Only explicit opt-out disables it.
