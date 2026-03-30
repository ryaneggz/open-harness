# Agent Use Case Research: 20+ Candidates for Tutorial Showcase

## Research Summary

Based on web research across production AI agent deployments (2024-2026), developer community projects, and sandbox-specific capabilities, the following trends emerged:

**What's working in production:**
- Long-running autonomous workflows with execution loops (not single-prompt responses)
- "Fire and forget" patterns: queue tasks, let agents work overnight, review PRs in the morning
- Agents that combine web research + code generation + git workflow
- Periodic/heartbeat patterns for monitoring and maintenance tasks
- 85% of developers now regularly use AI coding tools; 40% of enterprise apps will embed agents by end of 2026

**What solo developers and small teams value most:**
- Agents that replace tedious recurring work (not one-off tasks)
- Self-contained projects that don't require complex infrastructure
- Visible, tangible output (a PR, a report, a deployed service)
- Things they can customize and extend for their own use

**What showcases sandbox capabilities best:**
- Heartbeat/cron: agent wakes up periodically, checks something, acts on it
- Memory: agent accumulates knowledge over time, gets smarter
- Git PRs: agent produces reviewable, mergeable artifacts
- Docker: agent builds/runs services inside the sandbox
- Web search: agent gathers real-time external information

---

## Scoring Criteria (each 1-5)

| Criterion | Definition |
|-----------|-----------|
| **Practical** | Would someone actually use this ongoing? Not a toy demo. |
| **Self-contained** | Runs without paid external APIs. Low setup friction. |
| **Showcase** | Demonstrates breadth of sandbox features (heartbeats, memory, git, web, Docker). |
| **Complementary** | How well it pairs with the other two already-proposed agents (Blog Writer, Portfolio Manager). |
| **Wow** | First impression impact. "I want to try this." |
| **Cleanup** | Easy to tear down, no lasting side effects outside the sandbox. |

---

## 22 Candidate Agent Concepts

### 1. Blog Writer (ALREADY PROPOSED)
Writes blog posts for a company website, creates PRs, generates LinkedIn & X.com social posts.
| Practical | Self-contained | Showcase | Complementary | Wow | Cleanup |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 5 | 5 | 4 | -- | 4 | 5 |
**Notes:** Strong. Uses heartbeat (draft on schedule), git PRs, web search for topics, memory for style/voice. Content marketing is universally relatable.

### 2. Portfolio Manager (ALREADY PROPOSED)
Creates a mock $100k portfolio based on Ray Dalio's All Weather principles, uses yfinance + web search for sentiment.
| Practical | Self-contained | Showcase | Complementary | Wow | Cleanup |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 4 | 5 | 5 | -- | 5 | 5 |
**Notes:** Very strong. Uses heartbeat (daily market check), memory (portfolio state), web search (news/sentiment), git (daily reports as PRs), Python (yfinance). High wow factor.

---

### 3. Dependency Vulnerability Auditor
Periodically scans a target repo's dependencies (npm audit, pip-audit, safety), researches CVEs via web search, creates PRs with upgrade recommendations and risk assessments.
| Practical | Self-contained | Showcase | Complementary | Wow | Cleanup |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 5 | 5 | 5 | 4 | 4 | 5 |
**Notes:** Extremely practical -- every project needs this. Uses heartbeat (daily scan), web search (CVE databases, advisories), git PRs (upgrade patches), memory (known issues, suppressed alerts). No paid APIs needed (npm audit, pip-audit are free). Security resonates with every developer.

### 4. Changelog & Release Notes Generator
Monitors a repo for new commits/tags, generates human-readable changelogs, categorizes changes, creates PR with release notes.
| Practical | Self-contained | Showcase | Complementary | Wow | Cleanup |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 4 | 5 | 3 | 3 | 3 | 5 |
**Notes:** Useful but narrow. Doesn't exercise web search or Docker heavily. Low wow factor -- feels like a GitHub Action more than an agent.

