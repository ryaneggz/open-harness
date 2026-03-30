# Memory

## Decisions & Preferences

### Strategy: 13F-Informed All Weather

- **Inception**: 2026-03-29, $100,000 starting capital
- **Framework**: Ray Dalio All Weather strategy adjusted with Bridgewater Q4 2025 13F signals
- **Rebalance threshold**: 5% absolute drift from target triggers rebalance recommendation
- **Quality gates**: Must pass risk-metrics + allocation-check skills before any trade

### Target Allocation

| Asset Class | % | Amount | Vehicle |
|---|---|---|---|
| US Equities (broad) | 30% | $30,000 | SPY |
| Tech/Growth Overweight | 10% | $10,000 | NVDA, AMZN, GOOGL (~$3,333 each) |
| Long-Term US Bonds | 22% | $22,000 | TLT |
| Intermediate US Bonds | 8% | $8,000 | IEF |
| Bitcoin (cycle-out) | 10% | $10,000 | BTC-USD |
| Emerging Markets | 5% | $5,000 | IEMG |
| Gold | 5% | $5,000 | GLD |
| Commodities | 5% | $5,000 | DBC |
| Cash Reserve | 5% | $5,000 | -- |

### BTC Cycle-Out Plan

- Starting at 10% ($10K), systematically sell into strength
- Rotate proceeds into All Weather core (bonds, gold, commodities)
- Each rotation must maintain or improve Sharpe ratio
- Track BTC marginal contribution to portfolio volatility

### Data Sources

- **yfinance**: Real-time and historical prices for all tickers
- **WebSearch**: Market sentiment, macro indicators, 13F filing updates (quarterly)
- **Portfolio files**: state.json (holdings), ledger.json (strategy versions), scorecard.md (performance)

## Lessons Learned

_(To be populated as the agent operates)_

## Project Context

### Bridgewater Q4 2025 13F -- Macro Read

Filed 2026-02-13, reporting period ending 2025-12-31. $27.4B portfolio, 1,040 holdings.

**Key signals:**
- **Massive SPY bet**: 10x increase to $4.8B (22% of portfolio). Entire $4.15B AUM increase came from ETFs
- **ETFs now 34.7%** of portfolio (up from ~20% in Q3)
- **Tech conviction**: NVDA ($721M), LRCX ($521M), CRM ($512M), GOOGL ($498M), MSFT ($476M), AMZN ($450M), ADBE ($446M) -- Technology at 20.5%
- **Consumer defensive gutted**: PG, JNJ, WMT, KO, PEP all cut 60-73% -- sector dropped to 4.7%
- **Gold (GLD)**: Opened $318.8M position in Q1 2025, exited by Sep 2025
- **Emerging markets**: IEMG ~$922M (4.2%), modest trim
- **Fintech rotation**: PayPal doubled to $201M, Robinhood 12x to $92M
- **Energy**: Down to 2.0%, near-exit of Chevron
- **Turnover**: 168 exits, 86 new positions -- ~33% rotation

**Macro interpretation**: Pro-growth, risk-on. Heavy US equity exposure via indices + tech. Exited defensive and commodity hedges. Bridgewater is betting on continued US equity strength.

### 13F Sources

- [13F Insight - Bridgewater Q4 2025 Deep Dive](https://13finsight.com/research/bridgewater-associates-q4-2025-13f-deep-dive-dalio-spy-bet)
- [HedgeFollow - Bridgewater Portfolio](https://hedgefollow.com/funds/Bridgewater+Associates)
- [Seeking Alpha - Tracking Bridgewater Q4 2025](https://seekingalpha.com/article/4874878-tracking-bridgewater-associates-13f-portfolio-q4-2025-update)
