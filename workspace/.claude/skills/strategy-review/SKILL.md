---
name: strategy-review
description: |
  Template for building a strategy review skill that measures decision quality over time.
  CUSTOMIZE this template for your agent's domain. Tracks whether the agent's approach
  is improving by comparing predictions against actual outcomes.
  TRIGGER when: periodic review (weekly/monthly), when user asks about performance
  trends, or when evaluating whether to change approach.
---

# Strategy Review

Evaluate whether the agent's decisions are improving outcomes over time using a versioned ledger.

> **This is a template.** Customize the metrics, benchmarks, and review cadence
> for your agent's domain. Delete this notice after customizing.

## Ledger Pattern

Every consequential action gets a snapshot in a ledger file (e.g., `ledger.json`):

```json
{
  "versions": [
    {
      "id": "v1",
      "date": "YYYY-MM-DD",
      "action": "Description of what was done",
      "params": {},
      "metrics_at_entry": {
        "metric_a": 0.82,
        "metric_b": 0.95
      },
      "metrics_forward": {
        "metric_a_actual": null,
        "metric_b_actual": null
      }
    }
  ]
}
```

- **metrics_at_entry**: What you predicted/backtested at decision time
- **metrics_forward**: Actual outcomes, forward-filled over time

## Instructions

### Trend Analysis
1. Calculate rolling metrics over short (30-day) and medium (90-day) windows
2. Classify trend: improving, flat, or declining
3. Flag inflection points where trend changed direction

### Decision Quality
4. For each version in the ledger, compare prediction vs actual
5. Large gaps indicate model drift or changing conditions
6. Track prediction accuracy over time -- are estimates getting better?

### Benchmark Comparison
7. Compare outcomes against relevant benchmarks:

| Benchmark | Description |
|---|---|
| **Baseline** | What would have happened with no action (status quo) |
| **Simple heuristic** | The obvious/naive approach |
| **Best known** | Industry standard or expert-level performance |

8. Calculate alpha (excess performance) vs each benchmark

### Report Card
9. Generate a summary showing each decision, its predicted and actual outcome, and whether it beat the previous version
10. Write to a scorecard file and append to daily memory log

## Review Cadence

| Frequency | Scope |
|---|---|
| Weekly | Rolling metrics, recent decisions, quick benchmark check |
| Monthly | Full retrospective: all versions, benchmark comparison, trend analysis, recommendation to stay/adjust |

## Output Format

```
STRATEGY REVIEW (as of YYYY-MM-DD)
=====================================
Version  Date        Action              Predicted  Actual   Result
v1       YYYY-MM-DD  Initial setup       --         X.XX     BASELINE
v2       YYYY-MM-DD  Adjustment A        X.XX       X.XX     +/- X.XX

BENCHMARK COMPARISON (since inception)
========================================
This agent:      +X.X%  (metric X.XX)
Baseline:        +X.X%  (metric X.XX)  [+/- X.X% alpha]
Simple heuristic: +X.X%  (metric X.XX)  [+/- X.X% alpha]

TREND
=======
30-day: X.XX (improving/flat/declining)
90-day: X.XX (improving/flat/declining)

RECOMMENDATION: Stay the course / Adjust approach / Investigate
```
