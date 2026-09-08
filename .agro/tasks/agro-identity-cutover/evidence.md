# Evidence — agro-identity-cutover (#943)

Written at commit `a18e421a`, after the GitHub-side cutover. Correlates to the
eval run recorded in `eval-result.json` and the simplicity review in
`simplicity-review.json`, both keyed to that commit.

**Terminal state: `DRAFT-BLOCKED(operator-cutover)`.** Six of seven stories are
complete. US-006 holds the PR because three runbook steps need credentials the
sandbox does not hold: the GitHub Pages custom domain, the Cloudflare redirect
rules, and the dispatch token.

## 0. Why this is better than not doing it

**Before.** The next release push to `main` would have been the first carrying the
`.oh/` → `.agro/` rename. The docs site built `oh.js` from `.oh/cli` and mirrored
`get-oh.sh` from `.oh/scripts` at that ref, so that release would have broken the
site build, the installer mirror, and every `oh.mifune.dev` installer URL at once.
The core repository also sent no release dispatch, so the mirror refreshed only on
a daily schedule, leaving up to 24 hours where a published release and the
installers people actually download disagreed.

**After.** The pipeline reads `.agro/` first and falls back to `.oh/`, proven by
building against both layouts. Both repositories are renamed, and all five
executable paths on the legacy host still return a script body:

```
oh.mifune.dev/install.sh    200 body=#!
oh.mifune.dev/get-oh.sh     200 body=#!
oh.mifune.dev/oh.js         200 body=#!
oh.mifune.dev/get-agro.sh   200 body=#!
oh.mifune.dev/agro.js       200 body=#!
```

Two of those (`/get-agro.sh`, `/agro.js`) were `404` before this work; they are
mirrored now. A clean `node:22-slim` container installs both CLIs from the legacy
host with no manual step.

**Cost.** 8 commits on the core branch, `netAdded` 2105 lines across ~100 files,
two docs-site PRs, 8 bounded worker dispatches with 4 repair rounds. Most of the
line count is mechanical name substitution, which is the point of the phase.

**Measured:** the pipeline-break risk is gone (both-ref builds exit 0); the mirror
gap shrinks from a day to a dispatch. **Claimed, unmeasured:** that the AGRO name
reads more clearly to a new user.

## 1. What the plan asked for

Phase 3 of the compatibility migration: AGRO becomes the canonical external
identity. Rename both repositories in place, teach the docs pipeline the `.agro/`
source contract *before* any rename, make `agro.mifune.dev` canonical, put AGRO
names in release metadata and add a release dispatch, and keep every
`oh.mifune.dev` entry URL shell-safe. Retire nothing. External actions stay with
the operator.

## 2. What was built

| Story | Artifact | Observed |
|---|---|---|
| US-001 web pipeline accepts `.agro/` | agro-web#46, merged `4f26a55` | build exit 0 against `development` (`.agro/` path) and `main` (`.oh/` fallback); `agro.js`/`oh.js` byte-identical; drift PASS |
| US-002 core names AGRO | `03c3d69b` | `pnpm test` 1246 passed; both typechecks 0; `link-providers.sh --check` 0; 8 probes 0; `reference-classification.md` covers every remaining old-name hit |
| US-003 release infra | `4d80868b` | 39 release tests pass; YAML validates; whitespace pair scan clean; `notify-docs` passes the secret only through `env:` and skips with `::notice::` |
| US-004 docs-site identity | agro-web#47 (draft, mergeable) `4c5958f` | build exit 0; drift PASS; `build/CNAME` = `agro.mifune.dev`; sitemap 66 agro / 0 legacy; canonical and `og:url` on all 66 routed pages |
| US-005 runbook | `4db24429` | `ste-check.sh` 0; linked from the compatibility doc and the docs index; `curl-bash-safe-alternatives` 0 |
| US-006 operator cutover | `cutover-record.md`, `0b58c0a7` | GitHub-side steps done (below); Pages domain, Cloudflare, and token outstanding |
| US-007 knowledge and changelog | `143cd6b8`, `b63cf41e`, `a18e421a` | `knowledge-impact.sh --verified` 0 needing review; wiki probes 0; `changelog-entry-length` 0 |

### Cutover performed (US-006 partial)

Under the operator's explicit in-session authorization ("Authorize me for the gh
steps"), recorded in `progress.txt` before the first action:

| Step | Result |
|---|---|
| 1 record before-state | matched the runbook's expected values exactly |
| merge agro-web#46 | `4f26a55`; `pages.yml` on `main` completed success |
| 2 rename core | `R_kgDORyBFdg` → `mifunedev/agro`, id unchanged |
| 3 rename web | `R_kgDOTHLFeQ` → `mifunedev/agro-web`, id unchanged |
| 4 metadata | both `homepageUrl` = `https://agro.mifune.dev`; topics added, existing kept |
| 7b `AGRO_WEB_REPO` | set to `mifunedev/agro-web` |
| 8 origin remotes | root and web clone updated; the guard left forks alone |
| — retarget #47 | base `main`, MERGEABLE |

