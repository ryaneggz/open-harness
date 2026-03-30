---
name: allocation-check
description: |
  Validate that a proposed allocation adheres to portfolio constraints.
  TRIGGER when: before any trade execution, rebalancing, or allocation change.
---

# Allocation Check

Validate that a current or proposed allocation adheres to portfolio risk constraints.

## Instructions

1. Read `portfolio/state.json` for current positions
2. If evaluating a proposed change, apply it to current state
3. Calculate current dollar values using latest yfinance prices
4. Compute allocation percentages
5. Check all gates:

## Gates

| Gate | Rule | Rationale |
|---|---|---|
| **Concentration** | No single position > 40% of portfolio | Prevents single-asset blowup risk |
| **Diversification floor** | Bonds + Gold + Commodities >= 25% | Preserves All Weather spine |
| **Individual stock cap** | No individual stock > 10% of portfolio | Limits single-name risk (ETFs exempt) |
| **Cash reserve** | Cash between 2% and 8% | Ensures liquidity without drag |
| **Emerging markets cap** | Emerging markets <= 10% | Caps EM volatility exposure |
| **BTC cap** | BTC <= 15% (cycle-out, should be decreasing) | Controls crypto vol |

## Output Format

```
ALLOCATION CHECK (as of YYYY-MM-DD)
=====================================
Position           Value      Pct    Gate
SPY              $XX,XXX    XX.X%   [OK]
NVDA              $X,XXX     X.X%   [OK]
...

GATE RESULTS:
  Concentration (max 40%):     PASS - largest is SPY at XX.X%
  Diversification floor (25%): PASS - bonds+gold+commodities = XX.X%
  Individual stock cap (10%):  PASS - largest stock is NVDA at X.X%
  Cash reserve (2-8%):         PASS - cash at X.X%
  EM cap (10%):                PASS - EM at X.X%
  BTC cap (15%):               PASS - BTC at X.X%

Overall Gate: PASS/FAIL
```
