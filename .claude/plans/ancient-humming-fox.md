# Plan: Scaffold blog-writer + Blog Post / LinkedIn / X Promotion for Open Harness

## Context

Promote the Open Harness repo on LinkedIn using the portfolio-mgr agent branch as a concrete example. The blog-writer agent (running in Docker) will produce a blog post first, then derive LinkedIn and X posts from it. However, the blog-writer workspace was set up before the scaffolding improvements — it's missing the website repo clone, skills, README, and has uncommitted changes. This is a training run to identify and fill gaps.

## Steps

### Phase A: Scaffold blog-writer (orchestrator)

#### A1. Clone ruska-ai/website into the container (CRITICAL)

The blog-writer heartbeat assumes `~/workspace/website/` exists but it's not cloned.

```bash
docker exec --user sandbox blog-writer bash -c 'cd ~/workspace && git clone https://github.com/ruska-ai/website.git website'
```

#### A2. Create blog-writing skill

Write `.worktrees/agent/blog-writer/workspace/.claude/skills/blog-writing/SKILL.md` — encapsulates blog workflow, frontmatter conventions, PR format, and social post derivation. Triggered when writing blog posts or social content.

#### A3. Move post templates into workspace

The existing LinkedIn and X templates are at `.claude/posts/` (outside workspace). Create `workspace/.claude/posts/` with:
- `linkedin-template.md` — reference format for LinkedIn posts
- `x-template.md` — reference format for X posts
- `frontmatter-template.md` — blog post frontmatter reference

#### A4. Rewrite README.md as standalone artifact

Replace the generic Open Harness README at `.worktrees/agent/blog-writer/README.md` with a blog-writer-specific README (purpose, workflow, heartbeats, how to interact, fork notice).

#### A5. Commit and push workspace to agent/blog-writer branch

Stage all changes (SOUL.md, MEMORY.md, heartbeats.conf, heartbeat files, new skills, README) and commit.

### Phase B: Send blog post task to blog-writer

#### B1. Send task via docker exec

```bash
docker exec --user sandbox blog-writer bash -c 'cd /home/sandbox/workspace && claude -p "<prompt>"'
```

**Prompt contents:**
- **Content pillar**: "Behind the Build"
- **Topic**: How we use Open Harness to spin up autonomous AI agents — showcasing portfolio-mgr as a real example
- **Key points**:
  - Problem: AI agents need full system access but that's risky on your host
  - Solution: Open Harness — isolated Docker sandboxes with persistent memory, heartbeats, multi-agent support
  - Example: portfolio-mgr agent managing a mock $100K portfolio using Bridgewater's 13F data, yfinance, quality gate skills (Sharpe, Sortino, max drawdown), and autonomous heartbeats
  - Link to branch: https://github.com/ryaneggz/open-harness/tree/agent/portfolio-mgr
  - Link to repo: https://github.com/ryaneggz/open-harness
  - Quickstart: `make NAME=portfolio-mgr BASE_BRANCH=main quickstart`
  - Highlights: skills as quality gates, strategy performance ledger, heartbeat-driven autonomous operation
- **Blog first**: Write the full blog post, then derive LinkedIn + X posts from it
- **CTA**: Star the repo, fork it, try building your own agent
- Follow all blog-writer conventions (frontmatter, PR format, ruska-ai/website, master branch)

#### B2. Monitor and relay PR URL

Blog-writer reports back with a PR URL → orchestrator relays to user.

## Verification

- Website repo cloned: `docker exec --user sandbox blog-writer bash -c 'ls ~/workspace/website/posts/'`
- Skill exists: `ls .worktrees/agent/blog-writer/workspace/.claude/skills/blog-writing/SKILL.md`
- Branch committed: `git -C .worktrees/agent/blog-writer log --oneline -3`
- Blog post PR created in ruska-ai/website with LinkedIn + X posts in description

## Critical Files

- `.worktrees/agent/blog-writer/workspace/` — all scaffolding writes here (bind-mounted)
- `.worktrees/agent/blog-writer/workspace/SOUL.md` — agent persona (already customized)
- `.worktrees/agent/blog-writer/workspace/MEMORY.md` — seeded context (already customized)
- `.worktrees/agent/blog-writer/workspace/heartbeats/blog-writer.md` — blog post workflow template
- `.worktrees/agent/blog-writer/.claude/posts/linkedin.md` — existing LinkedIn template (move to workspace)

### Bridgewater Q4 2025 13F — Macro Read

Filed 2026-02-13, reporting period ending 2025-12-31. $27.4B portfolio, 1,040 holdings.

