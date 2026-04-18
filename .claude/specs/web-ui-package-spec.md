# Web UI Package Spec

## Upstream Source

- Repository: `ryaneggz/pi-mono`
- Tag: `v0.62.0`
- Upstream package name: `@mariozechner/pi-web-ui`
- Vendored path: `packages/web-ui/`

## What It Is

A Lit-based ChatPanel component library for AI chat interfaces. Provides:

- `ChatPanel` — top-level web component wrapping the full chat UI
- `SettingsStore` — reactive store for provider/model settings
- `SessionsStore` — reactive store for conversation sessions
- `AppStorage` / `setAppStorage` — pluggable persistence layer
- Supporting components: `AgentInterface`, `MessageList`, `ProviderKeyInput`, dialog components, sandbox iframes, streaming containers

Built with `mini-lit` (a lightweight Lit wrapper), Tailwind CSS v4, and TypeScript.

## Divergence Points (as of Phase 0)

No functional divergences yet — this is a fresh vendor. Changes made:

1. Renamed package scope: `@mariozechner/pi-web-ui` → `@openharness/web-ui`
2. `@mariozechner/pi-ai` and `@mariozechner/pi-tui` pinned to exact `0.62.0` (stripped carets)
3. Added `"files": ["dist", "src", "README.md", "CHANGELOG.md"]` to package.json
4. Added `"test": "vitest run"` script and `vitest ^3.0.0` devDependency
5. Example app rewired: `file:../` → `workspace:*`, `file:../../ai` → exact `0.62.0` from npm

## Build Commands

```bash
# Install deps (from repo root):
pnpm install

# Build library only:
pnpm --filter @openharness/web-ui build

# Build library + example:
pnpm run build:web-ui

# Run smoke tests:
pnpm --filter @openharness/web-ui test
```

Build output:
- `packages/web-ui/dist/index.js` — ESM library bundle
- `packages/web-ui/dist/index.d.ts` — TypeScript declarations
- `packages/web-ui/dist/app.css` — Tailwind-compiled CSS

## Deferred Phase 2 Notes

- OpenHarness-specific divergences (if any) should be documented here as they are introduced
- If `@mariozechner/pi-tui` or `@mariozechner/pi-ai` need vendoring, follow the same pattern as this package
- The example app Docker build is handled in Phase 1 — not part of this vendoring step
- Future: consider adding an `exports` field for `./app.css` to the example's vite config if needed
