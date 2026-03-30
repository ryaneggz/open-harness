# Plan: Provision `blog-writer` Agent

## Context

The user wants a weekly content agent that writes blog posts promoting ruska.ai/services, creates PRs in `ruska-ai/website` against `master`, and generates LinkedIn + X.com promotional posts alongside each draft. The website is a Next.js 14 app with blog posts in `posts/*.md` using YAML frontmatter.

## Step 1: Create GitHub Issue

Create a tracking issue using the `[AGENT]` template in `ruska-ai/sandboxes`:

- **Name**: `blog-writer`
- **Role**: Weekly blog author for ruska.ai — writes service-aligned content, creates PRs in `ruska-ai/website`, generates LinkedIn + X.com promotional posts
- **Branch**: `agent/blog-writer`
- **Worktree**: `.worktrees/agent/blog-writer`

## Step 2: Provision the Sandbox

```bash
make NAME=blog-writer BASE_BRANCH=main quickstart
```

## Step 3: Enter Sandbox and Configure

```bash
make NAME=blog-writer shell
claude
```

Tell Claude inside the sandbox to set up the following:

### 3a. SOUL.md — Blog Writer Persona

- Voice: Ryan Eggleston's — first-person, technical but accessible, opinionated, practical
- Writes for ruska.ai/blog to showcase AI expertise and drive leads for Ruska AI's automation services
- Posts should teach something actionable, include real code/configs
- Never fabricate case studies or metrics; never auto-merge PRs

### 3b. MEMORY.md — Seeded Context

- **Blog format**: Posts in `posts/<slug>.md` with frontmatter (title, date, excerpt, categories, coverImage, author)
- **Author**: Ryan Eggleston, avatar `u/40816745`, linkedin `/in/ryan-eggleston`
- **Cover images**: `github.com/ruska-ai/static/blob/master/blog/<slug>.png?raw=true`
- **PR target**: `master` branch, branch naming `blog/<slug>`
- **Social posts**: Go in PR description under dedicated sections
- **Services** (from ruska.ai/services): Customer Support, Data Processing, Lead Management, Property Management, Content Operations, Internal Ops — positioned as "Automation as a Service" for SMBs
- **Existing categories**: How-To, AI Engineering, Agent Automation, Developer Productivity, Claude Code, MCP, Python, React, Workflow, etc.
- **Content pillars** (rotate weekly): Service Spotlight, Technical How-To, Industry Trends, Behind the Build, Tool Reviews
- **CTA**: Book a call at `cal.com/ruska-ai/ai-audit` or visit `ruska.ai/services`

### 3c. Clone Website Repo

```bash
gh repo clone ruska-ai/website ~/workspace/website
```

### 3d. Set Container Timezone

```bash
sudo ln -sf /usr/share/zoneinfo/America/Denver /etc/localtime
echo "America/Denver" | sudo tee /etc/timezone
```

This ensures cron schedules run in Mountain Time.

### 3e. heartbeats.conf — Weekly Schedule

```
# Weekly blog post — Monday 9am MT (America/Denver)
0 9 * * 1 | heartbeats/blog-writer.md | claude

# Memory distillation — Sunday 8pm MT
0 20 * * 0 | heartbeats/memory-distill.md | claude
```

### 3f. heartbeats/blog-writer.md — Weekly Task

The heartbeat instructs the agent to:

1. **Prepare** — Read MEMORY.md, recent daily logs, and existing posts to avoid duplicates
2. **Choose topic** — Rotate content pillars, pick something relevant to ruska.ai/services, use web search if available
3. **Write blog post** — 800-1500 words in the correct frontmatter format, with code examples and a CTA
4. **Create PR** — Branch `blog/<slug>` from `master`, push, open PR via `gh pr create`
5. **PR description includes**:
   - Blog post metadata (title, slug, categories, pillar, word count)
   - Cover image action item (human uploads to `ruska-ai/static`)
   - **LinkedIn post** (50-200 words, hook + value + CTA, with hashtags and link)
   - **X.com post** (under 280 chars, punchy, with link)
   - Preview checklist
6. **Log** — Append topic, PR URL, social post summaries, and next week's suggested pillar to `memory/YYYY-MM-DD.md`

### 3g. heartbeats/memory-distill.md — Weekly Cleanup

Distills daily logs into MEMORY.md each Sunday — tracks which pillars were used, topics covered, recurring issues.

## Step 4: Verify

```bash
# From host
make NAME=blog-writer heartbeat-status

# Optional: trigger a test run inside sandbox
~/install/heartbeat.sh run heartbeats/blog-writer.md

# Check PR was created
gh pr list --repo ruska-ai/website --author @me --state open
```

## Key Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Social post location | PR description | Co-located with blog for human review, no repo pollution |
| Website repo access | `gh repo clone` inside sandbox | Simpler than GitHub API, supports full git workflow |
| Cover images | Placeholder URL + action item in PR | Agent can't generate images; human uploads to ruska-ai/static |
| PR target | `master` | Production branch per user request |
| Timezone | America/Denver | User's local timezone for cron schedules |
| Schedule | Monday 9am MT | Start of work week for content review |

## Files Modified

No files in the sandboxes repo are modified. All configuration happens inside the sandbox container via Claude:

- `.worktrees/agent/blog-writer/workspace/SOUL.md`
- `.worktrees/agent/blog-writer/workspace/MEMORY.md`
- `.worktrees/agent/blog-writer/workspace/heartbeats.conf`
- `.worktrees/agent/blog-writer/workspace/heartbeats/blog-writer.md` (new)
- `.worktrees/agent/blog-writer/workspace/heartbeats/memory-distill.md` (new)
- `.worktrees/agent/blog-writer/workspace/website/` (cloned repo)
