# Spec: Migrate docs/ from Fumadocs back to Nextra

## Status

Approved — 2026-04-19 (revised from Nextra 2 to Nextra 3 after dep-hell discovery during implementation)

## Motivation

The current `docs/` site uses Fumadocs (migrated in `cdd2c74`, 2026-04-17). User feedback: the **Nextra** theme that shipped in PR #31 (`85c9aba`) produced a cleaner, more opinionated reading experience. Fumadocs' layout has required hand-patching (see commits `ddf4479`, `34bf212`, `bdfd477` — sidebar clipping, duplicate h1s, Mermaid remark plugin).

The goal is to revert the **framework** to Nextra 2 while preserving the **content gains** made since PR #31 (29 MDX pages across `docs/`, wiki source, Mermaid support).

## Prior art

| Ref | Description |
|-----|-------------|
| PR #28 | Planning doc `NEXTRA_INTEGRATION_PLAN.md` — option analysis, phased rollout |
| PR #31 (commit `85c9aba`) | Nextra 2.13.4 scaffold — Next.js 14, Pages Router, 12 MDX pages, `output: export` static deploy |
| Commit `cdd2c74` | Fumadocs migration — Next 16, App Router, content split into `/docs` + `/wiki`, Tailwind 4, Orama search |

## Current state (Fumadocs)

```
docs/
  app/                 # App Router
    docs/[[...slug]]/
    wiki/[[...slug]]/
    api/search/route.ts  # Orama
    layout.tsx, page.tsx, globals.css
  components/          # Mermaid.tsx, mdx.tsx
  content/
    docs/              # 29 MDX pages + meta.json files
    wiki -> ../../workspace/wiki/pages  (symlink)
  lib/source.ts, layout.shared.tsx
  next.config.mjs, source.config.ts, postcss.config.mjs
  package.json         # fumadocs-core, fumadocs-mdx, fumadocs-ui, tailwindcss@4, next@16, react@19
```

## Target state (Nextra)

```
docs/
  pages/               # Pages Router (Nextra 3 requirement)
    _app.tsx           # imports "nextra-theme-docs/style.css"
    _meta.js
    index.mdx
    getting-started/   _meta.js + 4 mdx
    guide/             _meta.js + 11 mdx
    cli/               _meta.js + 1 mdx
    architecture/      _meta.js + 3 mdx
    slack/             _meta.js + 8 mdx
    wiki/              symlink → ../../workspace/wiki/pages
  theme.config.tsx     # logo, project link, docsRepositoryBase, footer.content, head
  next.config.mjs      # withNextra + experimental.{externalDir,esmExternals:'loose'}
  package.json         # nextra@^3.3, nextra-theme-docs@^3.3, next@^14.2, react@^18.3
  tsconfig.json
```
Root `package.json` gains:
```json
"pnpm": { "overrides": { "d3-shape": "^3.2.0" } }
```

Remove: `app/`, `components/` (Mermaid handled via remark plugin), `content/`, `lib/`, `source.config.ts`, `postcss.config.mjs`, `globals.css`.

## Architecture decisions

### D1. Nextra version
- **Choose Nextra 3.3.x** — preserves the Nextra sidebar/theme user prefers; still Pages Router; modern dep tree (native Next 14, zod ≥ 3.24, mermaid 11).
- **Nextra 2.13.x rejected** after empirical build failure: Nextra 2's `zod@^3.22.3` requires `.deepPartial()` (removed in zod 3.25+), and the monorepo transitively pulls zod 4 via `@anthropic-ai/sdk` / `openai` / `@modelcontextprotocol/sdk`. With `esmExternals:'loose'` (required to bundle Nextra 2's `@theguild/remark-mermaid@0.0.5` + mermaid 11 + d3-shape ESM), webpack leaks zod 4 into nextra's chunk, breaking `.deepPartial()` at prerender. pnpm overrides fail to contain this.
- **Nextra 4 (App Router) rejected** — user preference is "previous Nextra style," i.e. Pages Router.

### D2. Next.js version
- **Next 14.2.x + React 18.3.x** — Nextra 3 peers `next >= 13`; Next 14.2 is the safest target that avoids unrelated Next 15/16 migration churn.
- `next@16` and `react@19` are removed from `docs/package.json`.

