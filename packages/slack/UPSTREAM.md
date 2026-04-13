# Upstream Tracking

## Lineage

| Property | Value |
|----------|-------|
| **Upstream** | [badlogic/pi-mono](https://github.com/badlogic/pi-mono) |
| **Fork** | [ryaneggz/pi-mono](https://github.com/ryaneggz/pi-mono) |
| **Package** | `packages/mom/` → vendored here as `packages/slack/` |
| **Vendored at** | Fork commit `81469b3f` (2026-04-11) |
| **Base version** | `@mariozechner/pi-mom@0.62.0` |
| **Upstream version** | v0.66.1 (as of 2026-04-12) |

## Applied Commits

### From fork (ryaneggz/pi-mono)

| Commit | Date | Description |
|--------|------|-------------|
| `e23a7f05` | 2026-04-11 | Configurable model via openharness `settings.json` + thread replies |
| `81469b3f` | 2026-04-11 | Remove duplicate responses and usage summary from Slack |

### Harness-only changes (not yet in fork)

| Date | Description |
|------|-------------|
| 2026-04-12 | Tool output suppression — only errors post to Slack threads |
| 2026-04-12 | Event `threadTs` support — events can target existing threads |
| 2026-04-12 | Exported `extractToolResultText`, `formatToolArgsForSlack`, `parseEventContent`, `buildSyntheticEvent` for testing |
| 2026-04-12 | `threadParent` routing in `createSlackContext` |
| 2026-04-12 | 64+ vitest tests (5 test files) |

## Sibling Dependencies

These packages are consumed from npm (NOT vendored):

| Package | Pinned Version | Notes |
|---------|---------------|-------|
| `@mariozechner/pi-agent-core` | `^0.62.0` | Lock to exact when stable |
| `@mariozechner/pi-ai` | `^0.62.0` | Lock to exact when stable |
| `@mariozechner/pi-coding-agent` | `^0.62.0` | Lock to exact when stable |

## Cherry-Pick from Upstream

```bash
# In a clone of ryaneggz/pi-mono:
git remote add upstream https://github.com/badlogic/pi-mono.git
git fetch upstream

# Create scratch branch
git checkout -b upstream-sync main

# Cherry-pick specific commits (one at a time)
git cherry-pick <sha>

# Test, then PR into main
# Delete upstream-sync after merge
```

**Never** `git merge upstream/main` — cherry-pick only.

## Push Harness Changes to Fork

```bash
# Copy changed source files to a clone of ryaneggz/pi-mono:
cp packages/slack/src/agent.ts    <pi-mono>/packages/mom/src/agent.ts
cp packages/slack/src/events.ts   <pi-mono>/packages/mom/src/events.ts
cp packages/slack/src/main.ts     <pi-mono>/packages/mom/src/main.ts
cp packages/slack/src/slack.ts    <pi-mono>/packages/mom/src/slack.ts

# Build and test in the fork, then commit and push
```

## Identical Files (no sync needed)

These files are byte-for-byte identical between fork and harness:

- `src/context.ts`
- `src/download.ts`
- `src/log.ts`
- `src/sandbox.ts`
- `src/store.ts`
- `src/tools/` (all 7 files)
