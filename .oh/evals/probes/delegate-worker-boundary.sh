#!/usr/bin/env bash
# tier: A
# source: ADR #929 — subagents are a bounded execution primitive, not a project-role ontology;
#         supersedes rl-delegation-write-worker (#57), whose read-only-worker lesson is kept here;
#         extended by issue #988 / ADR #989 (judgment stays with the advisor, edits go to workers)
# desc: prose check: /delegate prefers the active session for context-sharing phases and judgment,
#       sends tracked implementation edits to bounded provider-native workers (coupled work to one
#       continuing worker), isolates parallel writers and serializes shared-file work, warns that a
#       read-only worker writes nothing, and names no nonexistent project agent roles
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SKILL="$ROOT/.claude/skills/delegate/SKILL.md"

if [[ ! -f "$SKILL" ]]; then
  echo "SKIPPED: delegate skill absent: $SKILL" >&2
  exit 2
fi

fail() { echo "REGRESSION: $*" >&2; exit 1; }

grep -q '^## When a worker is justified$' "$SKILL" || fail "/delegate has no worker-justification section"

boundary="$(awk '/^## When a worker is justified$/{f=1; next} f && /^## /{exit} f{print}' "$SKILL")"
[[ -n "${boundary//[[:space:]]/}" ]] || fail "the worker-justification section is empty"

missing=()
grep -qiF 'self-contained' <<<"$boundary"        || missing+=("the self-contained test")
grep -qiF 'parallelism' <<<"$boundary"           || missing+=("parallelism as a reason")
grep -qiF 'isolated context' <<<"$boundary"      || missing+=("isolated context as a reason")
grep -qiE 'restricted tools|tool .{0,12}restriction' <<<"$boundary" || missing+=("restricted tools as a reason")
grep -qiF 'verbose disposable output' <<<"$boundary" || missing+=("verbose disposable output as a reason")
grep -qiF 'share substantial context' <<<"$boundary"  || missing+=("the keep-it-in-the-active-session rule")
grep -qiF 'iterative refinement' <<<"$boundary"       || missing+=("the iterative-refinement exception")
(( ${#missing[@]} == 0 )) || fail "worker boundary omits: ${missing[*]}"

boundary_flat="$(tr -s '[:space:]' ' ' <<<"$boundary")"
missing=()
grep -qiF 'active session' <<<"$boundary_flat" || missing+=("the active session as the seat of judgment")
grep -qiE 'goal interpretation, architecture, decomposition, verification, (and )?acceptance' <<<"$boundary_flat" \
  || missing+=("goal interpretation, architecture, decomposition, verification, and acceptance named together as judgment kept in the active session")
grep -qiF 'tracked implementation edits' <<<"$boundary_flat" || missing+=("tracked implementation edits assigned to a worker")
grep -qiF 'one continuing worker' <<<"$boundary_flat"       || missing+=("coupled implementation kept with one continuing worker")
(( ${#missing[@]} == 0 )) || fail "worker boundary omits: ${missing[*]}"

negation='\b([Nn]o|[Nn]ot|[Nn]ever|[Nn]either)\b'
skill_flat="$(tr -s '[:space:]' ' ' <"$SKILL")"
skill_sentences="$(printf '%s\n' "$skill_flat" | sed 's/[.!?] /&\n/g')"
grep -qiF 'Parallel writers get isolated worktrees' <<<"$skill_flat" || fail "/delegate no longer gives parallel writers isolated worktrees"
grep -qiF 'Serialize shared-file work' <<<"$skill_flat"             || fail "/delegate no longer serializes shared-file work"
overlap="$(grep -iE 'writers? (may|can|should|must) share|shares? (one|a|the same) (worktree|checkout|branch)|(same|shared|overlapping) files?[^.]{0,40}(in parallel|concurrently|simultaneously|at the same time)' <<<"$skill_sentences" | grep -vE "$negation" || true)"
[[ -z "$overlap" ]] || fail "/delegate lets parallel writers overlap on shared state: $overlap"

worker_block="$(awk '/^Worker configuration:/{f=1} f{print} f && /^[[:space:]]*$/{exit}' "$SKILL")"
keyres_block="$(awk '/^### Key Resources/{f=1; next} f && /^(### |## )/{exit} f{print}' "$SKILL")"
region="$(printf '%s\n%s\n' "$worker_block" "$keyres_block")"
[[ -n "${region//[[:space:]]/}" ]] || fail "neither the Worker configuration block nor Key Resources could be located"

missing=()
grep -qi 'read-only' <<<"$region"        || missing+=("the read-only-worker warning")
grep -qi 'general-purpose' <<<"$region"  || missing+=("the general-purpose recommendation for write workers")
grep -qi 'built-in' <<<"$region"         || missing+=("the provider built-in worker vocabulary")
(( ${#missing[@]} == 0 )) || fail "the worker-configuration region omits: ${missing[*]}"

stale="$(grep -nE '\.(oh|claude|codex|pi)/agents/[A-Za-z0-9_-]+\.md' "$SKILL" || true)"
[[ -z "$stale" ]] || fail "/delegate still cites project-agent definition files: $stale"

roles="$(grep -nEi 'subagent_type: *(implementer|critic|pm|council)|`(implementer|critic|pm|council)`' "$SKILL" || true)"
[[ -z "$roles" ]] || fail "/delegate still names retired project-agent roles as worker types: $roles"

echo "PASS: /delegate keeps judgment in the active session, sends tracked edits to bounded isolated workers, keeps the read-only warning, and names no project agents (prose check only)" >&2