**Key signals:**
- **Massive SPY bet**: 10x increase to $4.8B (22% of portfolio). Entire $4.15B AUM increase came from ETFs — expressing macro views through indices, not stock-picking
- **ETFs now 34.7%** of portfolio (up from ~20% in Q3)
- **Tech conviction**: NVDA ($721M), LRCX ($521M), CRM ($512M), GOOGL ($498M), MSFT ($476M), AMZN ($450M), ADBE ($446M) — Technology at 20.5%
- **Consumer defensive gutted**: PG, JNJ, WMT, KO, PEP all cut 60-73% — sector dropped to 4.7%
- **Gold (GLD)**: Opened $318.8M position in Q1 2025, exited by Sep 2025
- **Emerging markets**: IEMG ~$922M (4.2%), modest trim
- **Fintech rotation**: PayPal doubled to $201M, Robinhood 12x to $92M
- **Energy**: Down to 2.0%, near-exit of Chevron
- **Turnover**: 168 exits, 86 new positions — ~33% rotation

**Macro interpretation**: Pro-growth, risk-on. Heavy US equity exposure via indices + tech. Exited defensive and commodity hedges. Bridgewater is betting on continued US equity strength.

### Mock Portfolio Strategy

Blend the classic All Weather framework with 13F intelligence for a $100K mock portfolio:

