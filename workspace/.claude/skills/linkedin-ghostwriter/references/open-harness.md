# Open Harness — Repo Reference

**Repo**: https://github.com/ryaneggz/open-harness
**Tagline**: Isolated sandbox images for AI coding agents
**Stars**: 2 | **Forks**: 1 | **Commits**: 54 | **Contributors**: ryaneggz + claude

## Business Goal

Open Harness is the open-source foundation. The commercial goal is **Ruska AI** (ruska.ai/services) — building and managing AI automations for SMBs in Southern Utah. LinkedIn content grows the following → establishes authority → drives inbound leads to ruska.ai/services.

**Funnel**: LinkedIn posts → Open Harness stars/followers → ruska.ai/services awareness → SMB automation clients

**Value prop for SMBs**: We build AI agents inside Open Harness sandboxes that connect to the platforms you already use (Zoho, QuickBooks, Guesty, Jobber, etc.) and automate the repetitive work your team does 3+ hours/day.

## What It Is

Pre-configured Docker sandboxes where AI coding agents (Claude Code, Codex, Pi Agent) operate with full permissions, persistent memory, and autonomous background tasks — without touching your host system.

**Positioning vs OpenClaw**: OpenClaw (339k stars) is a personal AI assistant for chat/messaging. Open Harness is sandboxed infrastructure for running AI agents that do real work. "OpenClaw for chat. Open Harness for work." See `references/open-harness-vs-openclaw.md` for full comparison.

## Core Value Props (use these as narrative angles)

1. **Isolation & Safety** — Agents run `--dangerously-skip-permissions` inside disposable containers. They can rm -rf, install packages, spawn processes — zero risk to host.

2. **Zero-to-Agent in Minutes** — `make NAME=dev quickstart` → 3 commands from clone to coding with AI. One provisioning script installs everything.

3. **Agent-Agnostic** — Same sandbox runs Claude Code, Codex, and Pi Agent side by side. AGENTS.md symlinked to CLAUDE.md so every agent reads the same instructions.

4. **Persistent Identity** — SOUL.md, MEMORY.md, daily logs give agents continuity across sessions. Not ephemeral chat windows — persistent collaborators.

5. **Autonomous Background Work** — Heartbeat system: agents wake on a timer, perform tasks from a checklist, go back to sleep. Reactive tools → proactive workers.

6. **Multi-Sandbox Parallelism** — Named sandboxes (NAME=research, NAME=frontend) run simultaneously with independent workspaces.

## Key Technical Details

- Base: Debian Bookworm slim
- Tools: Node.js 22, Bun, uv, Docker CLI, GitHub CLI, ripgrep, tmux, agent-browser
- Docker-in-Docker support (DOCKER=true)
- CI/CD: GitHub Actions → ghcr.io/ruska-ai/open-harness
- Entrypoint does dynamic Docker GID matching

## Open Issues (narrative hooks)

- #1: Make Pi Agent default for HEARTBEAT
- #2: Manage PI Agent from Slack

## Quickstart (always include this)

```bash
git clone https://github.com/ryaneggz/open-harness.git && cd open-harness
make NAME=dev quickstart
make NAME=dev shell
claude
```

## Narrative Angles for Posts

### Open Harness (developer audience → stars/followers)
- "Why I sandbox my AI agents" (safety angle)
- "3 commands to a fully provisioned AI dev environment" (quickstart angle)
- "Agents that remember: SOUL.md + MEMORY.md" (persistent identity angle)
- "Heartbeat: making agents proactive, not reactive" (autonomous work angle)
- "Running Claude Code, Codex, and Pi Agent in the same sandbox" (agent-agnostic angle)
- "Multi-sandbox parallelism for AI-native teams" (scale angle)
- "Docker-in-Docker: agents that can build containers" (DevOps angle)
- "Open-source agent infrastructure you can actually self-host" (open-source angle)
- "From OpenClaw to Open Harness: why I rebuilt our agent sandbox" (origin story)
- "The heartbeat pattern: agents that wake up, do work, and go back to sleep" (architecture angle)
- "Why AGENTS.md matters more than your system prompt" (context engineering angle)
- "Agent memory that survives container restarts" (persistence angle)
- "Disposable environments, durable knowledge" (philosophy angle)

