#!/usr/bin/env bash
# tier: A
# source: issue #988 / ADR #989
# desc: prose check of the advisor-first execution contract in /spec execute, its task prompt, and
#       the /spec skill: bounded workers implement before the owner accepts, a direct owner edit
#       needs a recorded operator exception, the task stays in the same session by default,
#       transfer happens only on operator request with the originating advisor stopping dispatch
#       and the receiver acknowledging ownership, a plan without a handoff prompt is valid, the
#       advisor has no fixed identity, /spec launches no coding-agent process, a worker's completed
#       status is a report rather than acceptance, and the human merge gate stays. This probe
#       inspects instruction text; it does not verify runtime delegation or model settings.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
EXEC="$ROOT/.oh/skills/spec/references/execute.md"
PROMPT="$ROOT/.oh/skills/spec/templates/task-prompt.md"
SPEC="$ROOT/.oh/skills/spec/SKILL.md"
DELEGATE="$ROOT/.oh/skills/delegate/SKILL.md"

for file in "$EXEC" "$PROMPT" "$SPEC" "$DELEGATE"; do
  if [[ ! -f "$file" ]]; then
    echo "SKIPPED: required file absent: $file" >&2
    exit 2
  fi
done

negation='\b([Nn]o|[Nn]ot|[Nn]ever|[Nn]either)\b'
flatten() { tr -s '[:space:]' ' ' <"$1"; }
exec_flat="$(flatten "$EXEC")"
prompt_flat="$(flatten "$PROMPT")"
spec_flat="$(flatten "$SPEC")"
delegate_flat="$(flatten "$DELEGATE")"
delegate_portable="$(awk '/^#+ .*[Pp]reference/{skip=1; next} skip && /^## /{skip=0} !skip{print}' "$DELEGATE" | tr -s '[:space:]' ' ')"
sentences="$(printf '%s\n%s\n%s\n%s\n' "$exec_flat" "$prompt_flat" "$spec_flat" "$delegate_portable" | sed 's/[.!?] /&\n/g')"

problems=()
need() {
  local label="$1" text="$2"; shift 2
  local fragment
  for fragment in "$@"; do
    grep -qiF -- "$fragment" <<<"$text" || problems+=("$label lacks '$fragment'")
  done
}

need execute.md "$exec_flat" \
  'workers perform the tracked implementation edits' \
  'before the owner performs acceptance' \
  'operator exception recorded in `progress.txt` before the edit' \
  'Same session by default' \
  'needs no particular model and no handoff' \
  'Ownership transfers only when the operator requests another session' \
  'originating advisor stops dispatching work' \
  'acknowledges ownership' \
  'Worker delegation never transfers ownership' \
  'This node launches nothing' \
  'never creates the agent that executes it' \
  'human merge gate' \
  'Merge is the human'
need task-prompt.md "$prompt_flat" \
  'perform every tracked implementation edit' \
  'before you perform acceptance' \
  'record the explicit operator exception in `progress.txt` before the edit' \
  'Continue in this session by default' \
  'the task needs no handoff' \
  'Transfer ownership only when the operator requests another session' \
  'stop dispatching work for this task' \
  'acknowledges ownership before it dispatches a worker' \
  'Worker delegation never transfers task ownership' \
  'do not launch another coding-agent process' \
  'Ownership is a role, not a terminal topology' \
  'Never merge the PR'
need spec/SKILL.md "$spec_flat" \
  'before the owner performs acceptance' \
  'operator exception recorded in `progress.txt` before the edit' \
  'Same session by default' \
  'needs no particular model and no handoff' \
  'only when the operator requests another session' \
  'originating advisor stops dispatching work' \
  'acknowledges ownership before it dispatches a worker' \
  'A plan without a handoff prompt is complete' \
  'never launches another coding-agent process' \
  'human merge gate'
need delegate/SKILL.md "$delegate_flat" \
  'completed status is a report, not acceptance'

