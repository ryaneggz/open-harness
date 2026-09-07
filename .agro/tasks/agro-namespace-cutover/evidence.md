# Evidence — AGRO namespace and persisted state become canonical (#942, Phase 2)

Branch `feat/942-agro-namespace-cutover`, PR #996, base `development`.
Planning base commit `9d2fb00957fdfb9bd918660a6c01474504ad6c7d`.

## What a reviewer should check first

1. The rename is mechanical and complete: `git diff --find-renames 9d2fb009..HEAD --stat`.
2. Fresh state resolves to AGRO in both implementations, and legacy state does not move:
   `.agro/cli/src/lib/__tests__/fixtures/compat-vectors.json` drives `compat.test.ts` and
   `compat-shell.test.ts` from one table.
3. A real legacy workspace volume survives the new image: `sandbox-upgrade-smoke.log` in this folder.
4. `agro migrate` plans before it mutates, is idempotent, and refuses divergence:
   `migrate-command.test.ts`, `migrate-rehearsal.test.ts`.

## Commits

| Commit | Story | What it does |
|---|---|---|
| `2a438810` | — | Scaffold the task folder (prd.md, prd.json, progress.txt) |
| `c2aae7c9` | US-001 | `.oh` → `.agro`, `oh.json` → `agro.json`, every current reference updated |
| `c0504546` | US-003 | `agro migrate` over the Phase 0 engine, plus the provider relink step |
| `2d22bb07` | US-002 | Fresh state resolves to AGRO; `AGRO_*` compose keys with `OH_*` fallback |
| `363ea005` | US-004 | Image seeds `/opt/agro-seed`; entrypoint, healthcheck, and cron unit resolve at run time |
| `a6ce74b3` | US-005 | Old-volume/new-image upgrade smoke and the migration rehearsal test |
| `6d2891f1` | US-001, US-002 | Repair a YAML block scalar the rename re-indented; give the default sandbox name an owner |

## Real Docker evidence (US-005)

`.agro/scripts/sandbox-upgrade-smoke.sh`, run locally from this worktree at `a6ce74b3`.
Full log: `sandbox-upgrade-smoke.log` (318 lines) beside this file.

| Assertion | Result |
|---|---|
| `~/.config/gh/hosts.yml` sha256 before and after | identical |
| `~/harness/UPGRADE-CANARY.txt` sha256 before and after | identical |
| `~/harness/.oh/` still owns the workspace | present |
| `~/harness/.agro/` created by the new image | absent |
| `~/harness/.oh/.image-seeded` | unchanged |
| `~/harness/.oh/scripts` content hash | unchanged |
| `openharness-bootstrap.service`, `openharness-cron.service` | both active |
| container health | healthy |
| entrypoint conflict or re-seed warning in the boot log | none |

Legacy image `ghcr.io/mifunedev/openharness:0.9.0`; new image built from this checkout's
`.devcontainer/Dockerfile`; one compose project and one named volume across both boots.

## Gates

<!-- filled at the end of the build -->

## Unverified or deferred

- The seed destination rename and the entrypoint run-time resolution are proven by the local
  upgrade smoke and by `entrypoint-seed.test.ts`; the CI job `sandbox-upgrade-guard` runs the
  same script on every pull request that touches the boot path.
- `/opt/oh-seed` remains a supported seed source for images that still ship it; nothing in this
  repository stages it any more.
- The root checkout at `/home/sandbox/harness` still uses `.oh/`. It is the bind mount of the
  sandbox running this session, so it is migrated by the operator with `agro migrate` after the
  merge, not by this pull request.
