# Evidence — agro-identity-cutover (#943)

Status: PROVISIONAL. Written at commit `143cd6b8` while the build is at
`RUNNING operator-gate`. US-006 waits on the operator performing
`docs/agro-cutover-runbook.md`; this file is rewritten after the cutover with the
audit run id, the cutover record, the live endpoint matrix, and the final eval.

## 0. Why this is better than not doing it

Before: the next release push to `main` would be the first carrying the `.oh/` →
`.agro/` rename, and the docs site built `oh.js` from `.oh/cli` and mirrored
`get-oh.sh` from `.oh/scripts` on `main`. That release would break the site build,
the installer mirror, and every `oh.mifune.dev` installer URL. The core repository
also sent no release dispatch, so the mirror only refreshed on a daily schedule.

After: the docs pipeline reads `.agro/` first with a `.oh/` fallback, verified by
building against both `development` (post-rename, 84678fd7) and `main`
(pre-rename, 823aabbd) with exit 0 and four `#!` artifacts each. A release now
sends `agro-release` to the docs site. Every current-facing name in the core
repository points at `mifunedev/agro` and `agro.mifune.dev`, with the compatibility
surfaces classified endpoint by endpoint.

Cost: 6 core commits (+~1,000/−~600 lines across 90 files, most of them
mechanical rename lines), 2 web PRs, 5 worker dispatches, one new knowledge page.
Measured benefit: the pipeline-break risk is removed (observed: both-ref builds
green). The identity change itself is claimed, unmeasured, until the cutover.

## 1. What the plan asked for

Phase 3 of the compatibility migration: AGRO becomes the canonical external
identity. Rename both repositories in place, adopt the `.agro/` source contract in
the docs pipeline before any rename, make `agro.mifune.dev` canonical, use AGRO
names in release metadata and dispatch, and keep every `oh.mifune.dev` entry URL
shell-safe. Retire nothing; external actions stay with the operator.

## 2. What was built

| Story | Commit / PR | Observed |
|---|---|---|
| US-001 web pipeline accepts `.agro/` | openharness-web#46 (05e81c7) | `OH_SCRIPTS_REF=development pnpm run build` exit 0; `OH_SCRIPTS_REF=main` exit 0; `agro.js`/`oh.js` byte-identical; `check:docs-drift` PASS; CI green, MERGEABLE |
| US-002 core names AGRO | 03c3d69b | `pnpm test` 1246 passed; both typechecks 0; `link-providers.sh --check` 0; 8 probes 0; fault injection recorded in `probe-fault-injection.md`; `reference-classification.md` 115 files / 781 hits / 0 unclassified |
| US-003 release infra | 4d80868b | `release-latest` + `release-reservation` tests 39 passed; YAML safe_load ok; 3 rename pairs at identical indentation; `notify-docs` job env-only secret with `::notice::` skip |
| US-004 docs-site identity | openharness-web#47 draft (73a06e7), stacked on #46 | `pnpm run build` 0; drift PASS; `build/CNAME` = `agro.mifune.dev`; sitemap 66 agro / 0 oh; canonical + `og:url` on 66 pages |
| US-005 runbook | 4db24429 | `ste-check.sh` 0; linked from `agro-compatibility.md:263` and `docs/README.md:42`; `curl-bash-safe-alternatives` 0 |
| US-006 operator cutover | — | BLOCKED on operator |
| US-007 knowledge, changelog | 143cd6b8 (knowledge portion) | `knowledge-impact.sh --verified` 0 NEEDS-REVIEW; `wiki-readme-index` 0; `knowledge-source-freshness` 0; `changelog-entry-length` 0 |

Early eval floor at 4db24429: `run.sh` exit 0; one pre-existing red
(`skills-vendored`, `cc-safety-net` binary absent in this sandbox, delta unchanged).

### Actual Knowledge Impact (provisional, at 143cd6b8)

| Page | State |
|---|---|
| release-versioning | UPDATED (notify-docs, agro-first default, smoke name, user agent; dispatch omission repaired) |
| fresh-machine-setup | UPDATED (installer defaults and entry points; rename pending note) |
| oh-cli-portable-lifecycle | UPDATED (package metadata; remote/self-upgrade/image defaults named as compatibility until US-006) |
| compose-env-boundary | REVERIFIED (only the image source label moved) |
| managed-agents | REVERIFIED (link text only in two docs) |
| plan-vs-built-reconciliation | REVERIFIED (`--repo` default text only) |
| agro-web-pipeline | NEW (`kind: repo`; web paths cited by repository and commit in prose because the schema pin form resolves only in this repository) |
| all `kind: pattern` pages | NOT-AFFECTED (immutable provenance) |

The three UPDATED pages are reverified again after US-006 flips the web default
source and the CLI defaults.

## 3. Where they diverged, and why

- US-004 asked for regenerated banner assets. The only banner recipe belongs to a
  historical promo whose rendering must stay unchanged, and no current-default
  recipe exists, so no asset was regenerated. The renderer's literals now read AGRO.
- US-003 `IMAGE_REPOSITORIES`: the worker first satisfied the order with a
  workflow env override; rejected in favor of flipping the script default
  (`promote-release-latest.sh:89`) so one source of truth remains.
- The PRD said the dispatch token needs `actions: write`; `repository_dispatch`
  requires `contents: write`. The docs state the real requirement.
- CLI defaults that name `oh.mifune.dev/agro.js` or the legacy image
  (`self-upgrade.ts`, `docs.ts`, `remote.ts`, `lifecycle.ts`/`cli.ts`,
  `.devcontainer/*.service`, `docs/lifecycle-commands.md:108`) are classified
  compatibility and deferred to US-006: they cannot flip before the domain serves.
- US-007's knowledge portion ran ahead of US-006 (advisor decision) because the
  pages describe repository state at HEAD; a REVERIFY pass follows the cutover.

## 4. What remains unverified

- US-006 entirely: repository renames, Pages domain, Cloudflare rules, dispatch
  secret, live `curl` of the ten endpoint pairs, release smoke, dispatched
  `pages.yml` run. Blocked on the operator.
- The current `/install.sh` redirect mechanism (Worker or rule) is a placeholder
  in the runbook; the operator identifies it.
- The Cloudflare rulesets payload in the runbook was written from the API shape,
  not exercised against the live zone.
- `pnpm test` showed three transient failures on one run at 03c3d69b that did not
  reproduce on a clean rerun; the file names were not captured.
- `/audit implementation`, the simplicity review, and `/audit pr` have not run;
  they run once on the final head after US-006.
- Pre-existing red `skills-vendored` (environment) carried forward.
