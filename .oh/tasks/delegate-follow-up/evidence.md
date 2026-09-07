# Evidence — delegate-follow-up

- **PR**: #1004 (mifunedev/openharness, base `development`) · **Branch**: `skill/1003-delegate-follow-up`
- **Audit run**: `audit-20260907T194250Z-3600847` · **Verdict**: `AUDIT-PASS` (state `complete`)
- **Approved baseline**: `56ab2bab894e43073bf79edc43f70fe3ddd6d6de` · **Audited head**: `8ba028518716f28fb7c8d84fd730002528dcadcd`
- **Predecessor**: #988 / PR #991, merged at `e90bbed8`

## Why this is better

Before this change, `/delegate` told the advisor to release a wave's dependents on *"completed task summaries"* — a worker's own report — and to *"treat `completed` tasks as done"* on resume. A worker could hand back a defective artifact and the next wave would consume it unread. This run produced that exact failure shape as a live observation: a bounded worker returned a `sum.sh` that printed **9** for `2 3 5` while **exiting 0**. Under the old text the zero exit and the report were the whole story and the dependent would have started. Under the new text the dependent stayed blocked until the advisor ran the task's own verification, the defect was routed back to the same worker, and release waited for a re-verified artifact.

The second cost was duplicate work: resume re-ran `pending`, `FAIL`, and `BLOCKED` and said nothing at all about `running`. An interrupted delegation therefore had no defined recovery, and the natural reading — re-run what is not finished — dispatches a second writer onto files a live worker still holds.

**This PR's own delegation demonstrated that hazard for real.** The independent reviewer found that the ledger this PR shipped still recorded T1 as `status: pending` with no artifacts, *after* T1 had been dispatched, returned, and been accepted. A resuming advisor reading that file would have dispatched a second writer over already-accepted work. That is not a hypothetical: it is the failure this change exists to prevent, found inside the change itself, and it was fixed by reconciling the ledger against real state.

Cost paid: **+201 / −40 lines** across three files (the skill and two probes); no new machinery, no scheduler, no new lifecycle, no new file. The probe suite is unchanged in size at 145 probes. **No efficiency or token-savings claim is made — none was measured.**

## What the plan asked for

Close the four instruction gaps the advisor-orchestration work left in `.oh/skills/delegate/SKILL.md`, and nothing else: release dependents only on accepted artifacts; size tasks by what is useful rather than by maximum worker count; reconcile interrupted `running` tasks instead of skipping them; and remove an undefined Memory Protocol and an after-planning execution trigger while keeping `--dry-run` read-only. Preserve every contract #991 merged. Leave the separate deferred register untouched and dispositioned.

## What was built

**Acceptance gates release (US-001).** Step 5b now records the advisor's acceptance as the `status` field's meaning — *"the advisor's record, never a worker's claim"* — with the worker's claim kept in `summary`, `completed` written only after the advisor has read the artifact references and run the task's `Verification` with real exit statuses, a worker that reported done but is not yet accepted held at `running`, and the decision appended to `delegate-log.txt`. Step 5d now reads *"Release a dependent only on accepted artifacts… A dependency that is `running`, `FAIL`, or `BLOCKED` is not accepted: its dependents stay `BLOCKED`."* Step 6's integrated validation is preserved as *"a separate, still-required check."* No new state was introduced.

**Useful sizing (US-002).** The core principle became *"dependency order is absolute. Size each task for usefulness, not for a worker count."* The decomposition rule became *"Complexity, briefing overhead, shared context, and verification cost decide a useful task boundary; a further split is not a default, and one continuing bounded worker is a valid answer."* Two fields the approved plan required were **missing entirely** from the dispatch record and were added: `Search / output limits` and `Stopping condition`. The max-5-per-wave cap and the `Max depth` / `Max children per level` / `Step budget` triple are unchanged and are now pinned by probe.

