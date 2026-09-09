#!/usr/bin/env bash
# tier: A
# source: #943 — GHSA-82fw-gwwq-j7x9 turned a live `pnpm:devPreinstall` advisory query into a sandbox boot failure
# desc: the dependency security audit must run only as an explicit CI/release workflow step, never as an npm/pnpm lifecycle hook that fires on every `pnpm install` (and therefore on every sandbox boot that lacks node_modules)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
CI_WORKFLOW="$ROOT/.github/workflows/ci-harness.yml"
RELEASE_WORKFLOW="$ROOT/.github/workflows/release.yml"

for f in "$CI_WORKFLOW" "$RELEASE_WORKFLOW"; do
  [[ -f "$f" ]] || { echo "SKIPPED: missing required file $f" >&2; exit 2; }
done

failures=()

HOOK_NAMES=(preinstall postinstall prepare pnpm:devPreinstall pnpm:devPrepare)

mapfile -t PACKAGE_JSONS < <(git -C "$ROOT" ls-files -- '*package.json')

for rel in "${PACKAGE_JSONS[@]}"; do
  pkg="$ROOT/$rel"
  [[ -f "$pkg" ]] || continue

  hit="$(node -e '
    const fs = require("fs");
    const hookNames = process.argv.slice(2);
    let pkg;
    try {
      pkg = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    } catch (e) {
      process.exit(0);
    }
    const scripts = pkg.scripts || {};
    for (const name of hookNames) {
      const value = scripts[name];
      if (typeof value === "string" && /security:audit|pnpm\s+audit|npm\s+audit/.test(value)) {
        console.log(name + "=" + value);
      }
    }
  ' "$pkg" "${HOOK_NAMES[@]}")"

  if [[ -n "$hit" ]]; then
    while IFS= read -r line; do
      [[ -n "$line" ]] || continue
      failures+=("$rel: lifecycle hook $line invokes the security audit")
    done <<<"$hit"
  fi
done

check_workflow_audit_step() {
  local workflow="$1"
  awk '
    /^[[:space:]]*-[[:space:]]*name:/ { name=$0 }
    /run:[[:space:]]*pnpm run security:audit/ { found=1 }
    END { exit found ? 0 : 1 }
  ' "$workflow"
}

if ! check_workflow_audit_step "$CI_WORKFLOW"; then
  failures+=("$(basename "$CI_WORKFLOW") no longer runs 'pnpm run security:audit' as an explicit step")
fi

if ! check_workflow_audit_step "$RELEASE_WORKFLOW"; then
  failures+=("$(basename "$RELEASE_WORKFLOW") no longer runs 'pnpm run security:audit' as an explicit step")
fi

if (( ${#failures[@]} )); then
  printf 'REGRESSION: %d issue(s) found:\n' "${#failures[@]}" >&2
  printf '  - %s\n' "${failures[@]}" >&2
  exit 1
fi

echo "PASS: no package.json lifecycle hook invokes the security audit, and ci-harness.yml + release.yml each run 'pnpm run security:audit' as an explicit step" >&2
exit 0
