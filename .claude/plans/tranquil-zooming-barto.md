# Open Harness Promotion Strategy — AI Council Consensus

## Context
Open Harness (github.com/ryaneggz/open-harness) is a Docker-based sandbox orchestration system for AI coding agents. Currently at v0.1.0 with ~140 commits and 1 contributor, the project needs a promotion strategy to attract stargazers and contributors. The project has genuine technical novelty (agent-agnostic sandboxes + persistent identity via SOUL.md/MEMORY.md + autonomous heartbeat system + Docker isolation) but near-zero online presence.

---

## The AI Council (5 Expert Perspectives)

### 1. DevRel Expert — "Make Contributing Frictionless"
**Top actions:**
- Create CONTRIBUTING.md with a "first 10 minutes" contributor experience
- Label 15-20 issues as "good first issue" with clear scope (including no-code-needed ones)
- Enable GitHub Discussions (Announcements, Q&A, Show & Tell, Ideas)
- Resolve all 4 stale open PRs immediately — stale PRs signal abandonment
- Set public review SLA: "All PRs reviewed within 72 hours"

### 2. Content Marketing Strategist — "Tell the Story"
**Top actions:**
- Write a "Why I Built This" origin story (the SOUL.md metaphor is the emotional hook)
- Create a 90-second demo video (asciinema or polished screen recording)
- Execute a Show HN launch (Tuesday/Wednesday, 8-9 AM ET, after polish is done)
- Publish a comparison post: "Open Harness vs. E2B vs. K8s Agent Sandbox"
- Write "Agent Recipe" blog posts (portfolio manager, uptime monitor, blog writer)

### 3. Open Source Growth Hacker — "Optimize for Discovery"
**Top actions:**
- Fix GitHub metadata NOW: description, topics, social preview image, website URL
- Create a formal GitHub Release (v0.1.0) with real release notes
- Publish CLI + sandbox package to npm (enables `npx openharness`)
- Add README badges: CI, license, npm version, Node version, "PRs Welcome"
- Submit to awesome-lists: awesome-ai-agents, awesome-docker, awesome-selfhosted

### 4. Technical Evangelist — "Demo the Architecture"
**Top actions:**
- Create a visual architecture diagram (Mermaid) for the README
- Write a deep-dive post on the heartbeat system (genuinely novel systems engineering)
- Pursue integration partnerships: Claude Code team, Codex team, Pi Agent maintainer
- Submit talk proposals to AI Engineer Summit, DockerCon, DevOps Days
- Build a coding agent benchmark: same task across Claude/Codex/Pi in identical sandboxes

### 5. Community Psychologist — "Make It Feel Alive"
**Top actions:**
- Pin a roadmap (biggest signal of project vitality)
- Lower identity cost of first contribution (no-code issues, instant recognition)
- Leverage SOUL.md as a community identity anchor ("Show us your agent's soul")
- Create social proof: "Used By" section, milestone celebrations, download counts
- Recognize contributors by name in release notes + README "Contributors" section

---

## Consensus: Phased Action Plan

### Phase 0: Foundation Fixes (Days 1-3)
> Must happen before ANY promotion — these affect first impressions

1. **Rotate leaked Slack tokens** from git history (.env was committed) — security incident
2. **Set GitHub repo metadata**: description, 8-10 topics, social preview image, website URL
3. **Resolve all 4 open PRs** — merge, close, or request changes with clear feedback
4. **Create formal GitHub Release** v0.1.0 with human-readable release notes
5. **Add community files**: CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md

### Phase 1: Visibility Infrastructure (Weeks 1-2)
6. Add README badges (CI, license, Node, "PRs Welcome")
7. Add Mermaid architecture diagram to README
8. Pin a project roadmap as GitHub Discussion/Issue
9. Enable GitHub Discussions with 4 categories
10. Create 10+ "good first issue" labels (including no-code-needed)
11. Add "Contributors" section to README
12. Create 90-second demo video/asciinema

### Phase 2: Content Launch (Weeks 2-4)
13. Publish "Why I Built This" origin story (blog + dev.to cross-post)
14. Write heartbeat system technical deep-dive
15. Post to r/SelfHosted, r/LocalLLaMA, r/devops (staggered, different angles)
16. Tweet thread: SOUL.md -> MEMORY.md -> heartbeat lifecycle
17. Create 3 copy-paste-ready Agent Recipe templates

### Phase 3: Distribution & Discovery (Months 1-2)
18. **Publish to npm** (`openharness` + `@openharness/sandbox`)
19. Simplify install to `npx openharness init`
20. **Execute Show HN launch** (after install friction is eliminated)
21. Submit to 5+ awesome-lists
22. Publish competitive comparison post
23. Co-promote with Pi Agent maintainer

