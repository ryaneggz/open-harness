#!/usr/bin/env bash
set -euo pipefail
trap 'printf "ERROR: agro-cutover-domain.sh failed at line %s\n" "$LINENO" >&2' ERR

readonly CERTIFICATE_TIMEOUT_SECONDS="${CERTIFICATE_TIMEOUT_SECONDS:-1800}"
readonly CERTIFICATE_POLL_SECONDS=15
readonly REQUEST_TIMEOUT_SECONDS=20
readonly CLOUDFLARE_API_BASE="https://api.cloudflare.com/client/v4"
readonly REDIRECT_PHASE_PATH="rulesets/phases/http_request_dynamic_redirect/entrypoint"

AGRO_WEB_REPO="${AGRO_WEB_REPO:-mifunedev/agro-web}"
AGRO_HOST="${AGRO_HOST:-agro.mifune.dev}"
LEGACY_HOST="${LEGACY_HOST:-oh.mifune.dev}"
CORE_REPO="${CORE_REPO:-mifunedev/agro}"
readonly AGRO_WEB_REPO AGRO_HOST LEGACY_HOST CORE_REPO

readonly EXECUTABLE_PATHS=(/install.sh /get-oh.sh /oh.js /get-agro.sh /agro.js)
readonly ROLLBACK_FILE="${TMPDIR:-/tmp}/agro-cutover-domain-rollback.json"

MODE=apply

usage() {
  cat <<USAGE
Usage: agro-cutover-domain.sh [--check] [--rollback]

Perform steps 5 and 6 of docs/agro-cutover-runbook.md as one operation: add the
Cloudflare redirect rules for $LEGACY_HOST, set the GitHub Pages custom domain of
$AGRO_WEB_REPO to $AGRO_HOST, verify every compatibility endpoint, and restore the
previous state when verification fails.

Modes:
  (no option)  Apply the rules, set the domain, verify, and roll back on failure.
  --check      Print the current state and the ruleset payload. Change nothing.
  --rollback   Restore the recorded Pages domain and ruleset. Do nothing else.

Order: the script writes the Cloudflare rules before it changes the Pages domain.
The rules only redirect $LEGACY_HOST to $AGRO_HOST. $AGRO_HOST answers 421 until the
Pages domain moves, so an early rule write costs nothing. The opposite order leaves
$LEGACY_HOST with five 404 executable paths until the rules exist.

Credentials, from the environment only:
  CLOUDFLARE_API_TOKEN  Cloudflare token with edit rights on the dynamic redirect
                        rules of the zone. The script sends the token in a request
                        header from a variable. The script never prints it.
  CLOUDFLARE_ZONE_ID    Cloudflare zone ID of the domain.
  gh                    An authenticated GitHub CLI with admin rights on
                        $AGRO_WEB_REPO.

Configuration, with defaults:
  AGRO_WEB_REPO  $AGRO_WEB_REPO
  AGRO_HOST      $AGRO_HOST
  LEGACY_HOST    $LEGACY_HOST
  CORE_REPO      $CORE_REPO

The script polls the Pages certificate state for $CERTIFICATE_TIMEOUT_SECONDS seconds.
Cloudflare proxying can delay certificate issuance. The documented remedy is to set
the $AGRO_HOST record to DNS only, wait for the approved state, then set the record
back to Proxied.

Rollback file: $ROLLBACK_FILE

Exit codes:
  0   Success, or a clean dry run.
  1   Verification failed and the rollback succeeded.
  2   Verification failed and the rollback also failed.
  64  Usage error, a missing credential, or a missing command.
USAGE
}

fail_usage() {
  printf 'agro-cutover-domain.sh: %s\n\n' "$1" >&2
  usage >&2
  exit 64
}

say() { printf '%s\n' "$*"; }
warn() { printf '%s\n' "$*" >&2; }

