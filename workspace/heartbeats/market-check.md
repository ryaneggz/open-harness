# Daily Market Check

Perform end-of-day portfolio health check after market close.

## Tasks

1. **Fetch current prices** for all portfolio tickers via yfinance (SPY, NVDA, AMZN, GOOGL, TLT, IEF, BTC-USD, IEMG, GLD, DBC)
2. **Calculate current portfolio value** and per-position P&L vs cost basis
3. **Calculate allocation drift** from targets (see MEMORY.md for target allocation)
4. **Run risk-metrics skill** — compute Sharpe, Sortino, max drawdown, beta, volatility
5. **Run sentiment-score skill** — WebSearch for market sentiment across macro categories
6. **Compare positioning vs 13F signals** — note any divergence from Bridgewater's thesis
7. **Log summary** to `memory/YYYY-MM-DD.md`:
   - Portfolio value and daily change
   - Any positions drifting > 3% from target (early warning before 5% threshold)
   - Risk metrics snapshot
   - Sentiment composite score
   - Notable market events
8. **If drift exceeds 5%** on any position, flag for rebalancing in the log
9. If nothing notable, reply `HEARTBEAT_OK`
