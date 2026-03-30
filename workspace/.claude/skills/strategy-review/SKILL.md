---
name: strategy-review
description: |
  Review portfolio strategy performance over time using the ledger.
  TRIGGER when: weekly rebalance review, monthly retrospective,
  or when user asks about performance trends or benchmark comparison.
---

# Strategy Review

Evaluate whether the agent's portfolio decisions are improving risk-adjusted returns over time.

## Instructions

1. Read `portfolio/ledger.json` for strategy version history
2. Read `portfolio/state.json` for current holdings
3. Fetch historical prices via yfinance for all holdings and benchmarks

### Trend Analysis

4. Calculate rolling Sharpe ratios:
   - **30-day rolling Sharpe**: Short-term trend
   - **90-day rolling Sharpe**: Medium-term trend
   - Classify: improving, flat, or declining

### Decision Quality

5. For each strategy version in the ledger:
   - Compare `metrics_at_entry` (backtest prediction) vs `metrics_forward` (actual outcome)
   - Large gaps indicate model drift or changing market conditions
   - Update `metrics_forward` with current actual data

### Benchmark Comparison

6. Compare portfolio returns against three benchmarks (same time period):

| Benchmark | Allocation | Ticker(s) |
|---|---|---|
| **Pure All Weather** | 30% VTI / 40% TLT / 15% IEF / 7.5% GLD / 7.5% DBC | Backtest weighted returns |
| **SPY buy-and-hold** | 100% SPY | SPY total return |
| **60/40 Traditional** | 60% SPY / 40% AGG | Weighted returns |

7. Calculate alpha (excess return) vs each benchmark

### BTC Cycle-Out Scorecard

8. Track each BTC reduction:
   - Date and amount sold
   - Where proceeds were rotated
   - Portfolio Sharpe before and after
   - Cumulative impact: Is selling BTC helping?

### Report Card

9. Generate summary table:

```
STRATEGY REVIEW (as of YYYY-MM-DD)
=====================================
Version  Date        Action                     Sharpe(bt)  Sharpe(fwd)  Result
v1       2026-03-29  Initial 13F All Weather    --          X.XX         BASELINE
v2       2026-04-15  BTC cycle-out 2%           0.82        X.XX         +/-X.XX

BENCHMARK COMPARISON (since inception)
========================================
Portfolio:       +X.X%  (Sharpe X.XX)
Pure All Weather: +X.X%  (Sharpe X.XX)  [+/- X.X% alpha]
SPY Buy & Hold:  +X.X%  (Sharpe X.XX)  [+/- X.X% alpha]
60/40:           +X.X%  (Sharpe X.XX)  [+/- X.X% alpha]

ROLLING SHARPE TREND
======================
30-day: X.XX (improving/flat/declining)
90-day: X.XX (improving/flat/declining)

BTC CYCLE-OUT SCORECARD
=========================
Starting weight: 10%  Current weight: X%
Trades: N  Total BTC sold: $X,XXX
Cumulative Sharpe impact: +/- X.XX
Verdict: Helping / Neutral / Hurting
```

10. Write report card to `portfolio/scorecard.md` (overwrite with latest)
11. Append summary to `memory/YYYY-MM-DD.md`

## Monthly Retrospective (1st of month)

When triggered as monthly retrospective, additionally write a "State of the Portfolio" entry to `MEMORY.md` with:
- Month-over-month return and Sharpe trend
- Whether the 13F-informed tilt is outperforming pure All Weather
- BTC cycle-out progress and impact
- Biggest winners and losers by position
- Recommendation: stay the course, or adjust the approach
