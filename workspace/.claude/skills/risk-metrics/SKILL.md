---
name: risk-metrics
description: |
  Calculate risk-adjusted performance metrics for the portfolio.
  TRIGGER when: evaluating portfolio health, before rebalancing,
  during market checks, or when user asks about Sharpe/risk.
---

# Risk Metrics

Calculate risk-adjusted performance metrics for the current portfolio and any proposed allocation changes.

## Instructions

1. Read `portfolio/state.json` for current positions
2. Fetch 1-year historical daily returns for all holdings via yfinance
3. Calculate portfolio-weighted daily returns using current allocation weights
4. Compute the following metrics:

| Metric | Gate Threshold | Calculation |
|---|---|---|
| **Sharpe Ratio** | > 0.5 (annualized) | (portfolio return - risk-free rate) / portfolio std dev * sqrt(252). Use 10yr Treasury yield as risk-free rate |
| **Sortino Ratio** | > 0.7 | (portfolio return - risk-free rate) / downside std dev * sqrt(252). Only penalize negative returns |
| **Max Drawdown** | < 20% | Largest peak-to-trough decline in cumulative returns |
| **Portfolio Beta** | 0.4 - 1.2 | Covariance(portfolio, SPY) / Variance(SPY). All Weather targets < 1.0 |
| **Annualized Volatility** | < 15% | Std dev of daily returns * sqrt(252) |
| **Calmar Ratio** | > 0.3 | Annualized return / abs(max drawdown) |
| **BTC Contribution to Vol** | tracked | Marginal contribution: weight * covariance(BTC, portfolio) / portfolio variance |

5. If evaluating a **proposed rebalance**, run the same metrics on the proposed allocation using backtested returns
6. **Gate logic**: If proposed allocation worsens Sharpe below 0.5 OR pushes max drawdown above 20%, flag for review rather than auto-execute

## Output Format

```
RISK METRICS (as of YYYY-MM-DD)
================================
Sharpe Ratio:      X.XX  [PASS/FAIL threshold > 0.5]
Sortino Ratio:     X.XX  [PASS/FAIL threshold > 0.7]
Max Drawdown:      -X.X% [PASS/FAIL threshold < 20%]
Portfolio Beta:    X.XX  [PASS/FAIL range 0.4-1.2]
Volatility (ann):  X.X%  [PASS/FAIL threshold < 15%]
Calmar Ratio:      X.XX  [PASS/FAIL threshold > 0.3]
BTC Vol Contrib:   X.X%  [TRACKED]

Overall Gate: PASS/FAIL
```

## Python Reference

```python
import yfinance as yf
import numpy as np
import pandas as pd

# Sharpe = (mean_excess_return / std_return) * sqrt(252)
# Sortino = (mean_excess_return / downside_std) * sqrt(252)
# Max Drawdown = (cumulative / cumulative.cummax() - 1).min()
# Beta = np.cov(port_returns, spy_returns)[0][1] / np.var(spy_returns)
```