### Phase 4: Community & Partnerships (Months 2-4)
24. Contact Claude Code / Codex teams about docs inclusion
25. Submit talk proposals to 2-3 conferences
26. Run a "SOUL.md Challenge" community event
27. Create `openharness` GitHub org and transfer repo
28. Build GitHub Action: `openharness/setup-sandbox@v1`
29. Publish agent benchmark (Claude vs Codex vs Pi, same sandboxes)

### Phase 5: Sustain & Scale (Months 4-6+)
30. Launch docs site (VitePress/Docusaurus)
31. Establish contributor ladder (Contributor -> Reviewer -> Maintainer)
32. Monthly "What's New" posts + community calls
33. Community sandbox recipe/template registry
34. Podcast appearances (Latent Space, Practical AI)
35. Quarterly "State of AI Coding Agents" benchmarks

---

## Council's #1 Recommendation (Unanimous)

**Fix the first-time experience and do a Show HN launch.**

Concretely: (a) publish to npm, (b) add badges + architecture diagram, (c) create a 90-second demo, (d) write a Show HN post leading with the SOUL.md/heartbeat architecture. A successful HN launch delivers 50-200 stars in 24 hours and seeds the contributor community.

**The marketing hook**: "Docker sandboxes where AI agents get a soul, a memory, and a heartbeat." No competitor combines all four pillars. Lead with that story.

---

## What NOT to Do
- Don't buy/exchange stars — GitHub detects it, destroys credibility
- Don't launch on HN until install is genuinely one command
- Don't write marketing copy — write from a builder's perspective
- Don't compare to LangGraph/CrewAI (frameworks, not sandboxes) — compare to E2B/K8s Agent Sandbox
- Don't use artificial urgency ("Star before it's too late!")
- Don't leave PRs unreviewed >1 week — a merged PR creates an evangelist, a stale PR creates a detractor
- Don't over-engineer governance at this stage
- Don't ignore the .env secret leak — rotate tokens and clean git history immediately

---

## Full Channel Distribution Playbook

### Launch Week Timeline

| Day | Action |
|-----|--------|
| Day -7 | Polish GitHub (README, topics, badges, demo GIF), draft all posts |
| Day -3 | Publish canonical blog post on dev.to + Hashnode |
| Day -1 | Schedule Product Hunt, warm up Twitter/X, notify PH hunter |
| **Day 0 (Tue)** | **PH 12:01 AM PT -> Show HN 8 AM ET -> Twitter 9 AM ET -> LinkedIn 10 AM ET -> Reddit PM** |
| Day 1 | Lobste.rs, dev.to cross-post, Mastodon/Bluesky, Discord/Slack |
| Day 2-3 | Newsletter submissions, awesome-list PRs, YouTube/podcast outreach |
| Day 4-7 | Follow-up content, secondary Reddit posts, international communities |
| Day 7-14 | Podcast recordings, video content, Q&A platforms, paid options |

### Category 1: Launch Platforms

| Platform | Angle | Timing | Expected Reach |
|----------|-------|--------|----------------|
| **Hacker News** (Show HN) | Pure technical utility, scratch-your-own-itch story | Tue/Wed 8-9 AM ET | Front page = 20K-50K views, 200-500 stars |
| **Product Hunt** | "Docker sandboxes that let AI agents code safely" | 12:01 AM PT, promote first 4 hrs | Top 5 = 3K-8K visits |
| **BetaList** | Open-source tool for AI agent sandboxing | Submit 1-2 weeks early (review queue) | 1K-3K views |
| **AlternativeTo** | List as alternative to E2B, Modal, Daytona | Anytime | SEO backlink, ongoing discovery |
| **There's An AI For That** | AI tool directory listing | Anytime | Largest AI directory, high SEO |
| **Futurepedia** | AI tool directory | Anytime | Growing AI directory |
| **Uneed** / **MicroLaunch** | Indie-focused launch | Anytime | Smaller but engaged |
| **SideProjectors** | "Open for collaboration" listing | Anytime | 300-1K views, attracts co-contributors |

**HN Etiquette:** No vote rings (detected + killed). Ask friends for genuine *comments* not upvotes. Respond to every comment fast. No hype words in title. Resubmit if no traction.

**PH Etiquette:** Get a hunter with large following (Chris Messina, Kevin William David). Say "we launched on PH today" — never ask for upvotes. Respond to every comment within minutes.

### Category 2: Reddit (Stagger Across Days — Never Same Day)

