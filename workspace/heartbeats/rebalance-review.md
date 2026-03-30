# Weekly Rebalance Review

Comprehensive weekly portfolio review with quality gate checks. Run every Friday.

## Tasks

1. **Load portfolio state** from `portfolio/state.json`
2. **Fetch weekly performance** for all positions via yfinance
3. **Calculate week-over-week portfolio performance** (return, volatility)
4. **Run all quality gate skills**:
   - `risk-metrics` — Sharpe, Sortino, max drawdown, beta, volatility, Calmar
   - `allocation-check` — concentration limits, diversification floor, position caps
   - `sentiment-score` — macro sentiment via WebSearch
   - `strategy-review` — performance ledger, benchmark comparison, rolling Sharpe trends
5. **Check for new 13F filings** (quarterly — WebSearch "Bridgewater Associates 13F filing" to see if a new one has been published since 2026-02-13)
6. **BTC cycle-out evaluation**:
   - If BTC has appreciated significantly (> 10% since last check), consider partial sell
   - Run risk-metrics on proposed post-sale allocation
   - Only recommend if Sharpe improves or stays flat
7. **If any position drifts > 5% from target**:
   - Generate rebalance recommendation (which positions to sell/buy, share counts, dollar amounts)
   - Run allocation-check on proposed new allocation
   - Run risk-metrics on proposed new allocation
   - Only execute if ALL gates pass
8. **If rebalance executed** (mock):
   - Update `portfolio/state.json` with new positions
   - Add transaction to transactions array
   - Create new version in `portfolio/ledger.json` with metrics_at_entry
9. **Generate weekly report** to `memory/YYYY-MM-DD.md`:
   - Portfolio value, weekly return, YTD return
   - Allocation table with drift
   - Risk metrics summary
   - Sentiment summary
   - Rebalance actions taken (if any)
   - Strategy review highlights
10. If nothing needs attention, reply `HEARTBEAT_OK`