| Asset Class | All Weather % | 13F-Adjusted % | Amount | Vehicle |
|---|---|---|---|---|
| US Equities (broad) | 30% | 30% | $30,000 | SPY (per 13F's #1 holding) |
| Tech/Growth Overweight | — | 10% | $10,000 | Top 13F tech picks (NVDA, AMZN, GOOGL) |
| Long-Term US Bonds | 40% | 22% | $22,000 | TLT |
| Intermediate US Bonds | 15% | 8% | $8,000 | IEF |
| Bitcoin (cycle-out) | — | 10% | $10,000 | BTC-USD (yfinance) |
| Emerging Markets | — | 5% | $5,000 | IEMG (per 13F) |
| Gold | 7.5% | 5% | $5,000 | GLD |
| Commodities | 7.5% | 5% | $5,000 | DBC |
| Cash Reserve | — | 5% | $5,000 | — |

**Rationale**: The 13F shows Bridgewater tilting heavily toward US equities and tech while reducing bonds, gold, and defensives. We keep the All Weather diversification spine but shift weights to reflect Dalio's current conviction.

**BTC cycle-out strategy**: User holds BTC and wants to gradually reduce exposure. Starting at 10% ($10K), the agent will plan a systematic exit over time — selling BTC into strength and rotating proceeds into the All Weather core (bonds, gold, commodities). The Sharpe ratio gate ensures each rotation improves or maintains risk-adjusted returns. The `risk-metrics` skill tracks BTC's impact on portfolio volatility and Sharpe — its high vol will be visible in the numbers, providing quantitative justification for the cycle-out pace.

## Steps

### 1. Create GitHub Issue

```bash
gh issue create \
  --title "[AGENT] portfolio-mgr — All Weather portfolio manager with 13F intelligence" \
  --body "<issue body with identity table, 13F macro read, allocation targets>"
```

**Identity**: name=`portfolio-mgr`, branch=`agent/portfolio-mgr`, CLIs=Claude Code, Docker=No, Heartbeat=Yes

### 2. Provision Sandbox

```bash
make NAME=portfolio-mgr BASE_BRANCH=main quickstart
```

If setup.sh fails with permission denied (per past feedback):
```bash
docker exec --user root portfolio-mgr bash -c "chmod +x /home/sandbox/install/*.sh && bash /home/sandbox/install/setup.sh --non-interactive"
```

### 3. Verify

```bash
docker ps --filter "name=portfolio-mgr"
docker exec --user sandbox portfolio-mgr bash -c 'claude --version; uv --version'
make list
```

### 4. Enter Sandbox and Start Agent

```bash
make NAME=portfolio-mgr shell
claude
```

Provide Claude inside the sandbox with the full agent brief:

- **SOUL.md**: Quantitative portfolio manager persona. Data-driven, cites Bridgewater 13F positioning. Frames everything as "mock portfolio / educational exercise"
- **MEMORY.md**: Seed with:
  - Bridgewater Q4 2025 13F macro read (top holdings, sector shifts, macro interpretation)
  - $100K starting capital, inception 2026-03-29
  - 13F-adjusted allocation table above
  - Ticker selections: SPY, NVDA, AMZN, GOOGL, TLT, IEF, IEMG, GLD, DBC, BTC-USD
  - BTC cycle-out plan: start at 10%, systematically reduce into All Weather core; track impact on Sharpe
  - 5% drift rebalance threshold
  - Data sources: yfinance (prices), WebSearch (sentiment + 13F updates)
- **Python project**: `uv init portfolio && uv add yfinance pandas numpy` — build portfolio management code
- **portfolio/state.json**: Initialize with $100K 13F-adjusted allocation using current yfinance prices

#### Portfolio Quality Gate Skills

The agent should create these Claude Code skills in `.claude/skills/` inside the sandbox. These skills act as **quantitative gates** — the agent must run them before executing any rebalance or allocation change.

**Skill: `risk-metrics`** (`.claude/skills/risk-metrics/SKILL.md`)
Calculates risk-adjusted performance metrics for the portfolio. Triggered when evaluating portfolio health or before rebalancing.

Metrics computed:
| Metric | Gate Threshold | Description |
|---|---|---|
| **Sharpe Ratio** | > 0.5 (annualized) | Excess return per unit of total risk vs risk-free rate (10yr Treasury) |
| **Sortino Ratio** | > 0.7 | Like Sharpe but only penalizes downside volatility |
| **Max Drawdown** | < 20% | Largest peak-to-trough decline |
| **Portfolio Beta** | 0.4 - 1.2 | Sensitivity to SPY; All Weather targets <1.0 |
| **BTC Contribution to Vol** | tracked | Isolate BTC's marginal contribution to portfolio volatility |
| **Volatility** | < 15% annualized | Standard deviation of returns |
| **Calmar Ratio** | > 0.3 | Annualized return / max drawdown |

Gate logic: Before any rebalance, the skill runs the proposed allocation through backtested returns (yfinance historical data, trailing 1yr). If the proposed allocation **worsens** Sharpe below 0.5 or pushes max drawdown above 20%, the rebalance is **flagged for review** rather than auto-executed.

**Skill: `allocation-check`** (`.claude/skills/allocation-check/SKILL.md`)
Validates that a proposed allocation adheres to portfolio constraints. Triggered before any trade execution.

Gates:
- No single position > 40% of portfolio (concentration risk)
- Bonds + Gold + Commodities combined >= 25% (diversification floor — All Weather spine)
- No individual stock > 10% of portfolio
- Cash reserve stays between 2-8%
- Emerging markets <= 10% (volatility cap)

**Skill: `sentiment-score`** (`.claude/skills/sentiment-score/SKILL.md`)
Aggregates WebSearch sentiment into a quantitative signal. Triggered during market checks and rebalance reviews.

Process:
1. WebSearch for macro indicators (Fed policy, inflation data, earnings season, geopolitical risk)
2. Score each signal: -2 (very bearish) to +2 (very bullish)
3. Compute weighted composite score
4. Gate: If composite < -1.0 (strong bearish), flag any equity-increasing rebalance for manual review
5. Gate: If composite > 1.5 (euphoric), flag concentration risk warnings

#### Strategy Performance Ledger

A persistent scoring system that tracks whether the agent's decisions are improving risk-adjusted returns over time. Stored in `portfolio/ledger.json`.

**How it works:**

Every time the agent takes an action (rebalance, BTC cycle-out trade, allocation shift), it snapshots the portfolio state as a **strategy version**:

```json
{
  "versions": [
    {
      "id": "v1",
      "date": "2026-03-29",
      "action": "Initial allocation — 13F-adjusted All Weather + BTC",
      "allocation": { "SPY": 0.30, "NVDA": 0.033, ... },
      "metrics_at_entry": {
        "sharpe_1yr_backtest": 0.82,
        "sortino": 0.95,
        "max_drawdown": -0.12,
        "volatility": 0.11,
        "beta": 0.65
      },
      "metrics_forward": {
        "sharpe_since_entry": null,
        "return_since_entry": null,
        "max_drawdown_since_entry": null
      }
    }
  ]
}
```

**Forward-fill metrics**: Each heartbeat updates `metrics_forward` for all active versions using actual yfinance price data since entry. This is the ground truth — did the decision actually improve returns?

**Skill: `strategy-review`** (`.claude/skills/strategy-review/SKILL.md`)
Triggered weekly during rebalance review and on-demand. Reads the ledger and answers:

1. **Trend**: Are rolling 30-day and 90-day Sharpe ratios improving, flat, or declining?
2. **Decision quality**: For each strategy version, compare the backtest prediction (`metrics_at_entry`) vs actual outcome (`metrics_forward`). Large gaps reveal model drift.
3. **Benchmark comparison**: Compare portfolio returns against three benchmarks:
   - **Pure All Weather** (30/40/15/7.5/7.5 classic allocation)
   - **SPY buy-and-hold** (what if we just held SPY?)
   - **60/40 traditional** (60% SPY / 40% AGG)
4. **BTC cycle-out scorecard**: Track cumulative Sharpe improvement from each BTC reduction. Is selling BTC actually helping?
5. **Report card**: Generate a table showing each strategy version, its forward Sharpe, and whether it beat or underperformed the previous version

Output: A concise report card appended to `memory/YYYY-MM-DD.md` and a rolling summary maintained in `portfolio/scorecard.md`.

**Monthly retrospective** (added to heartbeats): On the 1st of each month, the agent runs a full `strategy-review`, compares against benchmarks, and writes a "State of the Portfolio" entry to MEMORY.md with:
- Month-over-month return and Sharpe trend
- Whether the 13F-informed tilt is outperforming pure All Weather
- BTC cycle-out progress and impact
- Biggest winners and losers by position
- Recommendation: stay the course, or adjust the approach

This creates a **closed feedback loop** — the agent can look back at its own track record and learn which types of decisions (e.g., following 13F rotations, sentiment-gated rebalancing) actually improved performance.

#### Heartbeats & Scheduling

- **heartbeats.conf**:
  - Daily market check (weekdays after close)
  - Weekly rebalance review (Fridays)
  - Monthly retrospective (1st of each month)
  - Weekly memory distillation (Sundays)
- **heartbeats/market-check.md**: Fetch prices, calculate drift, run `risk-metrics` skill, run `sentiment-score` skill, compare positioning vs latest 13F signals, log to daily memory
- **heartbeats/rebalance-review.md**: Weekly performance, run all three gate skills + `strategy-review`, macro sentiment via WebSearch, check for new 13F filings (quarterly), rebalance recommendations only if gates pass
- **heartbeats/monthly-retro.md**: Full `strategy-review` run, benchmark comparison, BTC cycle-out scorecard, "State of the Portfolio" entry to MEMORY.md
- **heartbeats/memory-distill.md**: Distill daily logs into MEMORY.md

#### Agent README

The agent should rewrite its workspace `README.md` to describe the portfolio-mgr agent specifically — making it a standalone artifact. It should:

- **Title**: Portfolio Manager Agent — 13F-Informed All Weather Strategy
- **Overview**: What this agent does (mock $100K portfolio, Bridgewater 13F intelligence, yfinance + WebSearch, quality gates)
- **Strategy**: The 13F-adjusted All Weather allocation table with BTC cycle-out
- **Skills**: List the 4 skills (risk-metrics, allocation-check, sentiment-score, strategy-review) with brief descriptions
- **Heartbeats**: Schedule table (daily market check, weekly rebalance, monthly retro, weekly memory distill)
- **Data Sources**: yfinance (prices), WebSearch (sentiment/13F monitoring), portfolio/ledger.json (performance tracking)
- **Getting Started**: How to enter the sandbox and interact with the agent
- **Fork notice**: "Forked from [Open Harness](https://github.com/ryaneggz/open-harness) — an isolated sandbox framework for AI coding agents."

This replaces the generic Open Harness README that ships with the worktree.

### 5. Report Access

Return GitHub issue URL, branch, worktree path, and access commands.

## Verification

- `make list` shows both `blog-writer` and `portfolio-mgr` running
- `make NAME=portfolio-mgr heartbeat-status` shows scheduled cron jobs
- Inside sandbox: `uv run python -c "import yfinance"` succeeds
- `portfolio/state.json` exists with $100K allocation reflecting 13F-adjusted weights

## Critical Files

- `Makefile` — quickstart target
- `install/setup.sh` — sandbox provisioning (chmod +x if needed)
- `install/heartbeat.sh` — heartbeat scheduler
- `workspace/` — templates (AGENTS.md, SOUL.md, MEMORY.md, heartbeats.conf)

## Sources

- [13F Insight - Bridgewater Q4 2025 Deep Dive](https://13finsight.com/research/bridgewater-associates-q4-2025-13f-deep-dive-dalio-spy-bet)
- [HedgeFollow - Bridgewater Portfolio](https://hedgefollow.com/funds/Bridgewater+Associates)
- [Seeking Alpha - Tracking Bridgewater Q4 2025](https://seekingalpha.com/article/4874878-tracking-bridgewater-associates-13f-portfolio-q4-2025-update)
- [Nasdaq - Bridgewater GLD Position](https://www.nasdaq.com/articles/fund-update-bridgewater-associates-lp-opened-3188m-position-gld-stock)
- [GuruFocus - Bridgewater Current Portfolio](https://www.gurufocus.com/guru/ray+dalio/current-portfolio/portfolio)