### 5. Competitive Intelligence Researcher
Periodically web-searches competitors, tracks product launches, pricing changes, job postings (growth signals), generates weekly briefing reports as PRs.
| Practical | Self-contained | Showcase | Complementary | Wow | Cleanup |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 5 | 4 | 4 | 4 | 5 | 5 |
**Notes:** Very practical for founders/PMs. Heavy web search usage. Memory for tracking changes over time. Git PRs for reports. Doesn't use Docker-in-Docker much. Complements Blog Writer (research vs. content) and Portfolio Manager (business vs. finance).

### 6. API Builder from Spec
Given an OpenAPI spec or natural language description, autonomously builds a REST API with tests, documentation, and Docker Compose deployment.
| Practical | Self-contained | Showcase | Complementary | Wow | Cleanup |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 4 | 5 | 4 | 3 | 5 | 4 |
**Notes:** High wow factor (end-to-end service creation). Uses Docker heavily. But it's a one-shot task, not ongoing -- doesn't showcase heartbeats or memory well. More of a demo than a persistent agent.

### 7. Personal Knowledge Base / Second Brain
Ingests bookmarks, notes, articles via git commits; periodically organizes, tags, cross-links, and generates weekly "what you learned" summaries.
| Practical | Self-contained | Showcase | Complementary | Wow | Cleanup |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 4 | 5 | 4 | 3 | 3 | 5 |
**Notes:** Nice concept but hard to demo compellingly. The "feed it content" step requires user effort. Memory usage is strong but the visible output is less exciting than other candidates.

### 8. Open Source Contribution Finder
Scans GitHub trending repos and "good first issue" labels, matches them against a developer profile (skills, interests stored in SOUL.md), recommends issues with context and approach suggestions.
| Practical | Self-contained | Showcase | Complementary | Wow | Cleanup |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 4 | 4 | 4 | 4 | 4 | 5 |
**Notes:** Appeals to developers wanting to contribute to OSS. Uses web search (GitHub API/trending), memory (developer profile), heartbeat (daily scan), git (reports). Moderate wow factor.

### 9. SEO Auditor & Optimizer
Periodically crawls a website (via web search/fetch), analyzes SEO factors, tracks rankings for target keywords, generates optimization reports and meta-tag PRs.
| Practical | Self-contained | Showcase | Complementary | Wow | Cleanup |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 4 | 4 | 4 | 3 | 3 | 5 |
**Notes:** Practical for anyone with a website. But partially overlaps with Blog Writer (content marketing domain). Free tier limitations on search APIs could be frustrating.

### 10. Daily Tech News Digest
Aggregates tech news from HN, Reddit, RSS feeds via web search; generates a curated daily briefing organized by topic, delivered as a markdown file via PR.
| Practical | Self-contained | Showcase | Complementary | Wow | Cleanup |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 4 | 5 | 3 | 3 | 3 | 5 |
**Notes:** Useful but feels like an RSS reader with extra steps. Doesn't use Docker or complex coding. Low differentiation from existing tools.

### 11. GitHub Repository Health Monitor
Monitors repos for stale issues, unreviewed PRs, CI failures, test coverage trends. Generates weekly health reports, auto-labels stale issues, creates triage PRs.
| Practical | Self-contained | Showcase | Complementary | Wow | Cleanup |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 5 | 5 | 4 | 3 | 3 | 5 |
**Notes:** Very practical for maintainers. Uses gh CLI, heartbeat, memory (tracking trends), git. But niche audience and low wow factor for a tutorial.

### 12. Code Review Agent
Watches for new PRs on a target repo, performs automated code review with security checks, style analysis, and improvement suggestions. Comments directly on PRs.
| Practical | Self-contained | Showcase | Complementary | Wow | Cleanup |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 5 | 4 | 3 | 3 | 4 | 5 |
**Notes:** Highly practical but competes with existing tools (CodeRabbit, Qodo). Doesn't showcase full sandbox breadth -- mostly git + analysis. Already well-served by the market.