**Resume reconciliation (US-003).** Step 4 now reconciles every task against real state: `pending`/`BLOCKED` re-run; `FAIL` reads current artifacts and retries **only the incomplete scope**; `running` inspects the persisted native worker reference and current artifacts, reconnects to a live worker and *"never spawn[s] a duplicate for it"*, and validates an ended worker's artifacts before accepting, resuming, or retrying only what is incomplete; `completed` holds only while its evidence still describes the required artifact revision; unknown status or unestablished provenance is reported as ambiguity that *"blocks every write to the affected paths and never authorizes a second writer."*

**Resolved references and no accidental trigger (US-004).** `grep -c 'Memory Protocol'` is **0**. The frontmatter no longer triggers on `/prd` or plan creation and now states that writing, reading, or finishing a plan *"is not a trigger and authorizes no dispatch."* The Decision Flow diagram branches `D --> F{--dry-run?}` before `F -->|No| E["Step 4: Write run ledger…"]`, matching the prose, and the dry-run path is stated as writing neither file, dispatching no worker, and creating no execution state.

**Probes (US-005).** Both probes gained checks for all four contracts. Every added check was fault-injection tested.

### Actual Knowledge Impact

`knowledge-impact.sh --changed` on the real diff reported **zero** `NEEDS-REVIEW` pages. Union with the planner's prediction:

| Page | State | Reason |
|---|---|---|
| `plan-vs-built-reconciliation` | `NOT-AFFECTED` | Predicted by the planner, but this diff changes none of its declared sources (`execute.md`, `reviewer-evidence-doc.md`, `spec-ready-finalization.sh`, its raw snapshot). Its pre-existing `NEEDS-REVIEW` against upstream `execute.md` changes predates this PR and is **not** resolved here; `verified_at` was deliberately **not** advanced, because advancing it without re-reading every declared source launders staleness. Disclosed under *unverified*. |
| every other `kind: repo` page | `NOT-AFFECTED` | No declared source is in the changed set. |
| every `kind: external` and `kind: pattern` page | `NOT-AFFECTED` | Provenance is immutable; freshness does not apply. |

`bash .oh/evals/probes/wiki-readme-index.sh` → exit 0.

## Where it diverged from the plan, and why

1. **A blocking defect was found in this PR's own delegation ledger, not in the code.** The independent review's sharpest finding (A-1/A-8) was against the advisor, not T1. It is fixed and recorded rather than quietly amended.
2. **One PRD criterion was false as written and was corrected.** It claimed the dispatch record *"still requires"* search/output limits and a stopping condition. Independent review established that neither field existed at the approved base. The criterion now says the fields are **added** by this change, and `prd.md`/`prd.json` were amended.
3. **A disposable test worker was briefed to make a knowingly false completion claim, and refused.** Setting up the acceptance-ordering exercise, the advisor instructed a worker to assert *"TA completed — sum.sh written and working"* while knowing the artifact was defective, and to suppress the defect. The worker declined, on the grounds that a false claim to the agent that must act on it is not something it would produce. It was right; the brief was a bad call. The exercise did not need it — what is under test is the advisor's ordering, not the worker's honesty — and it was completed with the worker's real, non-vouching report. Recorded in full rather than dropped.
4. **T1 deviated from a repair instruction, deliberately and correctly.** The token-bound negation fix was scoped to R5(c); T1 applied it to R5(b) as well, because leaving (b) on a bare literal would have reproduced the same false-`REGRESSION` defect (c) was meant to remove. Accepted.
5. **No `simplify-rounds.json` was written.** Per `[[pattern-spec-simplify-round-seeded-non-reducing]]`, seeding the round record from the audit's own measurement guarantees a non-reducing round and ends the loop before it starts. The record was left absent, which the driver handles, so gate 5 turned on the review alone.
6. **The three simplicity findings were disclosed, not applied.** All three are non-blocking; each trades a real (if redundant) guarantee or a stricter check for 2–5 lines. Listed below as open residual.

## What remains unverified