parse_arguments() {
  local check=0 rollback=0
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --check) check=1; shift ;;
      --rollback) rollback=1; shift ;;
      *) fail_usage "unknown argument: $1" ;;
    esac
  done
  [ "$check" -eq 1 ] && [ "$rollback" -eq 1 ] && fail_usage "--check and --rollback are exclusive"
  [ "$check" -eq 1 ] && MODE=check
  [ "$rollback" -eq 1 ] && MODE=rollback
  return 0
}

require_commands() {
  local command_name
  for command_name in curl gh jq; do
    command -v "$command_name" >/dev/null 2>&1 || fail_usage "$command_name is not installed"
  done
  gh auth status >/dev/null 2>&1 || fail_usage "gh is not authenticated; run gh auth login"
}

require_credentials() {
  [ -n "${CLOUDFLARE_API_TOKEN:-}" ] || fail_usage "CLOUDFLARE_API_TOKEN is not set"
  [ -n "${CLOUDFLARE_ZONE_ID:-}" ] || fail_usage "CLOUDFLARE_ZONE_ID is not set"
}

cloudflare_request() {
  local method=$1 data_file=${2:-}
  local -a arguments=(--silent --show-error --request "$method" --max-time 60
    --header 'Content-Type: application/json')
  [ -n "$data_file" ] && arguments+=(--data "@$data_file")
  printf 'header = "Authorization: Bearer %s"\nurl = "%s"\n' \
    "$CLOUDFLARE_API_TOKEN" \
    "$CLOUDFLARE_API_BASE/zones/$CLOUDFLARE_ZONE_ID/$REDIRECT_PHASE_PATH" |
    curl "${arguments[@]}" --config -
}

assert_cloudflare_success() {
  local response=$1 action=$2
  if [ "$(printf '%s' "$response" | jq -r '.success // false')" != true ]; then
    warn "Cloudflare rejected the $action call:"
    printf '%s' "$response" | jq -r '.errors // .' >&2
    return 1
  fi
}

read_ruleset() {
  local response
  response=$(cloudflare_request GET) || return 1
  assert_cloudflare_success "$response" "ruleset read" || return 1
  printf '%s' "$response" | jq '.result'
}

write_ruleset() {
  local payload_file=$1 response
  response=$(cloudflare_request PUT "$payload_file") || return 1
  assert_cloudflare_success "$response" "ruleset write" || return 1
  printf '%s' "$response" | jq -r '.result.rules[]?.description' | sed 's/^/  applied rule: /'
}

ruleset_payload() {
  cat <<PAYLOAD
{
  "rules": [
    {
      "description": "agro-install-sh",
      "expression": "http.request.uri.path eq \"/install.sh\" and http.host in {\"$LEGACY_HOST\" \"$AGRO_HOST\"}",
      "action": "redirect",
      "action_parameters": {
        "from_value": {
          "status_code": 302,
          "target_url": { "value": "https://raw.githubusercontent.com/$CORE_REPO/main/.agro/scripts/install.sh" },
          "preserve_query_string": false
        }
      }
    },
    {
      "description": "agro-legacy-artifacts",
      "expression": "http.host eq \"$LEGACY_HOST\" and http.request.uri.path in {\"/get-oh.sh\" \"/oh.js\" \"/get-agro.sh\" \"/agro.js\"}",
      "action": "redirect",
      "action_parameters": {
        "from_value": {
          "status_code": 302,
          "target_url": { "expression": "concat(\"https://$AGRO_HOST\", http.request.uri.path)" },
          "preserve_query_string": true
        }
      }
    },
    {
      "description": "agro-docs-catch-all",
      "expression": "http.host eq \"$LEGACY_HOST\" and not http.request.uri.path in {\"/install.sh\" \"/get-oh.sh\" \"/oh.js\" \"/get-agro.sh\" \"/agro.js\"}",
      "action": "redirect",
      "action_parameters": {
        "from_value": {
          "status_code": 301,
          "target_url": { "expression": "concat(\"https://$AGRO_HOST\", http.request.uri.path)" },
          "preserve_query_string": true
        }
      }
    }
  ]
}
PAYLOAD
}

pages_state() {
  gh api "repos/$AGRO_WEB_REPO/pages" 2>/dev/null || printf '{}\n'
}

