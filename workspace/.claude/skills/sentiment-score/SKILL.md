---
name: sentiment-score
description: |
  Aggregate WebSearch sentiment into a quantitative macro signal.
  TRIGGER when: during market checks, rebalance reviews, or when
  user asks about market sentiment or macro outlook.
---

# Sentiment Score

Aggregate WebSearch results into a quantitative macro sentiment signal that gates portfolio decisions.

## Instructions

1. Run WebSearch queries for each macro category:
   - **Equity sentiment**: "stock market outlook today"
   - **Bond market**: "treasury bond market outlook"
   - **Inflation**: "inflation rate latest data"
   - **Fed policy**: "Federal Reserve interest rate decision"
   - **Geopolitical**: "geopolitical risk markets"
   - **Crypto**: "bitcoin market sentiment"
   - **Earnings**: "earnings season results" (during earnings season)

2. For each category, score the sentiment:
   - **-2**: Very bearish (recession fears, crash warnings, major negative event)
   - **-1**: Bearish (concerns, downturn signals, risk-off)
   - **0**: Neutral (mixed signals, no clear direction)
   - **+1**: Bullish (positive data, growth signals, risk-on)
   - **+2**: Very bullish (euphoria, strong rally, exceptional data)

3. Compute weighted composite score:
   | Category | Weight |
   |---|---|
   | Equity sentiment | 0.25 |
   | Bond market | 0.15 |
   | Inflation | 0.15 |
   | Fed policy | 0.20 |
   | Geopolitical | 0.10 |
   | Crypto | 0.10 |
   | Earnings | 0.05 |

4. Apply gates:
   - **Composite < -1.0** (strong bearish): Flag any equity-increasing rebalance for manual review
   - **Composite > 1.5** (euphoric): Flag concentration risk warnings -- euphoria often precedes corrections
   - **-1.0 to 1.5**: Proceed normally

## Output Format

```
SENTIMENT SCORE (as of YYYY-MM-DD)
====================================
Category         Score  Key Signal
Equity            +1    "S&P up 2% on strong jobs data"
Bonds             -1    "Treasury yields rising on inflation fears"
Inflation          0    "CPI in line with expectations"
Fed Policy        +1    "Fed signals rate cuts ahead"
Geopolitical      -1    "Trade tensions escalating"
Crypto            +2    "Bitcoin breaks new high"
Earnings          +1    "Tech earnings beat expectations"

Composite Score:  +0.55  [NEUTRAL - proceed normally]
Gate: PASS
```