fixed="$(grep -iE 'advisor[^.|]{0,80}\b(is|are|runs on|runs in|lives in|uses|requires|must use|means|=)\b[^.|]{0,60}\b(Fable|Opus|Sonnet|Haiku|Luna|Astra|GPT|tmux|Herdr|pane|tab|persistent identity|named agent)\b|(owner|advisor)[^.|]{0,40}(requires|needs|must use) (a |the )?(particular|specific|fixed) (model|identity|terminal)' <<<"$sentences" | grep -vE "$negation|operator preference" || true)"
[[ -z "$fixed" ]] || problems+=("the advisor is defined by a fixed model, identity, or terminal: $fixed")

forced="$(grep -iE '(hand ?off|handoff prompt|transfer)[^.]{0,60}\b(is )?(required|mandatory)\b|(must|always|should) (hand ?off|transfer|provide a hand ?off|include a hand ?off)|requires? (a )?(hand ?off|transfer|second session|fresh session)' <<<"$sentences" | grep -vE "$negation" || true)"
[[ -z "$forced" ]] || problems+=("a handoff or transfer is made mandatory: $forced")

concurrent="$(grep -iE '(both|two|each|either|every) (advisors?|owners?|sessions?)[^.]{0,80}(continue|keep|may|can|resume)[^.]{0,40}dispatch|(continue|keep|may|can|resume)[^.]{0,20}dispatch[^.]{0,60}after (the |an? )?(authorized )?(transfer|handoff)' <<<"$sentences" | grep -vE "$negation" || true)"
[[ -z "$concurrent" ]] || problems+=("more than one advisor may dispatch after a transfer: $concurrent")

direct="$(grep -iE 'implements? (the )?(stories|story|it|them|the plan) (directly|yourself|itself)|(owner|advisor|session) (implements|writes|edits) (the )?(stories|code|implementation) (directly|itself)' <<<"$sentences" | grep -vE "$negation" || true)"
[[ -z "$direct" ]] || problems+=("the owner implements directly instead of assigning workers: $direct")

permit_verb='(may|can|should|is allowed to|is permitted to|is free to) (write|edit|make|perform|implement|author)'
permitted="$(grep -iE "\\b(owner|advisor|active session|parent)\\b.{0,40}\\b${permit_verb}\\b.{0,50}\\b(tracked|implementation|edits?|stories|story|code|patch)\\b" <<<"$sentences" \
  | grep -viE "\\b(never|not|no|neither|without|unless)\\b.{0,30}\\b${permit_verb}\\b" || true)"
[[ -z "$permitted" ]] || problems+=("the owner is permitted to write implementation edits without an operator exception: $permitted")

stale="$(grep -iE '(completed status|completion summary|worker'"'"'?s? (summary|report|status)|status of `?completed`?)[^.]{0,60}\b(counts as|is|constitutes|serves as|satisfies|equals|means|proves)\b[^.]{0,40}(acceptance|accepted|verified|passing|passes)|(set|flip|mark)s?[^.]{0,40}`?passes`?[^.]{0,40}(when|after|once|because)[^.]{0,40}(worker|summary|status) (reports|says|claims|returns|completes)' <<<"$sentences" | grep -vE "$negation" || true)"
[[ -z "$stale" ]] || problems+=("a worker's completed status or summary counts as acceptance: $stale")

launches="$(grep -iE '(launch|spawn|start)(es|s)? (a |the |another )?(coding[- ]agent|agent) (process|session)[^.]{0,60}(to|for) (do|perform|run|implement)' <<<"$sentences" | grep -vE "$negation" || true)"
[[ -z "$launches" ]] || problems+=("/spec launches a coding-agent process: $launches")

if (( ${#problems[@]} > 0 )); then
  echo "REGRESSION: advisor-first execution contract is broken; issues:" >&2
  printf '  - %s\n' "${problems[@]}" >&2
  exit 1
fi

echo "PASS: /spec keeps one advisor deciding and accepting, workers implementing first, same-session execution by default, operator-only transfer, no fixed advisor identity, no launched agent, and the human merge gate (prose check only)" >&2
exit 0