pages_field() {
  pages_state | jq -r "$1"
}

pages_cname() { pages_field '.cname // ""'; }
pages_certificate_state() { pages_field '.https_certificate.state // "none"'; }

set_pages_cname() {
  gh api -X PUT "repos/$AGRO_WEB_REPO/pages" -f cname="$1" -F https_enforced=false >/dev/null
}

wait_for_certificate() {
  local deadline state previous=""
  deadline=$(( $(date +%s) + CERTIFICATE_TIMEOUT_SECONDS ))
  while [ "$(date +%s)" -lt "$deadline" ]; do
    state=$(pages_certificate_state)
    if [ "$state" != "$previous" ]; then
      say "  certificate state: $state"
      previous=$state
    fi
    [ "$state" = approved ] && return 0
    sleep "$CERTIFICATE_POLL_SECONDS"
  done
  warn "The certificate state stayed at ${previous:-unknown} for $CERTIFICATE_TIMEOUT_SECONDS seconds."
  warn "Set the $AGRO_HOST record to DNS only, wait for the approved state, then set it back to Proxied."
  return 1
}

endpoint_status() {
  curl --silent --show-error --output /dev/null --max-time "$REQUEST_TIMEOUT_SECONDS" \
    --write-out '%{http_code}' "$1" 2>/dev/null || printf 'ERR'
}

endpoint_redirect() {
  curl --silent --show-error --output /dev/null --max-time "$REQUEST_TIMEOUT_SECONDS" \
    --write-out '%{redirect_url}' "$1" 2>/dev/null || printf ''
}

endpoint_is_executable() {
  local body
  body=$(curl --fail --silent --show-error --location --max-time "$REQUEST_TIMEOUT_SECONDS" "$1" 2>/dev/null || true)
  [ "${body:0:2}" = '#!' ]
}

print_table_header() {
  printf '%-46s %-7s %-11s %s\n' ENDPOINT STATUS BODY REDIRECT
}

print_endpoint_row() {
  local url=$1 expectation=$2 status redirect body
  status=$(endpoint_status "$url")
  redirect=$(endpoint_redirect "$url")
  if [ "$expectation" = executable ]; then
    if endpoint_is_executable "$url"; then body='#!'; else body='not #!'; fi
  else
    if [ "$status" = 200 ]; then body='200 root'; else body='no 200'; fi
  fi
  printf '%-46s %-7s %-11s %s\n' "$url" "$status" "$body" "${redirect:--}"
  [ "$body" = '#!' ] || [ "$body" = '200 root' ]
}

report_endpoints() {
  local host path failures=0
  print_table_header
  for host in "$LEGACY_HOST" "$AGRO_HOST"; do
    for path in "${EXECUTABLE_PATHS[@]}"; do
      print_endpoint_row "https://$host$path" executable || failures=$(( failures + 1 ))
    done
  done
  for host in "$LEGACY_HOST" "$AGRO_HOST"; do
    print_endpoint_row "https://$host/" root || failures=$(( failures + 1 ))
  done
  [ "$failures" -eq 0 ]
}

report_legacy_endpoints() {
  local path failures=0
  print_table_header
  for path in "${EXECUTABLE_PATHS[@]}"; do
    print_endpoint_row "https://$LEGACY_HOST$path" executable || failures=$(( failures + 1 ))
  done
  [ "$failures" -eq 0 ]
}

record_rollback_state() {
  local cname=$1 ruleset=$2
  jq -n --arg cname "$cname" --argjson ruleset "$ruleset" \
    '{recorded_at: (now | todate), pages_cname: $cname, ruleset: $ruleset}' >"$ROLLBACK_FILE"
  say "Recorded the previous state in $ROLLBACK_FILE"
  say "  previous Pages cname: ${cname:-<none>}"
  say "  previous rule count: $(printf '%s' "$ruleset" | jq '(.rules // []) | length')"
}

