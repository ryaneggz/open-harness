# Docs Site (Nextra)

## Source of Truth

The docs site lives at `docs/` as an `@openharness/docs` pnpm workspace.
Pages are MDX under `docs/pages/**` (Nextra 3.3 Pages Router). Builds
produce a static export at `docs/out/`, deployed to GitHub Pages by
`.github/workflows/docs.yml` on pushes to `main`.

## basePath

`docs/next.config.mjs` sets `basePath: ""` because the docs site is
served at the apex of a custom domain (`https://oh.mifune.dev/...`)
via the GitHub Pages `CNAME` file at `docs/public/CNAME`. Every HTML
page emitted to `docs/out/` references assets at the root
(`/_next/static/...`), which is what both the deployed apex and a
local static server expect.

If basePath is ever re-introduced (e.g. `"/open-harness"`), assets
will 404 in production because the apex `oh.mifune.dev/<path>` will
not be prefixed. Keep it empty unless the deploy target moves back
to a subpath URL.

## Local Preview

Use the root script:

```bash
pnpm docs:preview
```

Equivalent manually:

```bash
pnpm docs:build                            # produces docs/out/
cd docs/out && python3 -m http.server 4000
```

Then visit `http://localhost:4000/`.

`docs/out/` is gitignored (`docs/.gitignore`).

## Dev mode (`pnpm docs:dev`) — currently broken

On Nextra 3.3 + Next 14.2 + Mermaid 11 + d3 v7, dev mode fails with
`Module not found: ESM packages (d3-array) need to be imported`
despite the `transpilePackages` entry in `next.config.mjs`. All pages
500. The production static build is unaffected.

Workaround for iterative docs work: edit MDX → `pnpm docs:build` →
reload browser. Python's `http.server` picks up the new files on the
next request with no restart.

Fixing dev mode is out of scope of typical doc edits — upstream Nextra
/ Next alignment issue.

## Paths and conventions

- Pages: `docs/pages/<section>/<name>.mdx`
- Sidebar order: `docs/pages/<section>/_meta.js`
- Wiki symlink: `docs/pages/wiki → ../../workspace/wiki/pages`
- Landing: `docs/pages/index.mdx`
- Build output (gitignored): `docs/out/`, `docs/.next/`

When adding a page, update the nearest `_meta.js` so it appears in the
sidebar in the intended position.

## Don'ts

- Don't commit `docs/out/` or `docs/.next/` — both gitignored; CI rebuilds.
- Don't add a non-empty `basePath` back — the deploy is at the apex
  `oh.mifune.dev`, so any prefix breaks every asset URL in production.
- Don't delete `docs/public/CNAME` — GitHub Pages reads it on every
  build to keep the custom domain bound.
- Don't publish docs via CI-on-PR — deploy only fires on `main` pushes.
