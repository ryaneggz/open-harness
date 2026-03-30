# Plan: Add "Try These Agents" Section to README

## Context

The README has a Quickstart that spins up a generic `dev` sandbox but doesn't show new users what agents can actually *do*. We want 3 purpose-built example agents that showcase different domains and sandbox capabilities, are easy to provision and tear down, and teach the full lifecycle.

## The 3 Agents

| Agent | Domain | Key Features Demonstrated | Heartbeat |
|-------|--------|--------------------------|-----------|
| **blog-writer** | Content/Marketing | Git PRs to external repo, web search, social post generation, memory (voice/style) | Weekly |
| **portfolio-mgr** | Finance/Data | Python (yfinance), web search (sentiment), memory (portfolio state), charts | Daily |
| **uptime-monitor** | DevOps/Infra | Web fetch (URL checks), memory (SLA history), git issues (alerts), response time charts | Every 30 min |

**Why these 3**: They cover content, finance, and infrastructure — three different audiences see themselves. Together they exercise every major sandbox feature (heartbeats at 3 different frequencies, memory, git PRs, git issues, web search, web fetch, Python/data analysis). All run with zero paid APIs.

## What to Add to README.md

### Insertion point
After the Quickstart section (line 19), before the `---` separator (line 21) that precedes "Why Open Harness?"

### Section structure (~80-90 lines)

```
## 🤖 Example Agents

Brief intro: 3 ready-to-try agents that show what sandboxed AI agents can do.
Each can be provisioned in one command and cleaned up when done.

### 1. Blog Writer

**What it does**: Writes blog posts for your website, creates PRs with the
draft, and generates companion LinkedIn & X.com posts for manual promotion.

**Provision & enter**:
  make NAME=blog-writer BASE_BRANCH=main quickstart
  make NAME=blog-writer shell
  claude

**Tell Claude**: "Set up this sandbox as a blog writer agent. You write posts
for ruska.ai/services, create PRs to github.com/ruska-ai/website:master,
and generate a LinkedIn post + X.com post alongside each draft."

**What to explore**:
- Edit SOUL.md to set writing tone and brand voice
- Seed MEMORY.md with target audience and content pillars
- Add a weekly heartbeat to heartbeats.conf for scheduled drafts

### 2. Portfolio Manager

**What it does**: Builds and maintains a mock $100K portfolio based on
Ray Dalio's All Weather strategy. Uses yfinance for market data and
web search for sentiment analysis. Generates daily position reports as PRs.

**Provision & enter**:
  make NAME=portfolio-mgr BASE_BRANCH=main quickstart
  make NAME=portfolio-mgr shell
  claude

**Tell Claude**: "Set up this sandbox as a portfolio manager. Build a mock
$100K portfolio using Ray Dalio's All Weather allocation. Use yfinance for
price data and web search for market sentiment. Track positions in MEMORY.md
and generate daily reports."

**What to explore**:
- Edit SOUL.md with investment philosophy and risk tolerance
- Seed MEMORY.md with initial allocation (30% stocks, 40% long bonds, etc.)
- Add a daily heartbeat for market checks and rebalancing signals

### 3. Uptime Monitor

**What it does**: Periodically checks a list of URLs for availability,
response time, and SSL cert status. Creates GitHub issues when problems
are detected. Generates weekly SLA reports with uptime percentages.

**Provision & enter**:
  make NAME=uptime-monitor BASE_BRANCH=main quickstart
  make NAME=uptime-monitor shell
  claude

**Tell Claude**: "Set up this sandbox as an uptime monitor. Check these URLs
every 30 minutes: https://ruska.ai, https://api.ruska.ai/health. Track
response times and uptime in MEMORY.md. Create GitHub issues for any
downtime. Generate a weekly SLA report as a PR."

**What to explore**:
- Edit SOUL.md with alerting thresholds and escalation rules
- Seed MEMORY.md with the URL list and SLA targets
- Configure heartbeats.conf with a 30-minute check interval

### Managing Your Agents

  make list                              # see all running sandboxes
  make NAME=blog-writer stop             # pause an agent
  make NAME=portfolio-mgr run            # restart
  make NAME=uptime-monitor clean         # full teardown

> **Shortcut:** Inside any Claude Code session at the project root,
> run `/provision blog-writer` to automate the full setup interactively.
```

## Key Decisions

- **`BASE_BRANCH=main` always explicit** — Makefile defaults to `development` which has incompatible structure
- **"Tell Claude" prompts** — instead of creating new skills/templates, the README provides copy-paste prompts the user gives to Claude inside the sandbox. Claude reads AGENTS.md/SOUL.md and self-configures.
- **"What to explore" bullets** — teaches SOUL.md, MEMORY.md, and heartbeats without duplicating the existing Heartbeat/Soul/Memory section
- **No new files needed** — just the README edit. The agents are defined by the user's prompt to Claude, not by templates.

## Files to Modify

- `/home/ryaneggz/ruska-ai/sandboxes/README.md` — insert new section after line 19

## Verification

1. Read the updated README and confirm markdown renders correctly
2. Verify all `make` commands match current Makefile targets
3. Confirm the section cross-references work with existing content
4. Spot-check that `BASE_BRANCH=main` is used consistently
