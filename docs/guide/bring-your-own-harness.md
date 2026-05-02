# Bring Your Own Harness

A **harness pack** is a directory (or installable package) that contributes onboarding steps, compose overlays, workspace seeds, and runtime hooks to an openharness sandbox. Authoring a pack lets you bundle an opinionated agent stack — coding agent, automations, slack bot, custom tools — into something a user installs with one command.

## Installing a pack

```bash
oh harness add <spec>
```

`<spec>` is resolved into one of three source modes:

| Spec shape | Mode | Resolution |
|------------|------|-----------|
| `@scope/name` or bare `name` | npm | `npm install -g <spec>`; pack lives at `$(npm root -g)/<spec>/` |
| `<owner>/<repo>` (one slash, no protocol) | git | `git clone https://github.com/<owner>/<repo>.git` to `~/openharness/harnesses/<repo>/` |
| `https://...`, `git@...`, `ssh://...` | git | Clone the URL as-is to `~/openharness/harnesses/<name>/` |
| `./path` or absolute path | local | Use as-is; nothing copied |

The resolver runs the same install pipeline regardless of source mode:

1. Validate `harness.json` against the schema below.
2. Append the pack's `compose_overlays[]` paths to `.openharness/config.json`.
3. Run `install_hook` (a shell script — typically installs agent CLIs).
4. Symlink `entrypoint_hook` into `/usr/local/bin/<name>-entrypoint-hook.sh` so it runs on next sandbox start.
5. Register the pack in `.openharness/harnesses.json`.

`oh harness remove <name>` reverses all of the above. Idempotent.

## Pack layout

```
<pack-root>/
  harness.json            # Manifest (REQUIRED)
  install-hook.sh         # Run on `oh harness add`
  entrypoint-hook.sh      # Sourced by openharness entrypoint at runtime
  overlays/*.yml          # Compose overlays
  onboard-steps/*.{js,ts} # Step modules merged into the onboard orchestrator
  workspace-seed/         # Copied to sandbox workspace on install
  Dockerfile              # OPTIONAL: derived image FROM openharness base
  package.json            # Required if publishing to npm
```

Packs published to npm should also expose the manifest under the `harness` key in `package.json` for npm-tooling discoverability.

## `harness.json` schema

```json
{
  "name": "mifune",
  "version": "2026.5.2",
  "description": "Pi+Mom harness for openharness",
  "openharness": ">=2026.5.2",
  "agents": ["pi"],
  "compose_overlays": [
    "overlays/docker-compose.pi-host.yml",
    "overlays/docker-compose.slack.yml"
  ],
  "onboard_steps": [
    { "id": "slack", "after": "github", "file": "onboard-steps/slack.js" }
  ],
  "install_hook": "install-hook.sh",
  "entrypoint_hook": "entrypoint-hook.sh",
  "workspace_seed": "workspace-seed/",
  "prebuilt_image": "ghcr.io/ryaneggz/mifune:latest"
}
```

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | Used as the pack identifier in the registry. Lowercase, kebab-case. |
| `version` | string | Pack version — does not have to match the underlying agent CLI version. |
| `description` | string | One-line summary shown by `oh harness list`. |
| `openharness` | string | Minimum compatible openharness CLI version (semver range). |
| `agents` | string[] | Agent CLIs the pack wires in. Informational; not enforced. |
| `compose_overlays` | string[] | Paths-within-pack to docker-compose YAML overlays. |
| `onboard_steps` | array | Each entry: `{ id, after?, file }`. `file` points at a compiled step module. |
| `install_hook` | string | Path-within-pack to a shell script run on install. |
| `entrypoint_hook` | string | Path-within-pack to a shell hook sourced by the openharness entrypoint at sandbox startup. |
| `workspace_seed` | string | Directory-within-pack copied into the sandbox workspace on install. |
| `prebuilt_image` | string? | Optional GHCR image tag for fast Docker-only on-ramp. |

## Authoring an onboard step

Each entry in `onboard_steps[]` must point at a JS module exposing a `Step`-shaped object via:

1. `export default` (the step), OR
2. `export const <id>Step` (e.g. `export const slackStep`), OR
3. `export const step`.

Step shape (TypeScript):

```ts
interface Step {
  id: string;
  label: string;
  run(deps: Deps, opts: { force: boolean }): Promise<{ id: string; status: "done" | "skipped" | "failed" }>;
}
```

The `Deps` bag is supplied by openharness at runtime (fs, exec, io, env, clock). Steps are pure consumers — never reach for `fs` or `child_process` directly; use the injected deps so tests can fake them.

The `after` field declares an ordering prerequisite. The orchestrator topologically sorts steps before running, falling back to insertion order when constraints can't be satisfied.

## Distribution

Three options, in order of preference:

1. **Publish to npm** — `oh harness add @scope/your-pack` is the smoothest user experience. Bake the manifest into `package.json` `harness` so installed packs are self-describing. Bundle `dist/` (compiled steps) in your `files` field.
2. **Public git repo** — `oh harness add owner/repo` clones from GitHub. Useful while iterating before the first npm release.
3. **Local path** — `oh harness add ./path` symlinks an in-development pack into the sandbox without publishing. Tightest dev loop.

## Reference implementation

The [`mifune`](https://github.com/ryaneggz/mifune) pack is the canonical example: Pi agent CLI + Mom Slack bot, packaged as both an npm package (`@ryaneggz/mifune`) and a `ghcr.io/ryaneggz/mifune:latest` Docker image derived from the openharness base.