### 13. Microservice Scaffold Generator
Takes a project description and generates a full project scaffold: API, database migrations, Docker Compose, CI config, tests, and documentation. Iterates until tests pass.
| Practical | Self-contained | Showcase | Complementary | Wow | Cleanup |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 4 | 5 | 4 | 3 | 5 | 4 |
**Notes:** Very impressive as a demo. Uses Docker (build + run), coding, git. But like #6, it's a one-shot task. No heartbeat, limited memory utility. Great wow, poor ongoing showcase.

### 14. Personal Finance Tracker
Reads bank statement CSVs committed to the repo, categorizes transactions, generates spending reports, tracks budgets, produces monthly visualizations as PRs.
| Practical | Self-contained | Showcase | Complementary | Wow | Cleanup |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 3 | 5 | 3 | 2 | 3 | 5 |
**Notes:** Too close to Portfolio Manager in domain. Requires PII-adjacent data (bank statements). Less exciting.

### 15. Documentation Site Builder
Analyzes a codebase, generates comprehensive documentation (API docs, architecture diagrams, getting-started guides), builds a static documentation site, serves it via Docker.
| Practical | Self-contained | Showcase | Complementary | Wow | Cleanup |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 4 | 5 | 4 | 3 | 4 | 4 |
**Notes:** Useful and demonstrates Docker (hosting the site). But one-shot nature limits heartbeat/memory showcase. Could be enhanced with periodic "doc drift detection" via heartbeat.

### 16. Uptime & Performance Monitor
Periodically checks a list of URLs for availability, response time, SSL cert expiry, and content changes. Stores history in memory. Alerts via git issues when problems detected. Generates weekly SLA reports.
| Practical | Self-contained | Showcase | Complementary | Wow | Cleanup |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 5 | 5 | 5 | 5 | 4 | 5 |
**Notes:** Excellent sandbox showcase. Heartbeat (periodic checks every 30 min), memory (uptime history, SLA tracking), web fetch (checking URLs), git issues (alerting), Python (data analysis, charts). Very practical -- everyone has websites/APIs to monitor. Completely different domain from Blog Writer and Portfolio Manager. Self-contained with zero external APIs.

### 17. Meeting Notes Summarizer
Processes meeting transcript files (committed as markdown), extracts action items, tracks completion across meetings, generates weekly accountability reports.
| Practical | Self-contained | Showcase | Complementary | Wow | Cleanup |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 3 | 5 | 3 | 3 | 2 | 5 |
**Notes:** Requires external input (transcripts). Limited sandbox feature usage. Many better tools exist for this.

### 18. Test Suite Generator & Maintainer
Analyzes existing code, generates comprehensive test suites, runs them via Docker, tracks coverage over time, creates PRs when coverage drops below threshold.
| Practical | Self-contained | Showcase | Complementary | Wow | Cleanup |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 5 | 5 | 4 | 3 | 4 | 5 |
**Notes:** Very practical for developers. Uses Docker (running tests), git PRs, memory (coverage trends). But requires a meaningful codebase to test against -- setup friction.

### 19. Price Tracker & Deal Finder
Monitors product prices on e-commerce sites via web search, tracks price history in memory, alerts when prices drop below thresholds, generates weekly deal reports.
| Practical | Self-contained | Showcase | Complementary | Wow | Cleanup |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 4 | 4 | 4 | 4 | 4 | 5 |
**Notes:** Fun and relatable. Web search heavy. But scraping e-commerce sites is fragile and may hit anti-bot measures. Reliability risk for a tutorial.

