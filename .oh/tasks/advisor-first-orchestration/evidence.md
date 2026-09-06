# Evidence: advisor-first orchestration (#988, ADR #989)

Branch `feat/988-advisor-first-orchestration`, PR #991. Content commits: policy `50515549`+`17a510de`+`ae296157`, docs `aa001fa8`+`7ed847d3`+`14127d7c`, probes `758457f2`+`8cd488e5`, knowledge `ceced13c`; eval records and this document follow them. The independent review (T5) of `72548bc4` returned five blocking findings; their dispositions are in section 3 and the repairs are the two commits `ae296157` (T1) and `8cd488e5` (T2). A fresh review ran on the repaired head (see "Audit correlation").
Audit correlation: `AUDIT_RUN_ID` and native verdicts are appended in "Audit correlation" below after the audit routes run.

## 0. Why this is better than not doing it

Before: five active instruction surfaces told the build owner to implement directly and treated bounded workers as optional. `AGENTS.md`, `/spec execute` steps 3–4, the rendered task prompt, `/delegate` ("inherit the parent model; do not route routine work to a weaker tier"), and the local `/plan` skill all agreed on that default. The operator's advisor-first request could only be met by a handoff message, and a handoff cannot override contradictory canonical instructions.

After: one execution model in all five surfaces. The active session advises, decomposes, dispatches bounded workers, inspects evidence, and accepts. Workers own tracked edits. A direct owner edit needs a recorded operator exception. Same session by default; transfer only on operator request. Model policy honors explicit operator selections after a native capability check and blocks on an unsupported control instead of substituting.

This build ran under the new contract before it landed: every written policy, probe, docs, and knowledge edit in this PR came from a bounded worker (T1–T3) and was accepted by the advisor after re-running the checks. The advisor committed execution-state artifacts (`prd.md`, `prd.json`, `progress.txt`, `delegate-graph.json`, `delegate-log.txt`, `eval-result.json`, this file), the `/eval` scoreboard `.oh/evals/RESULTS.md`, and one byte-identical baseline copy of the untracked `.oh/skills/plan/SKILL.md` in the scaffold commit so T1 could reconcile it. No operator exception covers those two tracked files; the deviation is disclosed here and in `progress.txt`.

Observed in this run: the `Explore` built-in reported `claude-opus-5[1m]` although the call omitted `model`, so a provider built-in can carry its own model definition. Inheritance is not assumed for any worker whose model was not observed.

Cost paid, observed: five worker dispatches, three repair round-trips (one duplicate list number, one changelog section/voice, one changelog length), one worker interruption by a provider limit and resume. Harness-reported subagent usage: T1 ~186k tokens, T2 ~141k plus an uncounted interrupted partial, T3 ~128k, T4 ~69k; the parent's own usage was not exposed to the session. Benefit in token or time terms: **not claimed** — the operator declined a paid baseline-versus-candidate comparison (see D10).

## 1. What the plan asked for

The operator asked for the harness's operating instructions to make the active session an advisor that assigns bounded implementation and decides acceptance, without requiring a handoff or a particular model; for future plans to carry executable worker briefs covering their Definition of Done; for Claude routing to honor Fable advisor / Opus thinking-off low workers / never Sonnet only where the native surface supports it, with unsupported controls blocking rather than degrading; for probes, docs, glossary, RFC index, and CHANGELOG to follow; for an ADR superseding #929's direct-implementation default without rewriting history; and for any efficiency claim to be measured or absent.

## 2. What was built

### Root (D1)

```
$ wc -c AGENTS.md
9478 AGENTS.md
$ bash .oh/evals/probes/agents-identity-contract.sh; echo rc=$?
PASS: AGENTS.md owns product identity, glossary, code truth, and public-doc surfaces without procedure catalogs
rc=0
$ bash .oh/evals/probes/context-tier-size-budget.sh; echo rc=$?
PASS: AGENTS.md is 9478 B of 9500 B budget (~2369 tokens)
rc=0
```

New section `## One advisor, bounded workers` with links to `.oh/skills/delegate/SKILL.md` and `.oh/skills/spec/SKILL.md`; new glossary term **advisor**. Funded by removing sentences that duplicated non-negotiables #3–#5 and the lifecycle paragraph. All five `### N.` sections unchanged. `CLAUDE.md` still a symlink.

### One execution model (D2, D7, D8)