### SMB Automation (business audience → ruska.ai/services leads)
- "How I saved a property manager 12 hrs/week with one automation" (case study angle)
- "What 'AI automation' actually means for a 10-person business" (demystifying angle)
- "Why your business needs an AI partner, not a chatbot" (positioning angle)
- "The 10-hour test: if your team spends 10+ hrs/week on X, automate it" (qualifying angle)
- "Why I only work with businesses in Southern Utah (for now)" (local trust angle)
- "ChatGPT vs. real automation: one answers questions, the other does the work" (differentiation angle)
- "What founding clients get that later clients won't" (urgency/scarcity angle)
- "I build it, you own it — why no lock-in matters" (trust angle)

### Platform Integration Posts (SMBs who use specific tools)
- "Your Zoho CRM has an API. My agent knows how to use it." (Zoho angle)
- "I built an agent that syncs QuickBooks invoices to Zoho CRM while you sleep" (cross-platform)
- "Guest checks in on Guesty → agent updates CRM, sends welcome email, preps turnover checklist" (vacation rental workflow)
- "Jobber + Open Harness: an agent that auto-schedules follow-ups after every completed job" (home services)
- "Why Zapier isn't enough — and when you need a real agent instead" (differentiation from no-code)
- "One agent replaced 12 Zapier zaps and saved $200/month" (cost comparison)
- "Square POS → agent → QuickBooks: zero manual data entry" (retail)
- "The 3-hour problem: your team spends 3 hrs/day on tasks an agent handles in 3 minutes" (pain point)

### Bridge posts (connect both audiences)
- "The open-source tools behind every automation I build for clients" (OH → services)
- "I use the same sandbox to build client automations that I open-sourced" (credibility)
- "From Open Harness to production: how open-source powers real business automation" (story)

## Target Platforms & Integration Opportunities

### Tier 1 — Southern Utah Priority
| Platform | Industry | Agent Opportunities |
|----------|----------|-------------------|
| Guesty / Hospitable | Vacation Rentals | Guest comms, multi-channel booking sync, turnover coordination, review responses |
| Jobber / ServiceTitan | Home Services / Construction | Scheduling, follow-up sequences, invoicing, client comms |
| Zoho One | All SMBs | CRM→Books sync, lead routing, support ticket triage, report generation |
| QuickBooks Online | All SMBs | Invoice automation, expense categorization, bank reconciliation |
| Square / Toast | Retail / Restaurants | Inventory sync, customer loyalty, POS→accounting bridge |

### Tier 2 — Broader Market
| Platform | Industry | Agent Opportunities |
|----------|----------|-------------------|
| HubSpot (free/starter) | Professional Services | Lead nurture sequences, CRM updates, meeting prep |
| Mindbody / Vagaro | Fitness / Wellness | Class booking, client follow-ups, membership management |
| Monday.com / Asana | Any | Task routing, status updates, cross-platform sync |

### Key Pain Points Agents Solve
- **Data entry across systems**: employees spend ~3 hrs/day on automatable tasks
- **Multi-channel sync**: bookings on Airbnb + Vrbo + Booking.com need one source of truth
- **Follow-up gaps**: leads go cold because no one sent the follow-up email
- **Invoice delays**: manual invoice creation from completed jobs/bookings
- **Report generation**: pulling data from 3 systems into one weekly report

### Why Agents > Zapier/Make
- Zapier: trigger → action (linear, fragile, $50+/mo for volume)
- Agent: reads context, makes decisions, handles edge cases, learns from MEMORY.md
- Example: Zapier sends the same follow-up email to everyone. An agent reads the CRM notes and personalizes it.