- **`shellcheck` did not run** — it is not installed in this sandbox. Recorded as a gap, not a pass. Non-gating: CI's shellcheck globs cover `.devcontainer`, `.oh/install`, `.oh/scripts`, `.oh/skills/audit/scripts`, `.oh/skills/escalate/scripts` and hooks, **not** `.oh/evals/probes`. `bash -n` is clean on both probes and 48 executed injections stand in for it.
- **Three paraphrase blind spots survive, and are deferred by the plan's non-goals.** The reviewer demonstrated that all three pass both probes today: an explicit *"when a wave is time-critical, the advisor may release a dependent on the worker's reported completion"* escape clause; a reworded maximize-parallelism slogan (*"split every task as finely as the dependency graph allows and run the largest possible number of workers at once"*); and a duplicate-writer escape clause. Broad probe hardening is an explicit non-goal of the approved plan. **These are real holes in the oracle, not theoretical ones.**
- **R4's diagram check hard-codes the mermaid node ids `D`, `E`, `F`.** A pure rename with correct topology would fail falsely. It fails closed and names the missing edge, so it is disclosed rather than fixed.
- **Everything in `SKILL.md` is prose, not an enforced gate.** The probes assert instruction text. The D2/D4 rows show a compliant advisor doing the right thing; nothing in the system forces it. Finding A-1 is precisely what that gap looks like in practice.
- **`plan-vs-built-reconciliation` remains `NEEDS-REVIEW`** against upstream `execute.md` changes that predate this PR. Not resolved here; `verified_at` deliberately not advanced.
- **The approved plan is not carried by the PR.** `.oh/plans/` is gitignored, so `.oh/plans/delegate-follow-up/plan.md` is unavailable to a reviewer without host filesystem access. `prd.md` carries its substance.
- **One D4 case is fixture-based.** Case (d), unknown native status, was exercised as a constructed graph row (`status: running`, `nativeWorkerId: null`), not as a live native observation. The other four are live.
- **`skills-vendored` is red** and stays red: `cc-safety-net binary not found on PATH (expected @1.0.6)`. Reproduced identically on the approved base, so it is environmental and not attributable to this diff.
- **`netAdded` reported by gate 5 is 1056**, which counts the whole task folder. The implementation itself is +201/−40 across three files.

## Proof by gate

| Gate | What was checked | Observed | Result |
|------|------------------|----------|--------|
| 1 Task graph | `prd.json` stories + artifact contract | `task-graph: 7/7 stories pass` | PASS |
| 2 Regression floor | `/eval` runner exit + delta | `reused eval-result.json for HEAD 8ba02851 (runnerExit=0)`; content-head rule applied | PASS |
| 3 Promotable / CI | focused classifier JSON | `promotable:true, evidenceComplete:true, ci:"PASS", mergeable:"MERGEABLE", mergeStateStatus:"CLEAN"` | PASS |
| 4 UI | browser criteria | `gate4: not applicable` — no story declares browser verification | N/A |
| 5 Slop | net lines + changed-function CCN | `netAdded 1056 / netRemoved 40`, `tsOverCcn: []`, `tool: lizard n/a`; 3 findings, none blocking open | PASS |

**Gate 3 was classified against the audited tree, deliberately.** Per `[[pattern-audit-remote-head-verdict]]`, the audited head was pushed *before* the implementation audit ran, so `headRefOid` equals the local `HEAD` (`8ba02851`) and the CI evidence describes this tree rather than the scaffold commit.

## Observed output

```text
$ bash .oh/skills/eval/run.sh          # approved base 56ab2bab, disposable detached worktree
ran 145 probe(s)
137 PASS · 7 SKIPPED · 1 REGRESSION (skills-vendored, delta=unchanged)
BASE_EVAL_EXIT=0

$ bash .oh/skills/eval/run.sh          # final implementation head
ran 145 probe(s)
138 PASS · 6 SKIPPED · 1 REGRESSION (skills-vendored, delta=unchanged)
FINAL_EVAL_EXIT=0

# row-state diff, base -> integrated:
CHANGED: drift-check-cron-staleness-glob SKIPPED -> PASS      (an improvement; no green->red anywhere)
```