Files: `.oh/skills/spec/SKILL.md`, `references/execute.md`, `references/plan.md`, `templates/task-prompt.md`, `.oh/skills/delegate/SKILL.md`, `.oh/skills/plan/SKILL.md` (added to the tree from the untracked local baseline). T1's contract review listed 33 direct-implementation or inheritance instructions replaced; four probe-pinned literals deliberately kept with re-worded surroundings. `references/plan.md` gained the `Orchestration preserved` field and the orchestration-transfer check.

Actual invocation trace for D2: this task reached worker dispatch (T1, `delegate-log.txt` W1 line) before any tracked implementation edit; `git log --format='%s' 50515549..HEAD` shows every implementation commit was authored by a worker and integrated by cherry-pick.

### Model policy and native evidence (D3, D4)

Requested versus observed, from `delegate-graph.json`:

| Worker | Requested | Native surface finding | Observed | Provenance |
|---|---|---|---|---|
| Advisor | Fable 5.1, operator effort | n/a | `claude-fable-5-1` | runtime system prompt |
| T1 policy (H) | inherit (Fable) | `model` omitted | unknown (worker did not report) | Agent call |
| T2 tests (H) | inherit (Fable) | `model` omitted | unknown; the 429 error named `claude-fable-5-1` as the model sent | Agent call; provider error text |
| T3 docs (L) | Opus, thinking disabled | no per-worker thinking control exists | `claude-opus-5[1m]`; reasoning unknown | worker self-report |
| T4 checks (L) | Opus, thinking disabled | no per-worker thinking control exists | `claude-opus-5[1m]`; reasoning unknown | worker self-report |
| T5 review (H) | inherit (Fable), read-only | `Explore` built-in did not inherit | `claude-opus-5[1m]`; reasoning unknown | worker self-report |
| T5 fresh review (H) | `fable` passed explicitly, read-only | `Explore` built-in with `model` set | see "Audit correlation" | worker self-report |

Capability gate: the Agent tool schema visible to this session carries `model` with aliases `sonnet`, `opus`, `haiku`, `fable` and no `thinking` or `effort` parameter. The Claude Code documentation read on 2026-09-06 (`code.claude.com/docs/en/tools-reference.md`, `sub-agents.md`, `model-config.md`) lists no per-subagent thinking or effort control. "Opus with thinking disabled" therefore could not be confirmed; T3 and T4 were BLOCKED before dispatch and the operator was asked. The operator authorized "Opus, reasoning unobserved". Sonnet was never passed. `max` was never passed. Luna/Max and Astra/high: no native surface in this session exposes those models; recorded as a capability gap, no invented parameter passed.

### Bounded, isolated dispatch (D5)

`delegate-graph.json` and `delegate-log.txt` record five tasks: T1 alone in W1 in the integration worktree; T2 and T3 in W2 in separate worktrees (`feat/988-t2-probes`, `feat/988-t3-docs`) off `17a510de`, integrated by cherry-pick; T4 in W3 in a disposable `--shared` clone; T5 in W4 read-only. Workers stayed flat; none pushed, opened a PR, or wrote `prd.json`/`progress.txt`. Coupled policy edits stayed with one continuing worker (T1, one repair round). T3 continued through three assignments as one worker.

### Independent, commit-specific verification (D6)

Real instance: T3's first changelog entry was 303 characters; the suite on `762c0ec3` reported `changelog-entry-length REGRESSION`; the advisor rejected the wave, routed the repair to T3 (`9fcc945d` → `14127d7c`), and the probe returned to PASS. Seeded instance (T4, section C): with a Sonnet-routing fault applied, a `prd.json` copy marking a story passing on "worker reported done" failed the `jq all(.passes)` gate and the probe exited 1. A worker's completed status set no story to passing in this run; the advisor flipped `passes` only after re-running checks.

### Probes (D9)

```
$ for p in delegate-model-effort-policy delegate-worker-boundary spec-single-owner roles-are-skills advisor-execution-contract plan-orchestration-contract; do bash .oh/evals/probes/$p.sh >/dev/null 2>&1; echo "$p rc=$?"; done
delegate-model-effort-policy rc=0
delegate-worker-boundary rc=0
spec-single-owner rc=0
roles-are-skills rc=0
advisor-execution-contract rc=0
plan-orchestration-contract rc=0
```