### 20. Job Market Researcher
Tracks job postings in a specific field via web search, analyzes salary trends, skill demand patterns, company hiring signals. Generates weekly market reports with data visualizations.
| Practical | Self-contained | Showcase | Complementary | Wow | Cleanup |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 4 | 4 | 4 | 4 | 4 | 5 |
**Notes:** Relatable to developers. Web search + memory + git. But web scraping job sites can be unreliable. Similar pattern to Competitive Intelligence (#5) but narrower.

### 21. Infrastructure Cost Optimizer
Analyzes cloud pricing pages via web search, compares against a project's resource requirements (defined in repo), recommends optimal cloud configurations, tracks pricing changes over time.
| Practical | Self-contained | Showcase | Complementary | Wow | Cleanup |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 3 | 4 | 3 | 3 | 3 | 5 |
**Notes:** Interesting but niche. Cloud pricing is complex and changes frequently. Hard to make reliable for a tutorial.

### 22. Open Source License Compliance Auditor
Scans dependencies for license types, checks compatibility, flags GPL-in-MIT-project risks, generates compliance reports, creates PRs with license documentation.
| Practical | Self-contained | Showcase | Complementary | Wow | Cleanup |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 4 | 5 | 3 | 3 | 2 | 5 |
**Notes:** Practical but boring for a tutorial. Low wow factor. Narrow audience. Doesn't use web search or heartbeats meaningfully.

### 23. Startup Idea Validator
Takes a business idea, researches market size via web search, analyzes competitors, estimates TAM/SAM/SOM, checks for existing patents/products, generates a feasibility report as a PR.
| Practical | Self-contained | Showcase | Complementary | Wow | Cleanup |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 4 | 5 | 3 | 4 | 4 | 5 |
**Notes:** Fun and relatable but one-shot. No heartbeat or ongoing memory utility. More of a prompt than a persistent agent.

### 24. Learning Path Generator
Based on a developer's current skills (SOUL.md) and goals, researches courses/tutorials via web search, creates a personalized learning roadmap, tracks progress via heartbeat check-ins, updates recommendations as skills grow.
| Practical | Self-contained | Showcase | Complementary | Wow | Cleanup |
|:-:|:-:|:-:|:-:|:-:|:-:|
| 4 | 5 | 4 | 4 | 3 | 5 |
**Notes:** Interesting use of SOUL.md and memory. But the "check progress" heartbeat feels forced. Output (a list of links) is less tangible than code or reports.

---

## Scoring Summary (sorted by total score)

| # | Agent | Prac | Self | Show | Comp | Wow | Clean | **Total** |
|---|-------|:----:|:----:|:----:|:----:|:---:|:-----:|:---------:|
| 16 | **Uptime & Performance Monitor** | 5 | 5 | 5 | 5 | 4 | 5 | **29** |
| 3 | **Dependency Vulnerability Auditor** | 5 | 5 | 5 | 4 | 4 | 5 | **28** |
| 5 | **Competitive Intelligence Researcher** | 5 | 4 | 4 | 4 | 5 | 5 | **27** |
| 8 | Open Source Contribution Finder | 4 | 4 | 4 | 4 | 4 | 5 | 25 |
| 18 | Test Suite Generator | 5 | 5 | 4 | 3 | 4 | 5 | 26 |
| 6 | API Builder from Spec | 4 | 5 | 4 | 3 | 5 | 4 | 25 |
| 13 | Microservice Scaffold Generator | 4 | 5 | 4 | 3 | 5 | 4 | 25 |
| 11 | GitHub Repo Health Monitor | 5 | 5 | 4 | 3 | 3 | 5 | 25 |
| 19 | Price Tracker | 4 | 4 | 4 | 4 | 4 | 5 | 25 |
| 20 | Job Market Researcher | 4 | 4 | 4 | 4 | 4 | 5 | 25 |
| 15 | Documentation Site Builder | 4 | 5 | 4 | 3 | 4 | 4 | 24 |
| 12 | Code Review Agent | 5 | 4 | 3 | 3 | 4 | 5 | 24 |
| 4 | Changelog Generator | 4 | 5 | 3 | 3 | 3 | 5 | 23 |
| 24 | Learning Path Generator | 4 | 5 | 4 | 4 | 3 | 5 | 25 |
| 23 | Startup Idea Validator | 4 | 5 | 3 | 4 | 4 | 5 | 25 |
| 9 | SEO Auditor | 4 | 4 | 4 | 3 | 3 | 5 | 23 |
| 7 | Personal Knowledge Base | 4 | 5 | 4 | 3 | 3 | 5 | 24 |
| 10 | Daily Tech News Digest | 4 | 5 | 3 | 3 | 3 | 5 | 23 |
| 22 | License Compliance Auditor | 4 | 5 | 3 | 3 | 2 | 5 | 22 |
| 21 | Infra Cost Optimizer | 3 | 4 | 3 | 3 | 3 | 5 | 21 |
| 17 | Meeting Notes Summarizer | 3 | 5 | 3 | 3 | 2 | 5 | 21 |
| 14 | Personal Finance Tracker | 3 | 5 | 3 | 2 | 3 | 5 | 21 |

---

## FINAL RECOMMENDATION: Top 3 Agents

### The Winning Trio (alongside the 2 already proposed)

Given that **Blog Writer** (content/marketing domain) and **Portfolio Manager** (finance/data domain) are already strong candidates, the third agent should:
1. Cover a **different domain** (not content, not finance)
2. Showcase **different primary features** than the other two
3. Be the most **universally relatable** to developers

### Recommended 3rd Agent: Uptime & Performance Monitor (Candidate #16)

**What it does:** Periodically checks a configurable list of URLs/APIs for availability, response time, SSL certificate expiry, and content changes. Stores all history in memory. Creates GitHub issues when problems are detected. Generates weekly SLA reports with uptime percentages and response time charts as PRs.

**Why it wins:**

1. **Best heartbeat showcase of any candidate.** This is the agent that most naturally demonstrates the cron/heartbeat system. It runs every 30 minutes, checks endpoints, and logs results. The Blog Writer writes on a schedule; the Portfolio Manager checks markets daily; but the Uptime Monitor is the purest "wake up, sense, act, sleep" loop -- the canonical heartbeat use case.

2. **Perfectly complementary domain coverage.** The three agents together cover:
   - **Blog Writer** = Content/Marketing (writing, social media)
   - **Portfolio Manager** = Finance/Data Science (yfinance, analysis, charts)
   - **Uptime Monitor** = DevOps/Infrastructure (HTTP checks, SLA tracking, alerting)

   Three completely different worlds. A viewer sees the breadth of what's possible.

3. **Maximum sandbox feature coverage across the trio:**
   | Feature | Blog Writer | Portfolio Mgr | Uptime Monitor |
   |---------|:-----------:|:-------------:|:--------------:|
   | Heartbeat/Cron | Weekly drafts | Daily market check | Every 30 min checks |
   | Memory (MEMORY.md) | Style/voice prefs | Portfolio state | Uptime history, SLA data |
   | Git PRs | Blog post drafts | Daily reports | Weekly SLA reports |
   | Git Issues | -- | -- | Downtime alerts |
   | Web Search | Topic research | News/sentiment | -- |
   | Web Fetch | -- | -- | URL health checks |
   | Python/Data | -- | yfinance, charts | Response time charts |
   | Docker | -- | -- | Could self-host a status page |
   | No paid APIs | Yes | Yes (yfinance free) | Yes (just HTTP requests) |

4. **Zero external dependencies.** No API keys, no paid services, no fragile web scraping. It just makes HTTP requests to URLs the user configures. The most reliable demo of all candidates.

5. **Universally relatable.** Every developer has websites and APIs they care about. "Is my site up?" is the most basic operational question. Viewers immediately understand the value.

6. **Tangible, visual output.** Response time charts, uptime percentages, SLA reports -- these produce satisfying artifacts that look great in a tutorial.

---

### Why the runners-up didn't make it:

**Dependency Vulnerability Auditor (#3, score 28):** Very close second. Extremely practical and good sandbox showcase. Lost because: (a) requires a non-trivial target codebase with real dependencies to scan (setup friction), (b) the "security scan" domain partially overlaps with the more commonly understood "DevOps/monitoring" space, and (c) the output (dependency upgrade PRs) is less visually compelling than uptime charts. However, this would be an excellent "advanced tutorial" follow-up.

**Competitive Intelligence Researcher (#5, score 27):** Strong candidate. Lost because: (a) web scraping reliability risk -- competitor websites may block or change, making demos unreliable, (b) it's essentially "web search + report writing" which overlaps significantly with Blog Writer's web research phase, and (c) the "intelligence" output is subjective and harder to verify than uptime data.

---

### Summary: The Tutorial Showcase Trio

| Agent | Domain | Primary Features | Heartbeat Frequency |
|-------|--------|-----------------|---------------------|
| **Blog Writer** | Content/Marketing | Web search, git PRs, memory (voice/style) | Weekly |
| **Portfolio Manager** | Finance/Data | Python (yfinance), web search, memory (portfolio), charts | Daily |
| **Uptime Monitor** | DevOps/Infra | Web fetch, memory (SLA history), git issues + PRs, charts | Every 30 min |

Together they demonstrate that a sandboxed AI agent can be a **content creator**, a **data analyst**, and an **operations engineer** -- three roles that resonate across the entire developer audience.

---

Sources:
- [Best AI Coding Agents for 2026 - Faros](https://www.faros.ai/blog/best-ai-coding-agents-2026)
- [10 Real-World Examples of AI Agents in 2025 - XCube Labs](https://www.xcubelabs.com/blog/10-real-world-examples-of-ai-agents-in-2025/)
- [2026 Agentic Coding Trends Report - Anthropic](https://resources.anthropic.com/hubfs/2026%20Agentic%20Coding%20Trends%20Report.pdf)
- [The State of AI Coding Agents 2026 - Medium](https://medium.com/@dave-patten/the-state-of-ai-coding-agents-2026-from-pair-programming-to-autonomous-ai-teams-b11f2b39232a)
- [Enabling Claude Code to work more autonomously - Anthropic](https://www.anthropic.com/news/enabling-claude-code-to-work-more-autonomously)
- [Docker Sandboxes: Run Claude Code Safely - Docker](https://www.docker.com/blog/docker-sandboxes-run-claude-code-and-other-coding-agents-unsupervised-but-safely/)
- [Claude Code Gets Cron Scheduling - WinBuzzer](https://winbuzzer.com/2026/03/09/anthropic-claude-code-cron-scheduling-background-worker-loop-xcxwbn/)
- [Top 10 AI Agent Projects to Build in 2026 - DataCamp](https://www.datacamp.com/blog/top-ai-agent-projects)
- [500 AI Agents Projects - GitHub](https://github.com/ashishpatel26/500-AI-Agents-Projects)
- [Heartbeat vs Cron for Periodic Agent Tasks - Moltbook](https://www.moltbook.com/post/cb8bacfc-5eae-4ecc-bb36-16bb72ef0582)
- [OpenClaw Cron Jobs for AI Agents - DEV Community](https://dev.to/hex_agent/openclaw-cron-jobs-automate-your-ai-agents-daily-tasks-4dpi)
- [AI-Powered OSINT Tools 2026 - WebAsha](https://www.webasha.com/blog/ai-powered-osint-tools-in-2025-how-artificial-intelligence-is-transforming-open-source-intelligence-gathering)
- [Automated Dependency Vulnerability Scanning with AI - Markaicode](https://markaicode.com/dependency-vulnerability-scanning/)
- [Building Microservices with AI Coding Agents - GoCodeo](https://www.gocodeo.com/post/building-microservices-with-ai-coding-agents)
