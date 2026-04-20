# PRD: Revert docs/ from Fumadocs back to Nextra

## Owner

kre8mymedia@gmail.com

## Problem

The docs site (`docs/`) was migrated from Nextra 2 to Fumadocs in commit `cdd2c74` (2026-04-17). Since then we've spent multiple fix commits patching layout issues:

- `ddf4479` — sidebar clipping, duplicate h1s, content width
- `34bf212` — Mermaid transform moved to remark plugin
- `bdfd477` — Mermaid component wired into MDX provider

Primary user (sole docs consumer) prefers the Nextra 2 reading experience that shipped in PR #31. Fumadocs is doing work we do not need (content sources, two-route split, Orama search, Tailwind 4 build chain) and requires hand-tuning that Nextra's opinionated theme avoided out of the box.

## User value

- **Reader:** familiar, opinionated sidebar + content layout; built-in search; no layout regressions.
- **Maintainer:** fewer moving parts (no Tailwind, no search API route, no `content/docs` split); smaller surface area to debug.

## Goals

1. Ship `docs/` back on Nextra 2 with identical URL structure to current Fumadocs site.
2. Preserve all 29 MDX pages, wiki symlink, and Mermaid rendering.
3. Keep deployment path intact: GitHub Pages via `.github/workflows/docs.yml`; dev on :3001 via `workspace/startup.sh`.

## Non-goals

- Writing new docs content.
- Nextra 4 / App Router (explicitly rejected — "previous Nextra style" means Nextra 2).
- Changing the docs URL or GH Pages deploy target.
- Migrating `workspace/wiki/` content itself.

## Success metrics

| Metric | Target |
|--------|--------|
| Pages in exported build | ≥ 29 (matches current Fuma page count) |
| CI `docs.yml` status | green on PR + merge |
| Local `pnpm build` time | ≤ Fumadocs build time (information) |
| Layout fix commits post-merge | 0 within 14 days |

## Acceptance criteria

- [ ] `docs/` uses `nextra@^3.3` and `nextra-theme-docs@^3.3` (bumped from 2.13 baseline due to zod/mermaid dep incompatibility — see spec decision D1)
- [ ] `docs/pages/` restored as Pages Router content root
- [ ] `docs/pages/wiki` symlink resolves to `workspace/wiki/pages`
- [ ] `docs/pages/_app.tsx` imports `nextra-theme-docs/style.css` (satisfies Next.js global-CSS guard on symlinked external content)
- [ ] All 28 MDX pages from `docs/content/docs/**` migrated under `docs/pages/**` with Fumadocs-only imports removed
- [ ] Fumadocs dependencies (`fumadocs-core`, `fumadocs-mdx`, `fumadocs-ui`, `tailwindcss`, `@tailwindcss/postcss`, Orama) removed from `docs/package.json`
- [ ] `docs/app/`, `docs/content/`, `docs/lib/`, `docs/components/`, `docs/source.config.ts`, `docs/postcss.config.mjs` deleted
- [ ] `docs/next.config.mjs` returns to `withNextra({ output: "export", basePath: "/open-harness", experimental: { externalDir, esmExternals:'loose' } })`
- [ ] `theme.config.tsx` uses Nextra 3 shape (`footer.content`, `head`, no `useNextSeoProps`)
- [ ] `docs/tsconfig.json` reverted to Pages-Router shape
- [ ] `_meta.json` files converted to `_meta.js` with Nextra-shape (flat `slug → label` map)
- [ ] Root `package.json` has `pnpm.overrides.d3-shape: "^3.2.0"` (mermaid dep pinning)
- [ ] `pnpm-lock.yaml` regenerated; `pnpm install` clean
- [ ] `pnpm --filter @openharness/docs build` exits 0; exported HTML under `docs/out/`
- [ ] `.github/workflows/docs.yml` runs green (no workflow changes required)
- [ ] Visual QA: landing page, one page per section (Getting Started, Guide, CLI, Architecture, Slack, Wiki), one Mermaid-containing page

## Rollout plan

Single PR, no feature flag (docs site is internal tooling; cut-over is instantaneous on merge).

1. Branch from `development`
2. Implement migration in one PR
3. CI publishes updated GH Pages on merge
4. Verify `https://ryaneggz.github.io/open-harness/` loads the Nextra theme

## Open questions

None — framework and content mapping are fully determined from PR #31 (`85c9aba`) as the reference baseline.

## Links

- Spec: `.claude/specs/nextra-docs-migration-spec.md`
- Baseline PR: [#31](https://github.com/ryaneggz/open-harness/pull/31)
- Original plan PR: [#28](https://github.com/ryaneggz/open-harness/pull/28)
- Fumadocs migration commit: `cdd2c74`