#### Tier 1: Highest Enthusiasm (Day 0 afternoon)
| Subreddit | Subscribers | Angle |
|-----------|-------------|-------|
| **r/selfhosted** | ~350K | "Self-host your own AI coding sandbox — Docker-based, no SaaS" |
| **r/LocalLLaMA** | ~500K | "Run local coding agents inside isolated Docker sandboxes" |
| **r/ClaudeAI** | ~200K+ | "Give Claude safe Docker sandboxes for code execution" |

#### Tier 2: Broad AI (Day 1)
| Subreddit | Subscribers | Angle |
|-----------|-------------|-------|
| **r/artificial** | ~1M | AI safety/containment angle |
| **r/MachineLearning** | ~3M | [P] tag, research-oriented, reproducibility focus |
| **r/LLMDevs** | ~100K+ | Infrastructure for LLM-powered agents |
| **r/AutoGPT** | ~200K | Sandboxing for autonomous agents |

#### Tier 3: DevOps / Docker (Day 2)
| Subreddit | Subscribers | Angle |
|-----------|-------------|-------|
| **r/docker** | ~300K+ | Container management tool, isolation approach |
| **r/devops** | ~300K+ | Infrastructure story for AI workloads |
| **r/opensource** | ~100K+ | Open-source alternative to commercial sandboxing |

#### Tier 4: General Dev (Day 3-4)
| Subreddit | Subscribers | Angle |
|-----------|-------------|-------|
| **r/programming** | ~5M | Link to blog post (not GitHub directly) |
| **r/coolgithubprojects** | ~50K | Direct GitHub link, short description |
| **r/SideProject** | ~100K | Builder journey + screenshots |
| **r/OpenAI** | ~2M | Tools for OpenAI agent developers |
| **r/ChatGPT** | ~5M+ | Accessible, screenshot-driven |
| **r/singularity** | ~1M | AI safety/containment angle |

**Reddit Rules:** 10:1 rule (10 non-promo contributions per promo post). Build comment history first. Never same message in multiple subs. "I built" framing, never "check out this product."

### Category 3: Dev Communities & Blogs

| Platform | Format | Angle | Expected Reach |
|----------|--------|-------|----------------|
| **dev.to** | 1,500-2,500 word tutorial, tags: #ai #docker #opensource #devops | Technical tutorial meets project announcement | 5K-15K views |
| **Hashnode** | Cross-post, custom domain for SEO | Same as dev.to | 2K-8K views |
| **Medium** (Better Programming, ITNEXT, Towards Data Science) | 5-8 min read, submit to publication | "Why AI agents need sandboxes" | Publication = 10K-50K views |
| **Lobste.rs** | Link, factual title (invite-only — need existing member) | Technical merit | Smaller but elite audience |
| **IndieHackers** | "Show IH" personal story | Builder journey | 2K-5K views |
| **DZone** | 1K-2K word article (editorial process) | Enterprise DevOps angle | 5K-20K views |
| **Hacker Noon** | Article submission | Technical deep-dive | Good SEO, large readership |
| **Daily.dev** | Automatic pickup from dev.to/Hashnode if traction builds | N/A — algorithmic | Millions of users |
| **freeCodeCamp** | Educational article ("How to Build Docker Sandboxes for AI Agents") | Tutorial | Massive reach if accepted |

### Category 4: Social Media

