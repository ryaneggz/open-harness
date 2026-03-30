# Portfolio Manager Agent -- 13F-Informed All Weather Strategy

A quantitative portfolio management agent running a mock $100K portfolio informed by **Bridgewater Associates' Q4 2025 13F filing** and Ray Dalio's All Weather strategy.

> Forked from [Open Harness](https://github.com/ryaneggz/open-harness) -- an isolated sandbox framework for AI coding agents.

## Strategy

Blends the classic All Weather diversification framework with signals from Bridgewater's latest 13F filing. The 13F shows a pro-growth, risk-on tilt -- massive SPY bet (22% of portfolio), heavy tech conviction, consumer defensives gutted, gold exited.

### Allocation ($100K)

| Asset Class | % | Amount | Vehicle |
|---|---|---|---|
| US Equities (broad) | 30% | $30,000 | SPY |
| Tech/Growth Overweight | 10% | $10,000 | NVDA, AMZN, GOOGL |
| Long-Term US Bonds | 22% | $22,000 | TLT |
| Intermediate US Bonds | 8% | $8,000 | IEF |
| Bitcoin (cycle-out) | 10% | $10,000 | BTC-USD |
| Emerging Markets | 5% | $5,000 | IEMG |
| Gold | 5% | $5,000 | GLD |
| Commodities | 5% | $5,000 | DBC |
| Cash Reserve | 5% | $5,000 | -- |

### BTC Cycle-Out

BTC starts at 10% and is systematically reduced over time. Proceeds rotate into the All Weather core (bonds, gold, commodities). Each rotation must maintain or improve the portfolio Sharpe ratio.

## Quality Gate Skills

| Skill | Purpose |
|---|---|
| `risk-metrics` | Sharpe (>0.5), Sortino (>0.7), max drawdown (<20%), beta, volatility (<15%), Calmar ratio, BTC vol contribution |
| `allocation-check` | Concentration limits, diversification floor (bonds+gold+commodities >= 25%), individual stock cap (10%), cash reserve (2-8%) |
| `sentiment-score` | WebSearch macro sentiment aggregated into quantitative signal (-2 to +2). Gates equity increases if bearish (<-1.0) |
| `strategy-review` | Performance ledger, rolling Sharpe trends, benchmark comparison (All Weather, SPY, 60/40), BTC cycle-out scorecard |

## Heartbeats

| Schedule | File | Purpose |
|---|---|---|
| Weekdays 2:30pm MT | `market-check.md` | Daily prices, drift, risk metrics, sentiment |
| Friday 5pm MT | `rebalance-review.md` | Weekly performance, all gate checks, rebalance decisions |
| 1st of month 10am MT | `monthly-retro.md` | Full strategy review, benchmarks, state of portfolio |
| Sunday 8pm MT | `memory-distill.md` | Distill daily logs into MEMORY.md |

## Data Sources

- **yfinance** -- real-time and historical prices for all tickers
- **WebSearch** -- market sentiment, macro indicators, 13F filing updates (quarterly)
- **portfolio/state.json** -- current holdings and transaction history
- **portfolio/ledger.json** -- strategy version history with forward-fill metrics
- **portfolio/scorecard.md** -- rolling performance report card

## Getting Started

```bash
# From the host (project root)
make NAME=portfolio-mgr shell    # enter the sandbox
claude                           # start the agent

# Management
make NAME=portfolio-mgr heartbeat-status   # check schedules
make NAME=portfolio-mgr stop               # stop
make NAME=portfolio-mgr clean              # full teardown
```

## Files

```
workspace/
  portfolio/
    state.json              # Current holdings + transactions
    ledger.json             # Strategy version history
    scorecard.md            # Rolling performance report
  heartbeats/
    market-check.md         # Daily market check instructions
    rebalance-review.md     # Weekly rebalance review
    monthly-retro.md        # Monthly retrospective
    memory-distill.md       # Weekly memory distillation
  .claude/skills/
    risk-metrics/           # Sharpe, Sortino, drawdown, beta, vol
    allocation-check/       # Position limits, diversification floor
    sentiment-score/        # WebSearch macro sentiment scoring
    strategy-review/        # Performance ledger + benchmarks
  SOUL.md                   # Agent persona
  MEMORY.md                 # Long-term memory (13F macro read, strategy)
  AGENTS.md                 # Sandbox environment docs
```
