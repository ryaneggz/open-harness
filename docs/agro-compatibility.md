# AGRO compatibility contract

Open Harness is migrating to AGRO (Agent Governance Runtime Orchestrator) under
epic [#939](https://github.com/mifunedev/openharness/issues/939). This page is the
Phase 0 contract ([#940](https://github.com/mifunedev/openharness/issues/940)):
how the runtime understands both naming generations before any default changes.

## What Phase 0 changes, and what it does not

Phase 0 changes no default. A normal project with `.oh/`, `oh.json`, and `OH_*`
variables behaves exactly as before. No `agro` executable, package, command, or
image ships in this phase. Fresh sandboxes still create `~/.oh/sandboxes/`,
`oh.json`, and `.oh/`.

Phase 0 adds one resolver, in two boot-safe forms, that both generations pass
through:

| Surface | Legacy | AGRO | Resolver |
|---|---|---|---|
| Project control directory | `.oh/` | `.agro/` | `resolveControlDir`, `compat_control_dir` |
| Project config file | `oh.json` | `agro.json` | `resolveConfigFile`, `compat_config_file` |
| Environment variables | `OH_*` | `AGRO_*` | `resolveAliasedEnv`, `compat_env` |
| Host registry home | `~/.oh` | `~/.agro` | `resolveUserStateHome` |
| Image seed | `/opt/oh-seed` | `/opt/agro-seed` | `resolveSeedSource`, `compat_seed_src` |
| First-boot marker | `.oh/.image-seeded` | `.agro/.image-seeded` | `compat_marker_file` |

The TypeScript module is `.oh/cli/src/lib/compat.ts`. The shell adapter is
`.oh/scripts/compat.sh`; it needs only bash and coreutils, so the entrypoint can
use it before Node or the control plane exists. Both consume the same vectors in
`.oh/cli/src/lib/__tests__/fixtures/compat-vectors.json`, and a test runs every
vector through each implementation.

## Precedence and conflicts

Files and directories:

| State | Result |
|---|---|
| Neither generation present | `absent` |
| Legacy only | `legacy-only`; the legacy path is used |
| AGRO only | `agro-only`; the AGRO path is used |
| Both present and byte-identical | `both-equivalent`; the AGRO path is canonical |
| Both present and different | Fail closed with an error that names the differing entries |

Equivalence is byte identity: entry sets, entry types, permission bits, symlink
targets, and file contents. No normalization is applied. A formatting-only
difference between `oh.json` and `agro.json` is a conflict. A conflict never
merges; the operator keeps exactly one copy or makes them identical.

Environment variables:

1. An explicit command flag wins.
2. `AGRO_<NAME>` wins when it is set to a non-empty value.
3. `OH_<NAME>` applies when `AGRO_<NAME>` is unset or empty.
4. An empty value is treated as unset, matching every existing consumer.
5. When both are set and differ, the resolver warns with the two key names and
   the selected key. It never prints a value.

The registry home follows the same rule: `AGRO_HOME`, then `OH_HOME`, then
discovery. Discovery keeps `~/.oh` unless `~/.agro/sandboxes` is the only
registry, or both registries exist and are byte-identical. Two registries that
differ fail closed. `~/.openharness` is a legacy product checkout, never registry
content, and discovery ignores it.

The image seed selects `/opt/agro-seed` only when it is the sole seed directory.
The entrypoint seeds a workspace only when it holds neither `.oh/` nor `.agro/`,
stamps the marker inside whichever control directory the seed produced, and never
seeds a workspace whose two control directories diverge.

## Migration engine

`.oh/cli/src/lib/migrate.ts` implements the engine that Phase 2 exposes as
`agro migrate`. Phase 0 ships no command.

- `planMigration(spec)` inspects the tree and returns a JSON-serializable plan
  with `status` (`ready`, `noop`, or `conflict`), ordered steps, and conflicts. It
  never mutates anything.
- Steps are `rename` (legacy → AGRO path, same-filesystem rename), `retire`
  (byte-identical pair: the legacy copy moves to `<name>.migrated` and stays
  recoverable), `rewrite` (caller-supplied literal replacements in one file),
  and `noop`.
- `applyMigration(plan)` refuses a `conflict` plan, returns `noop` for an
  already-migrated tree, takes an exclusive `.agro-migrate.lock`, revalidates
  every planned entry against the snapshot taken at plan time, and then applies
  the steps in order. If a step fails, it stops and reports which steps completed
  and which remain. Repeated apply is a no-op.
- Paths must be absolute and inside the migration root after symlink
  resolution. Renames preserve unknown files, permission bits, and symlink
  targets because the tree moves as one entry.
- There is no force option. Nothing merges.

`projectMigrationSpec(root)` covers `.oh/` → `.agro/` and `oh.json` →
`agro.json`. `userStateMigrationSpec(home)` covers only `~/.oh/sandboxes` →
`~/.agro/sandboxes`.

## Legacy contract inventory

`.oh/compat-inventory.json` classifies every `OH_*` identifier in tracked files
and every persisted legacy path as one of `migrate-later`, `alias-sla`,
`retained-generic`, or `obsolete`, with the owning phase. The test
`compat-inventory.test.ts` and the probe `agro-compat-inventory.sh` fail when an
identifier appears in the tree without a classification, when a non-obsolete
entry goes stale, or when an `alias-sla` entry lacks its `AGRO_*` spelling.

## Legacy references intentionally left for later phases

- `get-oh.sh` and `install.sh` read only `OH_*` installer controls. Their
  `AGRO_*` aliases arrive with `get-agro.sh` in Phase 1.
- Compose interpolation keys (`OH_SANDBOX_IMAGE`, `OH_PULL_POLICY`,
  `OH_REPO_DIR`, `OH_HOME_MOUNT`) and the image `ENV OH_PROJECT_ROOT` keep their
  names until the fresh-state defaults change in Phase 2.
- The Cloud CLI variables (`OH_CLOUD_*`, `OH_API_URL`, `OH_PROVISION_KEY`) are
  Phase 4.
- Error messages, help text, and package identity still say `oh` and
  OpenHarness; Phase 1 introduces the AGRO entry points.

## Verification

```bash
pnpm test
npm --prefix .oh/cli run typecheck
bash .oh/evals/probes/agro-compat-inventory.sh
bash .oh/evals/probes/sandbox-registry.sh
bash .oh/evals/probes/oh-image-only-deploy.sh
```
