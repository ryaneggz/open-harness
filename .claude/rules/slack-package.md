# Slack Package (pi-mom)

## Source of Truth

`packages/slack/` is a vendored fork of `ryaneggz/pi-mono/packages/mom/`. It is NOT the upstream npm package.

## Critical Rules

1. **NEVER** restore dist files from the npm package `@mariozechner/pi-mom` — the fork has diverged with features the upstream lacks (configurable provider, tool suppression, threadTs)
2. **NEVER** manually patch `/opt/slack/` — it no longer exists; runtime links from bind-mount
3. **ALL** source changes go in `packages/slack/src/`, rebuild dist, commit BOTH `src/` and `dist/`
4. Sibling deps (`pi-agent-core`, `pi-ai`, `pi-coding-agent`) use EXACT version pins — no caret ranges
5. The bot reads provider/model from openharness agent `settings.json` — the upstream hardcodes `anthropic`

## Build

```bash
# With tsgo (if available):
pnpm run build

# Fallback:
pnpm run build:tsc
```

## Key Differences from Upstream npm

- Configurable LLM provider via env vars (upstream hardcodes anthropic)
- Thread replies via postInThread (upstream uses postMessage)
- Tool output suppression (errors only in threads)
- Event threadTs support (respond in existing threads)
- 64+ vitest tests

## Architecture Spec

See `.claude/specs/slack-package-spec.md` for full details.
