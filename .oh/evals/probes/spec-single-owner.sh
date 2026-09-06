#!/usr/bin/env bash
# tier: A
# source: conversation 2026-06-19 (single-owner implementation workflow, issue #257);
#         renamed from advisor-monitored-loop by issue #928 (retire automated /spec agent handoff);
#         extended by issue #988 / ADR #989 (worker-first implementation under one advisor)
# desc: prose check: /spec execute gives the agent that runs it sole ownership of decisions,
#       acceptance, and the final gates; bounded /delegate workers perform the tracked
#       implementation edits before acceptance, a direct owner edit needs a recorded operator
#       exception, a worker never writes task state, the task stays in the same session unless the
#       operator requests a transfer, and no second owner, supervisor, forced handoff, or
#       separately launched process may reappear
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
EXEC="$ROOT/.oh/skills/spec/references/execute.md"
PROMPT="$ROOT/.oh/skills/spec/templates/task-prompt.md"

for file in "$EXEC" "$PROMPT"; do
  if [[ ! -f "$file" ]]; then
    echo "SKIPPED: required file absent: $file" >&2
    exit 2
  fi
done

negation='\b([Nn]o|[Nn]ot|[Nn]ever|[Nn]either)\b'
exec_flat="$(tr -s '[:space:]' ' ' <"$EXEC")"
prompt_flat="$(tr -s '[:space:]' ' ' <"$PROMPT")"
sentences="$(printf '%s\n%s\n' "$exec_flat" "$prompt_flat" | sed 's/[.!?] /&\n/g')"

in_exec() { grep -qiF -- "$1" <<<"$exec_flat"; }
in_prompt() { grep -qiF -- "$1" <<<"$prompt_flat"; }

missing=()
in_prompt 'single implementation owner' || missing+=("task prompt names one implementation owner")
in_prompt 'Do not hand the task to a' && in_prompt 'second implementation owner' || missing+=("task prompt forbids a second implementation owner")
in_prompt 'Use `/delegate` only for bounded' || missing+=("task prompt limits /delegate to bounded fan-out")
in_prompt 'write and commit `evidence.md`' || missing+=("task prompt keeps evidence ownership")
in_prompt 'then run a fresh' && in_prompt '/audit pr' || missing+=("task prompt keeps the final audit gate")
in_exec '/delegate' || missing+=("execute procedure names /delegate as the implementation mechanism")
in_exec 'the agent that is running it' || missing+=("execute procedure does not name the running agent as the owner")
in_exec 'never becomes a second supervisor' || missing+=("execute procedure no longer bounds /delegate below the owner")
in_exec 'do not create a second implementation owner' || missing+=("execute procedure no longer forbids a second implementation owner on resume")
in_exec 'Ownership is a **role**, not a terminal' || missing+=("execute procedure no longer states ownership is a role, not a terminal topology")

in_exec 'workers perform the tracked implementation edits' || missing+=("execute procedure no longer sends tracked implementation edits to bounded workers")
in_exec 'before the owner performs acceptance' || missing+=("execute procedure no longer orders worker implementation before owner acceptance")
in_prompt 'perform every tracked implementation edit' || missing+=("task prompt no longer sends tracked implementation edits to bounded workers")
in_prompt 'before you perform acceptance' || missing+=("task prompt no longer orders worker implementation before owner acceptance")

in_exec 'direct owner edit requires an explicit operator exception recorded in `progress.txt` before the edit' \
  || missing+=("execute procedure no longer requires a recorded operator exception before a direct owner edit")
in_prompt 'record the explicit operator exception in `progress.txt` before the edit' \
  || missing+=("task prompt no longer requires a recorded operator exception before a direct owner edit")

in_exec 'never writes `prd.json` or `progress.txt`' || missing+=("execute procedure lets a worker write prd.json or progress.txt")
in_prompt 'A worker never updates `prd.json` or `progress.txt`' || missing+=("task prompt lets a worker write prd.json or progress.txt")

in_exec 'Same session by default' || missing+=("execute procedure no longer defaults to the same session")
in_exec 'Ownership transfers only when the operator requests another session' || missing+=("execute procedure no longer limits transfer to operator request")
in_exec 'originating advisor stops dispatching work' || missing+=("execute procedure no longer stops the originating advisor before a transfer")
in_exec 'acknowledges ownership' || missing+=("execute procedure no longer requires the receiving advisor to acknowledge ownership")
in_prompt 'Continue in this session by default' || missing+=("task prompt no longer defaults to the same session")
in_prompt 'Transfer ownership only when the operator requests another session' || missing+=("task prompt no longer limits transfer to operator request")

direct="$(grep -iE 'implements? (the )?(stories|story|it|them|the plan) (directly|yourself|itself)|(owner|advisor|session) (implements|writes|edits) (the )?(stories|code|implementation) (directly|itself)' <<<"$sentences" | grep -vE "$negation" || true)"
[[ -z "$direct" ]] || missing+=("owner implements directly instead of assigning workers: $direct")

permit_verb='(may|can|should|is allowed to|is permitted to|is free to) (write|edit|make|perform|implement|author)'
permitted="$(grep -iE "\\b(owner|advisor|active session|parent)\\b.{0,40}\\b${permit_verb}\\b.{0,50}\\b(tracked|implementation|edits?|stories|story|code|patch)\\b" <<<"$sentences" \
  | grep -viE "\\b(never|not|no|neither|without|unless)\\b.{0,30}\\b${permit_verb}\\b" || true)"
[[ -z "$permitted" ]] || missing+=("the owner is permitted to write implementation edits without an operator exception: $permitted")

forced="$(grep -iE '(hand ?off|handoff prompt|transfer)[^.]{0,60}\b(is )?(required|mandatory)\b|(must|always|should) (hand ?off|transfer|provide a hand ?off|include a hand ?off)|requires? (a )?(hand ?off|transfer)' <<<"$sentences" | grep -vE "$negation" || true)"
[[ -z "$forced" ]] || missing+=("a handoff or transfer is made mandatory: $forced")

concurrent="$(grep -iE '(both|two|each|either|every) (advisors?|owners?|sessions?)[^.]{0,80}(continue|keep|may|can|resume)[^.]{0,40}dispatch|(continue|keep|may|can|resume)[^.]{0,20}dispatch[^.]{0,60}after (the |an? )?(authorized )?(transfer|handoff)' <<<"$sentences" | grep -vE "$negation" || true)"
[[ -z "$concurrent" ]] || missing+=("more than one advisor may dispatch after a transfer: $concurrent")

retired_spec_build='.oh/scripts/spec-''build.sh'
retired_runner='.oh/scripts/lib/session-''runner.sh'
retired_agent='agent-''build-'
retired_timeout='BUILD_''SESSION_TIMEOUT_MS'
for retired in "$retired_spec_build" "$retired_runner" "$retired_agent" "$retired_timeout"; do
  grep -qF "$retired" "$EXEC" "$PROMPT" && missing+=("retired handoff marker remains: $retired")
done

if (( ${#missing[@]} )); then
  printf 'REGRESSION: single-owner /spec implementation contract broken:\n' >&2
  printf '  - %s\n' "${missing[@]}" >&2
  exit 1
fi

echo 'PASS: the agent running /spec execute owns decisions and gates, bounded workers implement before acceptance, and no second owner, forced handoff, or retired runner remains (prose check only)' >&2