Old URLs still resolve: `git ls-remote` works on both old names and
`gh repo view mifunedev/openharness` returns `mifunedev/agro`. The GHCR package
`mifunedev/agro` is public. A `workflow_dispatch` of `pages.yml` stands in for the
release dispatch and completed success (run 34184320927); it is labelled a stand-in
because no release was due.

### Actual Knowledge Impact

| Page | State |
|---|---|
| release-versioning | UPDATED — the chain now ends `notify-docs`; the omission that a release did not refresh the mirror is repaired |
| fresh-machine-setup | UPDATED — installer defaults and both entry points |
| oh-cli-portable-lifecycle | UPDATED — package metadata, then re-pinned after the CLI default flip |
| compose-env-boundary | REVERIFIED — only the image source label moved |
| managed-agents | REVERIFIED — link text only |
| plan-vs-built-reconciliation | REVERIFIED — `--repo` default text only |
| agro-web-pipeline | NEW `kind: repo` — the docs-site source contract |
| pattern-evals-tracked-only-scan-misses-uncommitted | UPDATED — gained this run's occurrence |
| pattern-wiki-frontmatter-edit-without-reindex | NEW `kind: pattern` |
| every other `kind: pattern` page | NOT-AFFECTED — provenance is immutable |

## 3. Where they diverged, and why

- **US-004 banner assets.** The criterion asked for regenerated banner assets. The
  only recipe belongs to a historical promo that must not change, and no
  current-default recipe exists, so no asset was regenerated. The renderer's
  product literals do read AGRO.
- **US-003 image order.** The worker first satisfied the agro-first order with a
  workflow `env` override. Rejected: the script default at
  `promote-release-latest.sh:89` was flipped instead, so one source of truth
  remains.
- **Token scope.** The PRD specified `actions: write`. `repository_dispatch`
  requires `contents: write`; the docs state the real requirement.
- **US-006 sequencing.** The runbook's Pages step (5) and Cloudflare step (6) must
  run back to back: switching the Pages custom domain away from `oh.mifune.dev`
  makes Pages stop answering for that host, and only the Cloudflare rules restore
  the executable paths. Step 6 needs zone credentials that are not in the sandbox,
  so step 5 was deliberately **not** performed. Performing it alone would have
  broken the very endpoints this phase promises to keep.
- **US-007 ordering.** The knowledge work ran before US-006 rather than after,
  because the pages describe repository state at HEAD. `oh-cli-portable-lifecycle`
  was re-pinned after the default flip.
- **Advisor exception.** The plan assigned the external actions to the operator.
  The operator authorized the GitHub-side subset in session; that authorization and
  its scope are recorded in `progress.txt` before the first action.

## 4. What remains unverified

- **Three runbook steps are outstanding**, and US-006 cannot pass without them:
  step 5 (Pages custom domain), step 6 (Cloudflare redirect rules), step 7a (issue
  and store `AGRO_WEB_DISPATCH_TOKEN`). Until step 5, `agro.mifune.dev` returns
  `421` and the README's `agro.mifune.dev/get-agro.sh` one-liner does not resolve.
- **agro-web#47 is not merged**, by design: merging it before the Pages domain is
  active would ship a `CNAME` that disagrees with the live setting.
- **The real release dispatch has never fired.** `notify-docs` is exercised only by
  tests and by the `workflow_dispatch` stand-in; the first real release after the
  token is stored is its first live run.
- **The Cloudflare rulesets payload in the runbook was written from the API shape,
  not exercised against the live zone.** The existing `/install.sh` redirect
  mechanism (Worker or older rule) is still a placeholder the operator identifies.
  `/install.sh` currently redirects to the raw `.oh/scripts/install.sh` path on the
  old repository name and works only because GitHub redirects renamed repositories.
- **SIMPLICITY-RESIDUAL.** Six non-blocking findings at `a18e421a`, recorded in
  `simplicity-review.json`, none actioned. The owner's judgment on each:
  findings 3 and 4 (drop the Cloudflare dashboard table; drop the
  `vars.AGRO_WEB_REPO` indirection) are declined because the dashboard table and
  the API payload are two execution paths for an operator who may have only one,
  and the repository variable is written into an approved acceptance criterion and
  is already set in production. Findings 1, 2 and 6 are duplication that approved
  acceptance criteria require in both places. Finding 5 is the strongest: the
  release test does pin YAML prose, but the two assertions that matter guard
  against printing a secret, so they stay. A reviewer may disagree with any of
  these; none blocks.
- **Pre-existing red carried forward:** `skills-vendored`, delta unchanged, caused
  by the `cc-safety-net` binary being absent in this sandbox rather than by the
  diff. Eval runner exit 0.
- **One transient failure was not diagnosed.** A `pnpm test` run at `03c3d69b`
  reported three failures that did not reproduce on a clean rerun; the failing file
  names were not captured.
- **`/audit implementation` will fail gate 1 by design** while US-006 is open, since
  the gate reads unfinished stories from `prd.json`. The remaining gates were run
  individually and are recorded above.
- **A worker used a bare `git stash`** against its dispatch record. The tree was
  verified intact afterwards, but `stash@{0}` (`279b74a2`) is redundant and still
  present; the safety net blocks dropping it from this session.
