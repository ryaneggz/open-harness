---
name: quality-gate
description: |
  Template for building quality gate skills that validate decisions before execution.
  CUSTOMIZE this template for your agent's domain. Rename the skill directory and
  update the frontmatter to match your use case.
  TRIGGER when: before executing any consequential action (trades, deployments,
  resource allocation, content publishing, etc.)
---

# Quality Gate

Validate that a proposed action meets quantitative thresholds before execution.

> **This is a template.** Copy this directory, rename it, and customize the metrics
> and thresholds for your agent's domain. Delete this notice after customizing.

## Instructions

1. Load current state from your domain's state file (e.g., `state.json`)
2. Calculate relevant metrics for the current state
3. If evaluating a proposed change, calculate metrics for the proposed state
4. Check all gates against thresholds
5. Report PASS/FAIL for each gate and overall

## Metric Template

| Metric | Gate Threshold | Calculation |
|---|---|---|
| **Metric A** | > X.X | _How to calculate this metric_ |
| **Metric B** | < Y.Y | _How to calculate this metric_ |
| **Metric C** | range Z-W | _How to calculate this metric_ |

## Gate Logic

- If proposed action **worsens** any critical metric past its threshold, flag for review
- If proposed action **improves** all metrics, auto-approve
- If mixed results, present tradeoffs to the user

## Output Format

```
QUALITY GATE CHECK (as of YYYY-MM-DD)
=======================================
Metric A:  X.XX  [PASS/FAIL threshold > X.X]
Metric B:  Y.YY  [PASS/FAIL threshold < Y.Y]
Metric C:  Z.ZZ  [PASS/FAIL range Z-W]

Overall Gate: PASS/FAIL
```

## Common Quality Gate Patterns

### Resource Management (portfolios, budgets, infrastructure)
- **Risk-adjusted return**: Sharpe ratio, Sortino ratio
- **Concentration limits**: No single item > N% of total
- **Diversification floor**: Categories A+B+C >= N%
- **Drawdown protection**: Max loss < N%

### Content & Publishing
- **Quality score**: Readability, SEO, factual accuracy
- **Brand alignment**: Tone, messaging consistency
- **Compliance check**: Required disclaimers, restricted terms

### Deployment & Operations
- **Test coverage**: > N% of changed code covered
- **Performance budget**: Response time < Nms, bundle size < NKB
- **Error rate**: < N% of requests failing
- **Rollback readiness**: Health check passes, canary metrics stable

### Data & Analytics
- **Data quality**: Completeness > N%, freshness < N hours
- **Anomaly detection**: Values within N standard deviations
- **Schema validation**: All required fields present, types correct
