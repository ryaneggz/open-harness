# Probe fault injection — US-002 (#943)

Every probe named by US-002 was run on the branch tree, and every probe whose
pin changed was fault-injected: the guarded string was reverted in the file the
probe guards, the probe was run and expected non-zero, the file was restored
byte-for-byte, and the probe was run again. `git diff --stat` after each cycle
showed only the intended edits.

## Intent decisions

| Probe | Intent | Decision |
|---|---|---|
| `get-agro-bootstrap.sh` | canonical product documented | pin `https://github.com/mifunedev/agro/releases/latest/download/agro.js` as the `get-agro.sh` default |
| `sync-skill-contract.sh` | canonical product documented | pin `/audit pr <N> --repo mifunedev/agro` in `sync/references/publish.md` |
| `docs-build-fast-path.sh` | canonical product documented | README and `docs/README.md` must point at `https://github.com/mifunedev/agro-web`; failure messages name `agro-web` |
| `agents-identity-contract.sh` | canonical product documented | `AGENTS.md` must name `mifunedev/agro-web` as the public documentation surface |
| `get-oh-bootstrap.sh` | compatibility guarded | unchanged: `get-oh.sh` must keep `oh.mifune.dev/oh.js` as its default bundle URL (retained SLA endpoint) |
| `oh-shipped-repo-overridable.sh` | compatibility guarded | unchanged: `install.sh` must keep the `${OH_GITHUB_REPO:-…}` override; the legacy literal is a forbidden hard-code, not a required one |
| `oh-sandbox-image-mode.sh` | compatibility guarded | unchanged: the default image reference `ghcr.io/mifunedev/openharness:latest` is unchanged in Phase 3 (dual-published digest) |
| `docs-20260901-followup-artifact-cited.sh` | neither | unchanged: its only legacy mention is the retro-lesson source comment; it pins no repository name |

## Injection record

| Probe | Injected change (then restored) | Pass exit | Red exit | Restored exit |
|---|---|---|---|---|
| `get-agro-bootstrap.sh` | `.agro/scripts/get-agro.sh`: `AGRO_GITHUB_REPO` default reverted to `mifunedev/openharness` | 0 | 1 (`REGRESSION get-agro.sh lost the default release-asset agro.js URL`) | 0 |
| `sync-skill-contract.sh` | `.agro/skills/sync/references/publish.md` line 195: `--repo mifunedev/agro` reverted to the legacy name | 0 | 1 (`references/publish.md: focused /audit pr invocation lacks PR number/repo`) | 0 |
| `docs-build-fast-path.sh` | `docs/README.md`: `mifunedev/agro-web` reverted to the legacy web name | 0 | 1 (`README.md must point to mifunedev/agro-web`) | 0 |
| `agents-identity-contract.sh` | `AGENTS.md` line 141: `mifunedev/agro-web` reverted to the legacy web name | 0 | 1 (`AGENTS identity contract broken: public documentation surface`) | 0 |

Unchanged probes, run once on the branch tree: `get-oh-bootstrap.sh` 0,
`oh-shipped-repo-overridable.sh` 0, `oh-sandbox-image-mode.sh` 0,
`docs-20260901-followup-artifact-cited.sh` 0.

Post-restore check: `git diff --stat -- .agro/scripts/get-agro.sh
.agro/skills/sync/references/publish.md docs/README.md AGENTS.md` reported the
same four files with the same line counts as before injection (4, 12, 6, 2), and
`get-agro.sh` kept its executable bit.

## US-006 — agro.mifune.dev cutover

`agro.mifune.dev` now serves the installers directly, so `get-oh.sh`'s internal
default artifact URL (`OH_JS_URL`) moved off the legacy host; `get-oh.sh`'s
documented legacy ENTRY POINT (`oh.mifune.dev/get-oh.sh`) stays pinned, since that
host is still promised and returns to service once the Cloudflare rules apply.

| Probe | Intent | Decision |
|---|---|---|
| `get-oh-bootstrap.sh` | default artifact host updated | pin `agro.mifune.dev/oh.js` as the `get-oh.sh` default prebuilt `OH_JS_URL`; the legacy `oh.mifune.dev/get-oh.sh` entry point remains pinned elsewhere in the same probe |

### Injection record

| Probe | Injected change (then restored) | Pass exit | Red exit | Restored exit |
|---|---|---|---|---|
| `get-oh-bootstrap.sh` | `.agro/scripts/get-oh.sh` lines 60 and 88: `OH_JS_URL` default (doc line and assignment) reverted to `https://oh.mifune.dev/oh.js` | 0 | 1 (`REGRESSION get-oh.sh lost the default prebuilt URL`) | 0 |

Post-restore check: `diff` against a pre-injection copy of `get-oh.sh` showed the
file byte-identical, and `git diff --stat -- .agro/scripts/get-oh.sh` reported
only the intended two-line change from the cutover edit itself.
