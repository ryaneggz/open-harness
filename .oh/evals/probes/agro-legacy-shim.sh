#!/usr/bin/env bash
# tier: A
# source: issue #941 (AGRO Phase 1) — @mifune/openharness becomes a delegation shim over the exact @mifune/agro version, with disjoint bins so both packages coexist
# desc: .oh/cli/legacy/package.json is @mifune/openharness at the .oh/cli version, pins @mifune/agro to exactly that version, exposes only bin.oh -> ./bin/oh.js, ships no dist/ of its own, and bin/oh.js is one import of @mifune/agro/dist/agro.js and nothing else
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
CLI_PKG="$ROOT/.oh/cli/package.json"
LEGACY_DIR="$ROOT/.oh/cli/legacy"
LEGACY_PKG="$LEGACY_DIR/package.json"
SHIM="$LEGACY_DIR/bin/oh.js"

if [ ! -f "$CLI_PKG" ]; then
  echo 'SKIPPED .oh/cli/package.json not present' >&2
  exit 2
fi
if ! command -v jq >/dev/null 2>&1; then
  echo 'SKIPPED jq not on PATH' >&2
  exit 2
fi

fail() { echo "REGRESSION $1" >&2; exit 1; }

[ -f "$LEGACY_PKG" ] || fail ".oh/cli/legacy/package.json is missing — the @mifune/openharness shim has no manifest"
[ -f "$SHIM" ] || fail ".oh/cli/legacy/bin/oh.js is missing — the shim has no oh executable"
jq -e . "$LEGACY_PKG" >/dev/null 2>&1 || fail ".oh/cli/legacy/package.json is not valid JSON"

cli_version="$(jq -r '.version' "$CLI_PKG")"
legacy_version="$(jq -r '.version' "$LEGACY_PKG")"
pin="$(jq -r '.dependencies["@mifune/agro"] // ""' "$LEGACY_PKG")"

jq -e '.name == "@mifune/openharness"' "$LEGACY_PKG" >/dev/null \
  || fail ".oh/cli/legacy/package.json name is not @mifune/openharness"
[ "$legacy_version" = "$cli_version" ] \
  || fail ".oh/cli/legacy/package.json version $legacy_version differs from .oh/cli/package.json $cli_version"
[ "$pin" = "$cli_version" ] \
  || fail ".oh/cli/legacy/package.json pins @mifune/agro '$pin' — must be exactly $cli_version (no range)"
jq -e '.bin == {"oh": "./bin/oh.js"}' "$LEGACY_PKG" >/dev/null \
  || fail ".oh/cli/legacy/package.json bin must be exactly {oh: ./bin/oh.js} — disjoint from the agro bin"
jq -e '.files | index("bin")' "$LEGACY_PKG" >/dev/null \
  || fail ".oh/cli/legacy/package.json files[] does not ship bin"
if jq -e '.files | index("dist")' "$LEGACY_PKG" >/dev/null; then
  fail ".oh/cli/legacy/package.json ships dist/ — the shim must carry no bundle of its own"
fi
[ ! -e "$LEGACY_DIR/dist" ] || fail ".oh/cli/legacy/dist exists — the shim must carry no bundle of its own"
jq -e '.publishConfig.access == "public"' "$LEGACY_PKG" >/dev/null \
  || fail ".oh/cli/legacy/package.json lost publishConfig.access=\"public\""

code_lines="$(grep -cvE '^(#!|[[:space:]]*$)' "$SHIM" || true)"
[ "$code_lines" = "1" ] \
  || fail ".oh/cli/legacy/bin/oh.js has $code_lines code lines — it must be exactly one import and nothing else"
grep -qxE 'import "@mifune/agro/dist/agro\.js";' "$SHIM" \
  || fail ".oh/cli/legacy/bin/oh.js does not import @mifune/agro/dist/agro.js"
head -1 "$SHIM" | grep -q '^#!/usr/bin/env node$' \
  || fail ".oh/cli/legacy/bin/oh.js lacks the #!/usr/bin/env node shebang"

echo "PASS @mifune/openharness shim: v$legacy_version, pins @mifune/agro@$pin, bin oh only, bin/oh.js is one import of @mifune/agro/dist/agro.js"
exit 0
