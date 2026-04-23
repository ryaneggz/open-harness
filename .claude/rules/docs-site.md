# Docs Site (Nextra)

## Source of Truth

The docs site lives at `docs/` as an `@openharness/docs` pnpm workspace.
Pages are MDX under `docs/pages/**` (Nextra 3.3 Pages Router). Builds
produce a static export at `docs/out/`, deployed to GitHub Pages by
`.github/workflows/docs.yml` on pushes to `main`.

## basePath — the thing that breaks local preview

`docs/next.config.mjs` sets `basePath: "/open-harness"` for the GitHub
Pages URL shape (`https://ryaneggz.github.io/open-harness/...`). Every
HTML page emitted to `docs/out/` contains absolute asset URLs starting
with `/open-harness/`.

Serving `docs/out/` at the root of a static server produces unstyled
HTML — CSS and JS 404 because the browser requests
`/open-harness/_next/static/...` and the server has those files at
`/_next/static/...`.

## Local Preview

Use the root script:

```bash
pnpm docs:preview
```

Equivalent manually:

```bash
pnpm docs:build                            # produces docs/out/
ln -sfn . docs/out/open-harness            # serves docs/out under the basePath
cd docs/out && python3 -m http.server 4000
```

Then visit `http://localhost:4000/open-harness/` (not `/`).

The symlink is a self-reference (`open-harness → .`). Python's
`http.server` resolves `/open-harness/<path>` → `docs/out/<path>` in a
single hop — no infinite loop.

`docs/out/` is gitignored (`docs/.gitignore`), so the symlink never
enters git history.

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
- Don't remove `basePath` to make local preview easier — the GitHub
  Pages deploy depends on it.
- Don't publish docs via CI-on-PR — deploy only fires on `main` pushes.