#### Twitter/X — Thread Strategy (Day 0, 9 AM ET)
1. Hook: "I just open-sourced a tool that gives AI coding agents their own Docker sandboxes. They can run any code, break anything — without touching your machine."
2. Problem statement (AI agents need to execute code, but that's dangerous)
3. How it works (Docker + resource limits + network isolation)
4. Key features (bullet points)
5. Demo GIF or video clip
6. How to get started (`openharness quickstart <name>`)
7. CTA: star the repo, try it, contribute

**Tag:** @Docker, @AnthropicAI, @OpenAI, @LangChainAI, @CrewAIInc
**Influencers:** @swyx, @levelsio, @t3dotgg, @fireship_dev, @ThePrimeagen
**Hashtags:** #OpenSource #AI #Docker #DevOps #AIAgents #BuildInPublic

#### LinkedIn (Day 0, 10 AM ET)
- Personal narrative, not product announcement
- "I've been working on a problem: AI agents can write code, but where do they run it safely?"
- Groups: Docker Community, DevOps Engineers, AI/ML, Open Source Community, Cloud Native

#### Mastodon (Day 1)
- Post from fosstodon.org or hachyderm.io
- Hashtags: #OpenSource #FOSS #Docker #AI #SelfHosted
- Skews European — morning EU time

#### Bluesky (Day 1)
- Short post with link, growing tech community

#### Threads (Day 1)
- Less technical audience, keep it simple

### Category 5: Discord & Slack Communities

#### AI/ML Discord Servers
- **Hugging Face** (~100K+) — #show-and-tell
- **LangChain** (~50K+) — #show-your-work
- **AutoGPT** (~100K+) — autonomous agents
- **CrewAI** — framework integration
- **MLOps Community** — infrastructure angle
- **OpenAI Developer Forum** — tools for API users

#### DevOps / Infra
- **CNCF Slack** (slack.cncf.io) — #containers channel
- **Docker Community Slack** — direct audience
- **Kubernetes Slack** (slack.k8s.io) — if K8s integration exists

#### Open Source / General
- **The Programmer's Hangout** (~150K+) — #showcase
- **CodeNewbie** — accessible explanation

#### Agent-Specific
- **Cursor community forums** — AI coding tool users
- **Continue.dev Discord** — open-source AI coding assistant

**Rule:** Read rules channel first. Engage before posting. Tailor each message. 100-2K views per server.

### Category 6: GitHub-Specific Tactics

#### Awesome Lists (Submit PRs — stagger over 1 week)
| List | Stars | Category |
|------|-------|----------|
| **awesome-selfhosted** | ~200K+ | Software Development / IDE & Tools |
| **awesome-docker** | ~30K | Container tools / Security |
| **awesome-ai-agents** | varies | Infrastructure / sandbox |
| **awesome-llm** | varies | Tools / Infrastructure |
| **awesome-devops** | varies | Container orchestration |
| **awesome-compose** (Docker) | varies | docker-compose examples |
| **awesome-generative-ai** | varies | Developer tools |
| **awesome-langchain** | varies | Infrastructure |

#### GitHub Topics to Set
`docker`, `sandbox`, `ai-agents`, `code-execution`, `devops`, `llm`, `autonomous-agents`, `developer-tools`, `ai-safety`, `container`, `open-source`, `typescript`

#### Trending Strategy
Need ~50+ stars in a single day to trend for TypeScript. Coordinate launch day to funnel all channel traffic to GitHub. Trending compounds: more visibility -> more stars -> more visibility.

### Category 7: Newsletters & Aggregators (Day 2-3)

| Newsletter | Audience | How to Submit |
|------------|----------|---------------|
| **TLDR** | 1.2M+ devs | tldr.tech/submit |
| **Console.dev** | Dev tool enthusiasts | console.dev/submit |
| **The Changelog** | Open source devs | changelog.com/news/submit |
| **Ben's Bites** | AI tool users | bensbites.beehiiv.com |
| **The Rundown AI** | 500K+ AI audience | therundown.ai |
| **Alpha Signal** | AI researchers | alphasignal.ai |
| **DevOps Weekly** | DevOps engineers | devopsweekly.com |
| **Hacker Newsletter** | HN readers | Auto-curated from HN front page |
| **Superhuman AI** | AI tool users | superhuman.ai |
| **Import AI** (Jack Clark) | AI industry | Influential, submit via site |

### Category 8: YouTube & Video (Day 3-7 outreach)

#### Channels to Pitch for Reviews
| Channel | Subscribers | Why |
|---------|-------------|-----|
| **Fireship** | 3M+ | "100 seconds of Open Harness" format |
| **ThePrimeagen** | 800K+ | Reacts to dev tools |
| **NetworkChuck** | 4M+ | Docker/DevOps content |
| **TechWorld with Nana** | 1M+ | DevOps tutorials |
| **Matthew Berman** | ~500K | AI tool reviews |
| **AI Jason** | ~200K | AI tools and agents |
| **DevOps Toolkit** (Viktor Farcic) | varies | DevOps tool reviews |
| **Christian Lempa** / **Techno Tim** | varies | Self-hosting / homelab |
| **Dreams of Code** | varies | Developer tools |

#### Own Content to Create
- **Demo video** (2-3 min): setup -> agent running -> heartbeat waking agent
- **YouTube Shorts / TikTok / Reels** (30-60s): "Watch AI agent code in a Docker sandbox" with text overlays
- TikTok #DevTok #CodingTikTok #AITok communities are growing

### Category 9: Podcasts (Day 7-14 outreach)

| Podcast | Focus | Pitch Angle |
|---------|-------|-------------|
| **Latent Space** | AI engineering | AI agent infrastructure |
| **Practical AI** (Changelog) | Applied ML | Docker sandboxes for AI workloads |
| **The Changelog** | Open source | OSS project launch story |
| **Ship It!** (Changelog) | DevOps | Infrastructure for agent execution |
| **Software Engineering Daily** | Broad tech | Agent safety and containment |
| **Cognitive Revolution** | AI trends | Autonomous agents with memory |
| **DevOps Paradox** | DevOps | Container orchestration for AI |
| **Indie Hackers Podcast** | Builders | Solo builder journey |
| **CoRecursive** | Deep tech stories | Technical storytelling |

### Category 10: Q&A & Knowledge Platforms (Day 7-14, ongoing)

- **Stack Overflow** — Don't post about project. Answer existing questions about "sandbox code execution," "docker for untrusted code," "AI agent safety." Mention Open Harness as one option. Disclose authorship. Each answer = permanent Google result.
- **Quora** — Similar strategy, lower priority. Good for SEO.
- **OpenAI Developer Forum** — Active community, agent tooling questions.
- **Hugging Face Forums** — ML community discussions.
- **LessWrong / Alignment Forum** — Only if writing substantive AI containment post.

### Category 11: International Communities (Day 4-7)

| Region | Platform | Notes |
|--------|----------|-------|
| **China** | CSDN, V2EX, Juejin, Zhihu, OSChina | Largest non-English dev population |
| **Russia** | Habr | Like HN + Medium combined, massive |
| **Japan** | Qiita, Zenn | Need Japanese translation |
| **Korea** | OKKY, Velog | Korean dev platforms |
| **Brazil** | TabNews | Growing rapidly |
| **Germany** | Heise Developer | German tech publication |

**Priority:** V2EX (Chinese HN) and Habr (Russian) have the largest audiences.

### Category 12: Paid Options (Low Budget, Day 7-14)

| Option | Cost | Reach |
|--------|------|-------|
| **TLDR Newsletter** sponsored link | $500-2K | 1.2M subscribers |
| **Reddit ads** (target r/docker, r/devops, r/LocalLLaMA) | $5/day min | $0.50-2/click, highly targeted |
| **EthicalAds** | ~$2-5 CPM | Developer-focused sites |
| **Carbon Ads** | ~$2-5 CPM | Stack Overflow, dev sites |
| **Cooperpress newsletters** (Node Weekly, etc.) | $200-600/issue | Language-specific dev audiences |
| **Twitter/X promoted tweets** | ~$0.50/engagement | Target followers of @Docker, @LangChainAI |
| **Dev podcast sponsorship** | $100-500/episode | Niche but engaged |
| **Local meetup sponsorship** | $50-200 | 5-min demo slot |

### Content Adaptation by Platform

| Platform | Tone | Length | Focus |
|----------|------|--------|-------|
| HN | Technical, humble | Short intro + comments | Architecture, trade-offs |
| Product Hunt | Benefit-oriented | Tagline + description | What it does for the user |
| Reddit (tech) | Conversational, technical | Medium text post | "I built this, here's how" |
| Twitter/X | Punchy, visual | 7-tweet thread | Hook -> demo GIF -> CTA |
| LinkedIn | Professional, narrative | 1,300 chars | Personal journey |
| dev.to | Tutorial-style | 1,500-2,500 words | Code examples, how-to |
| Discord/Slack | Casual, brief | 2-3 sentences + link | "Built this, would love feedback" |
| Mastodon | FOSS-friendly | Short | Self-hostable, open source |
| Newsletters | Concise pitch | 2-3 sentences | What + why + link |

---

## What NOT to Do
- Don't buy/exchange stars — GitHub detects it, destroys credibility
- Don't launch on HN until install is genuinely one command
- Don't write marketing copy — write from a builder's perspective
- Don't compare to LangGraph/CrewAI (frameworks, not sandboxes) — compare to E2B/K8s Agent Sandbox
- Don't use artificial urgency ("Star before it's too late!")
- Don't leave PRs unreviewed >1 week — a merged PR creates an evangelist, a stale PR creates a detractor
- Don't over-engineer governance at this stage
- Don't ignore the .env secret leak — rotate tokens and clean git history immediately
- Don't post to multiple subreddits on the same day — looks spammy, mods talk to each other
- Don't copy-paste the same message across platforms — adapt for each community
- Don't compare yourself to the wrong category (frameworks vs. sandboxes)

---

## Key Files to Modify
- `README.md` — badges, architecture diagram, contributor section, social proof
- `cli/package.json` — npm publishing config (publishConfig, repository, keywords)
- `.github/workflows/ci.yml` — release automation
- `install/setup.sh` — first-time user experience
- `workspace/SOUL.md` — showcase examples (most marketable concept)
- New files: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`