```text
$ for p in delegate-worker-boundary advisor-execution-contract delegate-model-effort-policy \
           spec-single-owner plan-orchestration-contract roles-are-skills skill-paths \
           skills-task-tool-coupling spec-family-contract builder-skill-consolidation \
           audit-run-root-contract wiki-readme-index; do bash .oh/evals/probes/$p.sh; done
delegate-worker-boundary         exit=0        skill-paths                      exit=0
advisor-execution-contract       exit=0        skills-task-tool-coupling        exit=0
delegate-model-effort-policy     exit=0        spec-family-contract             exit=0
spec-single-owner                exit=0        builder-skill-consolidation      exit=0
plan-orchestration-contract      exit=0        audit-run-root-contract          exit=0
roles-are-skills                 exit=0        wiki-readme-index                exit=0

$ bash .oh/scripts/link-providers.sh --check   → exit 0
$ bash -n on both edited probes                → exit 0
$ git diff --check                             → exit 0
$ command -v shellcheck                        → NOT INSTALLED (gap)
```

**D2 — acceptance ordering, observed in a disposable context with a real bounded worker:**

```text
$ bash sum.sh 2 3 5
9   (exit 0)                       <- wrong result behind a ZERO exit status
  TA status=running    -> TB releasable=False     (returned, not yet accepted)
  TA status=FAIL       -> TB releasable=False     (advisor verification failed)
# repair routed to the SAME worker: runtime reported "Resuming agent", no new worker id
$ bash sum.sh 2 3 5
10  (exit 0)
  TA status=completed  -> TB releasable=True      (released only after verified acceptance)
```

**D4 — stale completion evidence, observed with real hashes:**

```text
recorded in graph : sum.sh@sha256:7eb2e9d2...
current revision  : sum.sh@sha256:2b3dce59...
MISMATCH -> a saved `completed` label is stale; the task returns to `running`, dependents wait
```

**D5 — plan-only and `--dry-run`, before/after observation:**

```text
BEFORE:  resolved run directory file count: 0   ·  live subagents: 1 (pre-existing)
         [executed the --dry-run path against the revised skill]
AFTER:   resolved run directory file count: 0   ·  live subagents: 1 (unchanged)
         no delegate-graph.json, no delegate-log.txt, no dispatch event
$ grep -c 'Memory Protocol' .oh/skills/delegate/SKILL.md   → 0
```

**Fault injection run by the advisor** (8 cases, each mutating the skill from a pristine copy and restoring it; tree verified identical to `c879ad80` afterwards):

| Case | Mutated exit | Message | Restored |
|---|---|---|---|
| old 5d dependent-release text restored | 1 | `step 5d still releases a dependent on a worker report instead of on accepted artifacts` | 0 |
| maximize-parallelism slogan restored | 1 | `/delegate no longer states that dependency order is absolute` | 0 |
| old resume bullet restored | 1 | `resume still skips running tasks instead of reconciling them` | 0 |
| Memory Protocol reintroduced | 1 | `/delegate still calls the undefined Memory Protocol` | 0 |
| `/prd` trigger reintroduced | 1 | `names a planning command as a trigger…: or after /prd.` | 0 |
| sibling-command evasion `/plan` | 1 | `names a planning command as a trigger…: or immediately after /plan emits a plan file.` | 0 |
| sizing factors neutered | 1 | `the decomposition rules omit: complexity… briefing overhead… shared context… verification cost` | 0 |
| CONTROL: unmodified tree | 0 | — | 0 |

T1 separately reports 31 round-1 and 17 repair-round injections, machine-driven with raw output retained in the session scratchpad, and attests every row was executed rather than asserted (with two disclosed qualifications: AD16/AD17 first exited 127 on a backtick bug in its own probe message, fixed and re-run; and two anchors went stale under the repair round and were re-anchored). The independent reviewer confirmed four scenarios of its own. **The eight rows above are the advisor's own observations; the rest are recorded as reported-by-T1.**

## Acceptance criteria → proof