Fault injection: T2 demonstrated 33 cases (REGRESSION then restored PASS) in `scratchpad/t2-fault-injection.log`; T4 independently re-ran 11 named cases (missing delegation, Sonnet substitution, off-to-low, `thinking: max`, stale acceptance, overlapping writers, forced handoff, hard-coded advisor identity, concurrent ownership, incomplete brief, forced handoff in plan) in `scratchpad/t4-checks.log`, all caught. Every probe's `# desc:` states it inspects instruction text and does not verify runtime model selection.

Full suite on `8cd488e5`, the content head after the review repairs (recorded in `eval-result.json`):

```
ran 143 probe(s); runner exit 0; PERSISTENT RED (3) — not gating, no green->red delta
  curl-bash-safe-alternatives  ERROR       python3: command not found (rc 127)
  oh-config-surfaces           REGRESSION  oh.json is not valid JSON
  skills-vendored              REGRESSION  cc-safety-net binary not found on PATH
```

All three reproduce on base `9261d512` in this environment (verified in a detached clone).

### Documentation and records (D11)

`docs/rfcs/README.md`: new `#989` Draft row; `#929` keeps `Accepted` with the sentence "[#989] supersedes its optional-worker, direct-implementation default." `docs/glossary.md`: new **advisor** entry; `agent` and `session` entries reworded; the five probe-pinned strings intact. `.oh/tasks/README.md`: advisor ownership sentence plus `delegate-graph.json`/`delegate-log.txt` rows. `CHANGELOG.md`: four Unreleased entries, all ≤ 250 chars (`changelog-entry-length` PASS). `bash .oh/scripts/link-providers.sh --check` → `Providers OK`. STE: 0 findings on changed lines in every worker report; pre-existing findings on untouched lines left alone. Public docs (`mifunedev/openharness-web`): not changed in this PR; see unverified.

### Knowledge impact (step 6)

```
$ bash .oh/skills/wiki/scripts/knowledge-impact.sh --changed <22 changed paths>
NEEDS-REVIEW  plan-vs-built-reconciliation  declared sources are in the changed set: .oh/skills/spec/references/execute.md
FRESH         (9 other source pages)
NOT-APPLICABLE (15 pattern pages — provenance immutable)
```

| Page | State | Action |
|---|---|---|
| `plan-vs-built-reconciliation` | UPDATED | 12 `execute.md` citations remapped, summary reworded to the advisor-first owner, `updated: 2026-09-06`, `verified_at: 14127d7c…` (commit `ceced13c`, by T3) |
| all other `source/` pages | NOT-AFFECTED (no declared source in the changed set) | none |
| all `patterns/` pages | NOT-AFFECTED (immutable provenance) | none |
| new advisor-first page | NOT CREATED | the canonical skills and ADR #989 are the source; a page now would be a second description with no consumer |

`bash .oh/evals/probes/wiki-readme-index.sh` → PASS after the index regeneration.

### Reversibility (D12)

T4 section E: `git revert --no-edit` of the seven policy/probe/docs commits together applied with no conflicts; the six original probes then passed on the rollback branch and on base `9261d512`. Root checkout `/home/sandbox/harness` untouched (its unrelated modifications to `.gitignore`, `.claude/settings.json`, `.oh/evals/RESULTS.md`, `skill-impact.md`, and the untracked `.oh/skills/plan/` preserved); the AGRO worktree `feat/940-agro-compat-foundation` untouched; the source plan not staged.

### Independent review findings and dispositions (T5 on `72548bc4`)

