#!/usr/bin/env bash
# PreToolUse Bash guard: two-tier check for secret exposure.
#   Tier 1 (deny) — bulk env dumps, history dumps, token-printing CLI commands,
#                   echo/printf of secret-named variables, auth headers with
#                   variable interpolation.
#   Tier 2 (ask)  — narrow reads where the value *might* be public.
#   otherwise     — allow (hook exits silently).
#
# Scans the raw command string, so patterns inside `docker exec ... '...'`
# or `bash -c '...'` subshells are still caught.
set -euo pipefail

input=$(cat)
cmd=$(jq -r '.tool_input.command // ""' <<<"$input")

# Secret-ish variable-name fragments. Matched case-insensitively inside ${VAR}
# or $VAR dereferences in echo / printf / curl / etc.
SECRET_NAME='(TOKEN|SECRET|PASSWORD|PASSWD|APIKEY|API_KEY|ACCESS_KEY|PRIVATE_KEY|CREDENTIAL|AUTH|BEARER|SESSION|COOKIE|SLACK_[A-Z_]*|OPENAI_[A-Z_]*|ANTHROPIC_[A-Z_]*|GITHUB_TOKEN|GH_TOKEN|AWS_SECRET|AWS_SESSION|GCP_[A-Z_]*|DATABASE_URL|DB_PASSWORD)'

# Tier 1 — hard deny.
DENY='\benv[[:space:]]*[|>;&]'                       # env | / env > / env ; / env &
DENY+='|\benv[[:space:]]*$'                          # bare env
DENY+='|\bset[[:space:]]*[|>]'                       # set | / set >
DENY+='|\bexport[[:space:]]+-p\b'                    # export -p
DENY+='|\bdeclare[[:space:]]+-[xp]\b'                # declare -x / -p
DENY+='|\bcompgen[[:space:]]+-[vxAe]'                # compgen -v / -x / -A / -e
DENY+='|/proc/[^/[:space:]]+/environ'                # /proc/<pid|self>/environ
DENY+='|\bprintenv[[:space:]]*([|;>&]|$)'            # printenv with no args
DENY+='|\bhistory\b'                                 # shell history dump
DENY+='|\bfc[[:space:]]+-l'                          # fc -l (also lists history)
DENY+="|\\b(echo|printf)\\b[^#\\n]*\\\$\\{?[A-Z0-9_]*${SECRET_NAME}[A-Z0-9_]*\\}?"
DENY+="|Authorization:[[:space:]]*['\"]?(Bearer|Basic|Token)[[:space:]]+\\\$"  # auth header with var interpolation
DENY+='|\baws[[:space:]]+configure[[:space:]]+get\b'
DENY+='|\bgh[[:space:]]+auth[[:space:]]+token\b'
DENY+='|\bgcloud[[:space:]]+auth[[:space:]]+print-(access|identity)-token\b'
DENY+='|\bkubectl[[:space:]]+get[[:space:]]+secret[^|]*-o[[:space:]]*(yaml|json)'
DENY+='|\bdocker[[:space:]]+(secret|config)[[:space:]]+inspect\b'

# Tier 2 — ask (narrow / possibly legitimate).
ASK='\bprintenv[[:space:]]+[A-Za-z_]'                # printenv VAR [VAR ...]
ASK+="|\\b(echo|printf)\\b[^#\\n]*\\\$\\{?[A-Z][A-Z0-9_]*\\}?"  # echo of any $VAR (catch-all below deny tier)

emit() {
  jq -n --arg d "$1" --arg r "$2" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: $d,
      permissionDecisionReason: $r
    }
  }'
}

if grep -qEi -- "$DENY" <<<"$cmd"; then
  emit deny 'Secret-exposure guard (deny): command matches a high-risk pattern — bulk env dump (env/set/export -p/declare -x/-p/compgen/printenv/proc environ), shell history, echo/printf of a secret-named variable (TOKEN/SECRET/KEY/PASSWORD/AUTH/CREDENTIAL/BEARER/SLACK_*/OPENAI_*/ANTHROPIC_*/GH_TOKEN/AWS_SECRET), Authorization header with variable interpolation, or a token-printing CLI (gh auth token, gcloud auth print-*-token, aws configure get, kubectl get secret -o yaml/json, docker secret/config inspect). These almost always leak credentials into the transcript and prompt cache. Do NOT retry a variant that bypasses this check. Ask the user to run the command themselves and paste only the specific non-secret output you need.'
elif grep -qE -- "$ASK" <<<"$cmd"; then
  emit ask 'Secret-exposure guard (ask): command reads or echoes a specific variable / single env value whose contents may include a secret. Requires explicit user approval before running.'
fi
