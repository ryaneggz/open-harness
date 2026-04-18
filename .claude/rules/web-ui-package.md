# Web UI Package (pi-web-ui)

## Source of Truth

`packages/web-ui/` is a vendored fork of `ryaneggz/pi-mono/packages/web-ui/` at tag v0.62.0. It is NOT the upstream npm package.

## Critical Rules

1. **NEVER** restore dist files from the npm package `@mariozechner/pi-web-ui` — the fork is scoped to `@openharness` and may diverge with features the upstream lacks
2. **NEVER** pull from npm for `@openharness/web-ui` — resolve via pnpm workspace (`workspace:*`)
3. **ALL** source changes go in `packages/web-ui/src/`, rebuild dist, commit BOTH `src/` and `dist/`
4. Sibling mariozechner deps (`@mariozechner/pi-ai`, `@mariozechner/pi-tui`) use EXACT version pins — no caret ranges (pinned to `0.62.0`)
5. The example app references this package via `"@openharness/web-ui": "workspace:*"` — not a file path

## Build

```bash
# Build the library:
pnpm --filter @openharness/web-ui build

# Build everything (library + example):
pnpm run build:web-ui
```

## Key Differences from Upstream npm

- Renamed to `@openharness/web-ui` scope (upstream is `@mariozechner/pi-web-ui`)
- Sibling `@mariozechner/*` deps pinned to exact `0.62.0` (upstream uses caret ranges)
- `files` field added to package.json for clean publishing
- Vitest smoke tests added (`src/__tests__/dist-integrity.test.ts`)

## Architecture Spec

See `.claude/specs/web-ui-package-spec.md` for full details.
