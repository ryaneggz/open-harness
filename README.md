# Blog Writer Agent -- Autonomous Content for ruska.ai

An autonomous blog writing agent that produces weekly blog posts for [ruska.ai/blog](https://ruska.ai/blog), creates PRs in the website repo, and generates LinkedIn + X promotional posts.

> Forked from [Open Harness](https://github.com/ryaneggz/open-harness) -- an isolated sandbox framework for AI coding agents.

## What It Does

- Writes 800-1500 word blog posts in Ryan Eggleston's voice
- Rotates through 5 content pillars (Service Spotlight, Technical How-To, Industry Trends, Behind the Build, Tool Reviews)
- Creates PRs against `master` in `ruska-ai/website` with the blog post
- Derives LinkedIn and X promotional posts from the blog (included in PR description)
- Runs autonomously every Monday at 9am MT via heartbeat

## Workflow

```
Blog Post (primary) --> LinkedIn Post (derived) --> X Post (derived)
                   \--> PR in ruska-ai/website with all three
```

## Heartbeats

| Schedule | File | Purpose |
|---|---|---|
| Monday 9am MT | `blog-writer.md` | Write weekly blog post + social posts, create PR |
| Sunday 8pm MT | `memory-distill.md` | Distill daily logs into MEMORY.md |

## Skills

| Skill | Purpose |
|---|---|
| `blog-writing` | Blog workflow, frontmatter conventions, PR format, social post derivation |

## Data Sources

- **ruska-ai/website** repo -- cloned to `~/workspace/website/`, contains existing posts
- **MEMORY.md** -- content pillar rotation, past topics, lessons learned
- **WebSearch** -- timely topics and industry trends

## Getting Started

```bash
# From the host (project root)
make NAME=blog-writer shell    # enter the sandbox
claude                         # start the agent

# Give it a task
claude -p "Write a blog post about [topic]"

# Management
make NAME=blog-writer heartbeat-status   # check schedules
make NAME=blog-writer stop               # stop
make NAME=blog-writer clean              # full teardown
```

## Files

```
workspace/
  website/                    # Cloned ruska-ai/website repo
  .claude/skills/
    blog-writing/             # Blog workflow and conventions
  .claude/posts/
    linkedin-template.md      # LinkedIn post format reference
    x-template.md             # X post format reference
    frontmatter-template.md   # Blog frontmatter reference
  heartbeats/
    blog-writer.md            # Weekly blog post task
    memory-distill.md         # Weekly memory distillation
  SOUL.md                     # Agent persona (Ryan's voice)
  MEMORY.md                   # Long-term memory (topics, pillars, lessons)
```