restore_from_rollback() {
  local cname restore_file status=0
  [ -f "$ROLLBACK_FILE" ] || { warn "No rollback file at $ROLLBACK_FILE"; return 1; }
  restore_file="${ROLLBACK_FILE}.restore"
  jq '{rules: [(.ruleset.rules // [])[] | del(.version, .last_updated)]}' "$ROLLBACK_FILE" >"$restore_file"
  say 'Restoring the previous Cloudflare rules.'
  write_ruleset "$restore_file" || status=1
  rm -f "$restore_file"
  cname=$(jq -r '.pages_cname // ""' "$ROLLBACK_FILE")
  if [ -n "$cname" ]; then
    say "Restoring the Pages custom domain to $cname."
    set_pages_cname "$cname" || status=1
  else
    warn 'The rollback file holds no previous Pages domain. Restore the domain by hand.'
    status=1
  fi
  return "$status"
}

run_check() {
  say "Pages repository: $AGRO_WEB_REPO"
  say "  cname: $(pages_cname)"
  say "  https_enforced: $(pages_field '.https_enforced // false')"
  say "  certificate state: $(pages_certificate_state)"
  say ''
  say 'Current Cloudflare redirect rules:'
  read_ruleset | jq -r '(.rules // []) | if length == 0 then "  <none>" else .[] | "  \(.description // "<no description>"): \(.expression)" end'
  say ''
  say 'Endpoint status now:'
  report_endpoints || true
  say ''
  say 'Ruleset payload that the apply mode would send:'
  ruleset_payload
  say ''
  say 'Dry run complete. Nothing changed.'
}

run_rollback() {
  if restore_from_rollback; then
    say 'Rollback complete. Verifying the legacy host.'
    if report_legacy_endpoints; then
      say "Rollback verified: $LEGACY_HOST serves every executable path."
      exit 0
    fi
    warn "Rollback applied but $LEGACY_HOST does not serve every executable path."
    exit 2
  fi
  warn 'Rollback failed.'
  exit 2
}

roll_back_after_failure() {
  warn 'Verification failed. Rolling back the Pages domain and the Cloudflare rules.'
  if restore_from_rollback && report_legacy_endpoints; then
    warn "Rollback restored service on $LEGACY_HOST."
    exit 1
  fi
  warn "ROLLBACK FAILED. $LEGACY_HOST may be down. Restore the Pages domain and the rules by hand."
  warn "Recorded state: $ROLLBACK_FILE"
  exit 2
}

run_apply() {
  local current_cname payload_file ruleset
  current_cname=$(pages_cname)
  say "Current Pages cname: ${current_cname:-<none>}"

  if [ "$current_cname" = "$AGRO_HOST" ]; then
    say "The Pages custom domain is already set to $AGRO_HOST. Skipping to verification."
    if report_endpoints; then
      say 'Verification passed. Nothing to change.'
      exit 0
    fi
    warn 'Verification failed. This run changed nothing, so it recorded no rollback state.'
    warn "Run agro-cutover-domain.sh --rollback to restore a state that an earlier run recorded."
    exit 1
  fi

  ruleset=$(read_ruleset)
  record_rollback_state "$current_cname" "$ruleset"

  payload_file="${TMPDIR:-/tmp}/agro-cutover-domain-payload.json"
  ruleset_payload >"$payload_file"
  say 'Applying the Cloudflare redirect rules before the domain switch.'
  write_ruleset "$payload_file"
  rm -f "$payload_file"

  say "Setting the Pages custom domain of $AGRO_WEB_REPO to $AGRO_HOST."
  set_pages_cname "$AGRO_HOST"
  say 'Waiting for the Pages certificate.'
  wait_for_certificate || roll_back_after_failure

  say ''
  say 'Verifying every compatibility endpoint:'
  report_endpoints || roll_back_after_failure
  say ''
  say "Cutover complete. $LEGACY_HOST and $AGRO_HOST both serve every executable path."
}

main() {
  parse_arguments "$@"
  require_credentials
  require_commands
  case "$MODE" in
    check) run_check ;;
    rollback) run_rollback ;;
    apply) run_apply ;;
  esac
}

main "$@"
