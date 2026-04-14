---
name: strategy-review
description: |
  Measure testing effectiveness over time. Tracks whether skills, agents,
  and rules are improving at finding real issues by comparing predicted
  vs actual detection rates. Part of the autoresearch self-improvement loop.
  TRIGGER when: periodic review, when user asks about testing effectiveness,
  or when evaluating whether to change testing approach.
---

# Testing Effectiveness Review

Evaluate whether the UAT testing system is improving over time by analyzing skill, agent, and rule effectiveness metrics from MEMORY.md.

## Instructions

### 1. Load Effectiveness Data

Read MEMORY.md and extract the three effectiveness tables:
- Skill Effectiveness (runs, findings, findings per run, last finding date)
- Agent Effectiveness (spawns, findings, avg time)
- Rule Effectiveness (enforcements, true positives, false positives)

### 2. Skill Analysis

For each skill in the library:

| Metric | What It Tells You |
|--------|-------------------|
| Findings per run | How productive is this skill? |
| Runs with zero findings | Is the skill testing something the app already handles well? |
| Last finding date | Is this skill still finding issues or has the app matured? |

**Classify each skill**:
- **High value**: findings per run > 0.5 — keep and invest in refining
- **Moderate value**: findings per run 0.1-0.5 — keep but review steps for efficiency
- **Low value**: findings per run < 0.1 across 5+ runs — candidate for removal or major rework
- **Untested**: 0 runs — needs to be invoked

### 3. Agent Analysis

For each sub-agent:

| Metric | What It Tells You |
|--------|-------------------|
| Findings per spawn | How effective is this specialist? |
| Avg execution time | Is the agent efficient? |
| False positive rate | How many of its findings get deduped away? |

**Classify each agent**:
- **Effective**: > 1 finding per spawn, low false positive rate
- **Noisy**: > 1 finding per spawn, but high false positive rate — tighten criteria
- **Quiet**: < 0.5 findings per spawn — may need skill additions or scope expansion
- **Slow**: effective but avg time is high — consider scope narrowing

### 4. Rule Analysis

For each rule:

| Metric | What It Tells You |
|--------|-------------------|
| True positive rate | Is this rule catching real violations? |
| False positive rate | Is this rule too strict? |
| Enforcement frequency | Is this rule being applied? |

**Classify each rule**:
- **Effective**: high true positive rate, low false positive rate — keep as-is
- **Too strict**: high false positive rate — loosen thresholds
- **Too loose**: violations found that no rule caught — add clauses
- **Dormant**: zero enforcements — either the rule's domain isn't being tested, or the app complies

### 5. Autoresearch Loop Review

Check `memory/` logs for tagged experiments (`<!-- autoresearch -->`):
- How many hypotheses were tested since last review?
- How many were kept vs. discarded?
- What's the keep rate? (> 30% is good, < 10% means hypotheses need better grounding)

### 6. Generate Report

```
TESTING EFFECTIVENESS REVIEW (YYYY-MM-DD)
==========================================

SKILLS
  High value:    /test-forms (1.2/run), /test-a11y (0.8/run)
  Moderate:      /test-nav (0.3/run), /test-responsive (0.2/run)
  Low value:     /test-auth (0.05/run across 8 runs)
  Untested:      /test-visual-regression (0 runs)

AGENTS
  Effective:     Flow Walker (2.1/spawn), A11y Auditor (1.5/spawn)
  Quiet:         Responsive Tester (0.3/spawn)
  Not spawned:   Visual Diff (0 spawns)

RULES
  Effective:     findings-management (12 TP, 1 FP)
  Too strict:    agent-browser (3 TP, 4 FP) — review timeout threshold
  Dormant:       multi-project (0 enforcements)

AUTORESEARCH
  Hypotheses tested: 5
  Kept: 3, Discarded: 2
  Keep rate: 60%

RECOMMENDATIONS
  1. Reduce /test-auth frequency — app's auth is solid
  2. Loosen agent-browser timeout from 30s to 45s
  3. Invoke /test-visual-regression in next sweep
  4. Expand Flow Walker's skill set (consider /test-search)
```

### 7. Apply Recommendations

For each recommendation:
- If it's a threshold change, apply it directly to the skill/agent/rule file
- If it's a frequency change, note it in MEMORY.md for the next `/visual-uat` run
- Tag all changes with `<!-- autoresearch: strategy-review-YYYY-MM-DD -->`

### 8. Memory Protocol

Append to `memory/YYYY-MM-DD.md` and update MEMORY.md Lessons Learned.

## Review Cadence

| Frequency | Scope |
|-----------|-------|
| After every 5 sweeps | Quick check: skill/agent classification, any obvious adjustments |
| Monthly | Full retrospective: all metrics, autoresearch review, benchmark against first month |

## Self-Improvement

This skill itself evolves:
- If the classification thresholds don't match reality, adjust them
- If new metrics emerge as useful, add them to the analysis
- If the report format is too verbose, streamline it