| Finding | Disposition |
|---|---|
| BL-1 `execute.md` and the task prompt kept "only for bounded, disjoint worker tasks", readable as permission to keep coupled work in the owner | T1 repair `ae296157`: "disjoint" now describes one dispatch shape; coupled work names one continuing worker; pinned prefix intact; probes 0 |
| BL-2 T5 ran on `claude-opus-5[1m]` while its record said inherit Fable | Records corrected (`delegate-graph.json`, matrix above); fresh review dispatched with `model: fable` explicitly; T1/T2 model stays unknown |
| BL-3 eval result and check transcript keyed to older commits; audit pending | Suite re-run on the repaired head and recorded in `eval-result.json`; audit run on the pushed head, verdicts below |
| BL-4 advisor-committed `.oh/skills/plan/SKILL.md` baseline copy and `RESULTS.md` refreshes omitted from the ownership statement | Section 0 corrected; disclosed in `progress.txt`; no operator exception claimed |
| BL-5 probes passed on `…Sonnet when no Opus…` and `The owner may write tracked implementation edits…` | T2 repair `8cd488e5`: negation must govern the Sonnet token; new permission scan; 7 injection cases in `t2-fault-injection.log` "repair round" |
| NB-1 stale heading | T1 repair: "Re-ground before you assign work" |
| NB-2 the delegate skill's L preference (Opus, thinking off) blocks every L dispatch until an operator decision | Left as written on purpose: a standing change to the operator's preference is the operator's call, not the build's; recorded in section 4 |
| NB-3 `.oh/skills/audit/references/harness.md` and `.oh/skills/strategic-proposal/SKILL.md` still route workers to Sonnet | Outside the approved T-scope; disclosed in section 4, not changed |
| NB-4 preference-heading exemption is broad | Accepted risk; disclosed |
| NB-5 root lost two duplicate bullets and the progressive-disclosure sentence | Bullets duplicate non-negotiables #3/#5; the disclosure sentence is restated by "Read the nearest directory README"; accepted |
| NB-6 fallback check lacked a negation filter | T2 repair `8cd488e5` |
| NB-7 literal pinning fragility | Accepted; the probes flatten whitespace and scan sentences, paraphrase remains a known limit |
| NB-8 uncommitted delegation records at review time | Committed with this document |
| NB-9 "claimed, unmeasured" wording | Reworded to "not claimed" |
| NB-10 `prd.md` checkboxes unticked | `prd.json` is the completion authority; left |

## 3. Where they diverged, and why

- **L binding.** The plan's L configuration (Opus, thinking disabled) could not be verified natively. Per the plan's own rule the assignments blocked and the operator chose "Opus, reasoning unobserved". Thinking-off is not claimed anywhere.
- **D10 comparison not run.** The operator declined a paid comparison. No efficiency claim is made (see 0).
- **Small-task no-worker exemption removed** from `/plan` rather than softened; under the new contract a small implementation task uses one worker, and only plan-only or factual requests keep synthesis in the session. Consistent with the plan's "a small task can use one worker".
- **Knowledge page rewrites route to a worker** (execute.md step 6) — the plan classifies documentation as tracked implementation edits; applied consistently.
- **`.oh/skills/plan/SKILL.md` added to the tree.** The plan named it as T1's file but it was untracked at the root. The baseline copy went into the scaffold commit so T1's reconciliation diff stays reviewable.
- **Base moved** from `9a479575` to `9261d512` between planning and execution; the intersection with grounded paths was `docs/rfcs/README.md` and `CHANGELOG.md`, both T3's files, re-read at the new base.
- **ADR text.** The ADR issue body opens with "Advisor-first execution"; T3 wrote "The advisor-first execution default:" in the index row to satisfy the lowercase-token rule the probes enforce under `.oh/skills/` (docs are not scanned, but the vocabulary rule was applied uniformly).

## 4. What remains unverified

- **Effective worker reasoning settings.** No surface exposes them; every `reasoning` cell reads unknown. Probes prove instruction shape, not runtime routing.
- **Three persistent reds** (`curl-bash-safe-alternatives` ERROR, `oh-config-surfaces`, `skills-vendored`) are environment-caused and pre-existing on base; carried forward, not fixed here.
- **T1/T2 observed model** is unknown; both were dispatched with `model` omitted (inherit). Only the provider's 429 error text names `claude-fable-5-1` for T2.
- **Efficiency.** No matched comparison; no token, cost, or time claim is made.
- **Requested-transfer behavior** was tested as a prompt-contract check (T4 section D) and by probes (concurrent-ownership scan); a live two-session transfer was not exercised in this build.
- **Public docs** (`mifunedev/openharness-web`) may still describe the old direct-implementation default. This PR does not audit or change that repository, and no external issue exists for it; the D11 public-guidance review stays open for the operator.
- **Other declared sources of `plan-vs-built-reconciliation`** (`reviewer-evidence-doc.md`, `spec-ready-finalization.sh`) were not in this diff and were not re-cited; the page's prior `verified_at` commit is not in this repository's history, so their freshness relative to that page was not re-established here.
- **STE findings on untouched lines** in the edited skill files (150 pre-existing on `execute.md` and siblings) remain.

## Audit correlation

Pending: filled after `/audit implementation` and `/audit pr` run against the pushed head.