### D3. Tailwind
- **Drop Tailwind CSS 4** — Nextra 2 ships its own theme. No custom Tailwind needed unless we add a custom page (out of scope).

### D4. Search
- **Drop Orama** — Nextra 2 ships Flexsearch-based search built into the theme. Free, works with `output: export`.

### D5. Mermaid
- **Nextra 3's bundled `@theguild/remark-mermaid`** — transforms ```` ```mermaid ```` fences at build time. Works with static export. No runtime `<Mermaid>` component.
- pnpm override `d3-shape ^3.2.0` required so the hoisted d3-shape exports `curveBumpX/Y` that mermaid needs.

### D6. Wiki content
- **Symlink preserved**: `docs/pages/wiki -> ../../workspace/wiki/pages`.
- Wiki pages render under `/wiki/*` via Nextra's filesystem routing; no dynamic route file needed.
- `docs/pages/wiki/_meta.json` lists ordering; auto-generated if absent.

### D7. Deployment
- **Static export to GitHub Pages** (matches `85c9aba`): `output: "export"`, `basePath: "/open-harness"`.
- Keep `.github/workflows/docs.yml` trigger (runs on `docs/**` and `workspace/wiki/**`).
- Dev server on port 3001 remains (`next dev -p 3001`); referenced by `workspace/startup.sh` and the `docs.ruska.dev` tunnel.

## Content migration mapping

All 29 MDX pages under `docs/content/docs/**` move back under `docs/pages/**` with:
- **Import hoists removed** — Fumadocs injects `<Mermaid>` via provider; Nextra uses remark, so the `import Mermaid from '@/components/Mermaid'` lines get stripped.
- **`<Mermaid chart={...} />` → ```` ```mermaid ```` fences** (inverse of what `cdd2c74` did for the Fuma migration — restoring Nextra's native form).
- **Internal links** revert to `/open-harness/...` prefix (matching `basePath`).
- **`meta.json` → `_meta.js`** (Nextra 3 dropped `_meta.json` — must be `_meta.{js,jsx,ts,tsx}` with a `default export`).
- **Meta format rewrite** — Fumadocs' `{ title, pages: [...] }` shape becomes Nextra's flat `{ slug: "Label", ... }` shape.

## Out of scope

- No new docs content written in this migration — framework swap only.
- No changes to `workspace/wiki/` content.
- No change to tunnel config, GH Pages domain, or CI trigger paths.
- No Nextra 4 / App Router.
- No custom Nextra theme overrides beyond the `theme.config.tsx` in `85c9aba`.

## Validation

- [ ] `pnpm --filter @openharness/docs install` succeeds
- [ ] `pnpm --filter @openharness/docs build` succeeds with 29+ static HTML pages exported
- [ ] `pnpm --filter @openharness/docs dev` serves on :3001
- [ ] Sidebar shows: Introduction · Getting Started · Guide · CLI Reference · Architecture · Slack · Wiki
- [ ] Flexsearch search returns results
- [ ] Mermaid diagrams render (spot-check `guide/heartbeats.mdx`)
- [ ] Wiki page renders (spot-check `/open-harness/wiki`)
- [ ] `.github/workflows/docs.yml` builds green on PR
- [ ] Published site at `https://ryaneggz.github.io/open-harness/` functions

## Risks

| Risk | Mitigation |
|------|------------|
| Nextra 2 is in maintenance mode | Acceptable — baseline `85c9aba` used it stably; we can revisit Nextra 4 later |
| Next 14 downgrade breaks pnpm-lock resolution | Regenerate lockfile in the migration branch; CI catches mismatches |
| Wiki symlink path changes (old: `docs/content/wiki`, new: `docs/pages/wiki`) | Update symlink target in same commit; verify `ls -la docs/pages/wiki` resolves |
| Remark Mermaid plugin behaves differently than Fuma's | Reuse plugin code from `34bf212`; manual spot-check |
| Tunnel/startup.sh assumes port 3001 | Unchanged — both stacks already use :3001 |