| Story | Criterion | Proof |
|-------|-----------|-------|
| US-001 | Dependents released only on accepted artifacts | `SKILL.md:345-351`, `:318-326`, `:193`; D2 observation above; injection row 1 |
| US-002 | Sizing factors replace the slogans; limits survive | `SKILL.md:19-20`, `:199`, `:227`, `:301-303`; injection rows 2 and 7 |
| US-002 | Dispatch record carries search/output limits and a stopping condition | `SKILL.md:180`, `:189` — **added**; the base had neither |
| US-002 | Three briefs reviewed (coupled / independent / mechanical) | `progress.txt` D3 row; found two of the advisor's own briefs missing exactly these fields |
| US-003 | Resume covers `running`, stale `completed`, unknown provenance | `SKILL.md:255-276`; D4 cases (a)–(e); the real ledger reconciliation |
| US-004 | No Memory Protocol; no planning trigger; dry-run read-only | `grep -c` = 0; `SKILL.md:4-5`, `:130-133`, `:275-276`; D5 observation; injection rows 4–6 |
| US-005 | Each added check rejects its mutation and passes after restoration | Advisor injection table above; T1's matrices; `bash -n` 0 |
| US-006 | Merged contracts preserved; no new regression | Eight contract literals verified present; probe table; base and final eval runs |
| US-007 | Every deferred row dispositioned; no deferred surface touched | Table below; `git diff --name-only` shows nothing under `.oh/skills/audit/`, `docs/`, `CHANGELOG.md`, or the predecessor task folder |

## Deferred register — explicit dispositions

None of these was implemented. None is claimed as done.

| Item | Disposition |
|---|---|
| Audit gate-3 remote-PR/local-HEAD mismatch | **Deferred, not implemented.** Confirmed still present: `route-driver.sh` `gate3_pr` consumes the classifier JSON with no `headRefOid`-vs-`HEAD` comparison. Worked around here by pushing the audited head before the audit, per `[[pattern-audit-remote-head-verdict]]`. The route is read-only in this task. |
| Audit gate-5 metric-base skew | **Deferred, not implemented.** Confirmed still present: `gate5` passes the plain `--base` ref to `slop-metrics`. Not touched. |
| `mifunedev/openharness-web` public documentation | **Deferred to a separately authorized owner.** Impact review performed: this change alters no user-facing behavior or terminology — it corrects internal delegation procedure text — so no published claim is known to be invalidated. No external change was made or requested. No follow-up artifact exists to cite, so nothing is claimed as satisfied elsewhere. |
| Probe robustness / paraphrase blind spots | **Deferred by the plan's non-goal.** Three concrete failing examples are now documented above with the exact evading text. This is stronger than the plan's starting position, which had no demonstrated example. Not fixed. |
| Environment failures (`curl-bash-safe-alternatives`, `oh-config-surfaces`, `skills-vendored`) | **Deferred triage, with a real finding.** Reproduced on the approved base first: **two of the three are green** — `curl-bash-safe-alternatives` ERROR→PASS and `oh-config-surfaces` REGRESSION→PASS. Only `skills-vendored` is still red, cause `cc-safety-net binary not found on PATH`, reproduced identically on the base. The base run is committed at `eval-base-56ab2bab.txt` so this is reproducible rather than narrative. |
| Efficiency comparison | **Not run. No budget requested, none spent.** No efficiency or token-savings claim appears anywhere in this PR. |
| Live transfer testing | **Not run.** Ownership stayed in one session throughout; no handoff was needed or performed, and handoff remains optional. |
| Historical unknown model/effort observations | **Preserved as unknown.** T1 and T2 requested `opus` / effort `high`; observed model is recorded `unknown` (neither self-reported, no native display) and observed effort `inherited session level, unobserved`, because the per-call Agent tool exposes `model` and no effort argument, and no subagent definition file exists or was created. No retrospective setting was manufactured. |

## Gaps and non-gating findings

- `skills-vendored` REGRESSION — pre-existing, reproduced on the base, environmental.
- Six `SKIPPED` probes — environment-dependent (docker/registry), all skipped on the base too.
- Three open non-blocking simplicity findings, carried in `simplicity-review.json` and listed by gate 5. The loop was not run; no `simplify-rounds.json` was seeded, deliberately.
- **A process defect worth a follow-up, raised by the reviewer and not fixed here:** the delegation guidance says nothing about never briefing a worker to assert something it knows to be false. This run produced exactly that instruction, and only the worker's refusal caught it. Adding such a rule is outside the four approved corrections, so it is recorded for the register rather than implemented.
