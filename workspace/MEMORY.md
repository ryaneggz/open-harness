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

- **BTC-USD NaN propagation**: Mixed-frequency returns (crypto trades 24/7, equities don't) cause NaN in covariance calculations. Fix: forward-fill BTC prices and use numpy arrays. Discovered Apr 3 — prior Sharpe/Sortino WARN readings were data artifacts, not real risk failures.
- **BTC vol contribution can spike on data artifacts**: 43.7% reading on Apr 2 was NaN-driven, corrected to 22.7% on Apr 3. Always verify BTC vol spikes before acting.
- **GLD divergence from Bridgewater is paying off**: BW exited GLD by Sep 2025; we hold 5%. Gold +3.5% in first week — validated as geopolitical hedge with oil at $105-115/bbl and Strait of Hormuz constrained.
- **DBC dilutes energy exposure**: Broad commodity basket only captured +0.8% despite oil at $105-115 (+40% YTD). If energy-specific exposure is ever needed, XLE would be more direct.
- **Geopolitical events drive multi-day swings**: Iran deadline (Apr 7, -0.66%) followed by ceasefire (Apr 8-9, +2.14%) shows how geopolitical catalysts can reverse portfolio direction within 48 hours. All Weather diversification absorbed both scenarios without breaching any gates.
- **BTC sentiment/price divergence**: Fear & Greed at 9-11 (Extreme Fear) while BTC rallied +4.7% from cost basis. Institutional ETF inflows providing floor despite bearish retail sentiment. Don't use sentiment alone as a trade trigger for BTC.

## State of the Portfolio — Week 2 (Apr 6 – Apr 9, 2026)

### Performance
- **Value**: $104,431 (+4.43% since inception, new ATH)
- **Risk metrics (1Y backtest)**: Sharpe 1.30, Sortino 1.82, Max DD -6.5%, Beta 0.69, Vol 10.9%, Calmar 3.00 — all gates PASS
- **Week return**: ~+2.1% (+$2,142 from Apr 3's $102,299)
- **Best session**: Apr 8-9, +$2,185 on Iran ceasefire rally

### 13F-Informed Tilt Performance
- Tech overweight accelerating: GOOGL +13.6%, AMZN +12.7%, NVDA +8.3% — all doubled from Week 1
- SPY overweight at +6.3% from cost basis

### BTC Cycle-Out Progress
- No trades executed. BTC at 10.0% weight, +4.7% P&L ($67,370 → $70,549)
- Flipped to positive P&L on Apr 6 for the first time
- Fear & Greed still at 9-11 (Extreme Fear) — sentiment/price divergence
- BTC vol contribution elevated at 27.3% — highest reading since tracking. Monitor.
- No cycle-out trigger yet (need >10% gain)

### Biggest Winners & Losers (from inception)
- **Winners**: SPY (+$1,900), BTC (+$472), GOOGL (+$452), AMZN (+$423)
- **Losers**: DBC (-$36, only negative position)

### Key Events
- **Iran ceasefire Apr 8**: Pakistan-mediated deal. Dow +1,325 pts. But violations reported immediately — fragile truce.
- **Oil scenarios**: $90/bbl if deal holds vs $140-150 if conflict escalates.
- **Sentiment improved**: Composite -0.55 → -0.10 on ceasefire.
- **March CPI due Apr 10**: Expected hot (+1% MoM) from oil/gas spike. Not yet released as of last log.
- **Q1 earnings**: Starting mid-April. JPMorgan kicks off.

### Recommendation
**Stay the course.** All gates pass, no drift exceeds threshold (max 0.7% TLT). Ceasefire fragile — watch for reversal.

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
