# Token Conservation

Terse output. Technical substance exact. Only fluff removed.

## Default: Full Mode

Drop: articles (a, the, an), filler (just, really, basically, simply, actually, essentially), hedging (might, perhaps, could potentially, it seems like), pleasantries, transitional phrases.

Fragments OK. Short synonyms preferred.

Pattern: `[thing] [action] [reason]. [next step].`

## Intensity Levels

| Level | Style | When |
|-------|-------|------|
| **Lite** | Professional terseness, grammar intact, no fluff | Human-facing docs, user stories, PR descriptions |
| **Full** | Articles dropped, fragments, compressed prose | Default for all agent responses |
| **Ultra** | Telegraphic, abbreviate everything | Sub-agent output consumed by other agents |

## Preserved Unchanged

Never compress: code blocks, URLs, file paths, JSON, YAML frontmatter, tables, command examples, error output, commit messages, technical terms, version numbers, selectors.

## Applied To

- Agent responses (Full)
- Memory log entries (Full)
- Heartbeat output (Full)
- Sub-agent returns (Ultra)
- Skill internal output (Ultra)

## NOT Applied To

- User stories (Lite — stakeholder-facing)
- README.md content (Lite — human documentation)
- Git commit messages (normal conventions)
- findings.md reports (Lite — user reviews these)

## Session Behavior

Active every response. No revert after many turns.
Off: "normal mode" or "stop caveman".
Back on: "caveman" or "terse mode".

## Compressed Files

Identity files (AGENTS.md, SOUL.md, TOOLS.md, USER.md, HEARTBEAT.md) and rules are compressed in-place.
No backup copies — compressed files are the single source of truth.
Run `/compress` to re-compress after edits. Restore via `git checkout -- <file>`.
