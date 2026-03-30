---
name: blog-writing
description: |
  Write blog posts for ruska.ai/blog with social media promotion.
  TRIGGER when: user asks for a blog post, LinkedIn post, X post,
  content creation, or when the weekly heartbeat fires.
  Produces: blog post (primary) -> LinkedIn post + X post (derived).
---

# Blog Writing

Write blog posts for ruska.ai/blog and derive LinkedIn + X promotional posts from them. Blog is always the primary artifact; social posts are derived from it.

## Blog Post Conventions

### Frontmatter (exact format)

```yaml
---
title: "Post Title Here"
date: "YYYY-MM-DD"
excerpt: "1-2 sentence summary for the blog card and SEO"
categories: ["Category1", "Category2"]
coverImage: "https://github.com/ruska-ai/static/blob/master/blog/<slug>.png?raw=true"
author:
  name: "Ryan Eggleston"
  picture: "https://avatars.githubusercontent.com/u/40816745?s=96&v=4"
  linkedin: https://www.linkedin.com/in/ryan-eggleston
---
```

### Existing Categories

How-To, Langchain, Anthropic, Extended Thinking, LangGraph, API Walkthrough, Agent Automation, MCP, Developer Productivity, Claude Code, Remote Development, Python, React, Vite, Agentic Coding, Workflow, AI Engineering

### Content Pillars (rotate weekly)

1. **Service Spotlight** -- deep dive on one Ruska AI service area
2. **Technical How-To** -- step-by-step guide relevant to ruska.ai/services
3. **Industry Trends** -- AI/automation news and what it means for SMBs
4. **Behind the Build** -- how Ruska AI builds and deploys automation systems
5. **Tool Reviews** -- honest reviews of AI tools relevant to service delivery

### Writing Standards

- 800-1500 words
- First person ("I", "we" for Ruska AI)
- Technical but accessible -- "Here's what I built" not "This document describes"
- Include code examples, commands, or configs where relevant
- Show honest limitations and trade-offs
- End with CTA: book a call at cal.com/ruska-ai/ai-audit or visit ruska.ai/services
- File naming: kebab-case `.md` (e.g., `my-post-title.md`)

## Workflow

1. **Prepare**: Read MEMORY.md, check past entries, pull latest master from `~/workspace/website`
2. **Choose topic**: Rotate content pillars, pick timely/relevant topic, avoid duplicates
3. **Write blog post**: Create `~/workspace/website/posts/<slug>.md` with exact frontmatter
4. **Derive social posts**: Write LinkedIn (50-200 words) and X (<280 chars) posts based on the blog
5. **Create PR**: Branch `blog/<slug>`, commit, push, create PR against `master` in ruska-ai/website
6. **Log**: Append to `memory/YYYY-MM-DD.md`

## PR Description Format

```
## Blog Post
- **Title**: <title>
- **Slug**: <slug>
- **Categories**: <list>
- **Content Pillar**: <which pillar>
- **Word Count**: <approximate count>

## Cover Image
> **Action needed**: Upload a cover image to `ruska-ai/static/blob/master/blog/<slug>.png`

## LinkedIn Promotional Post
<LinkedIn post -- 50-200 words, first-person, hook + value + CTA>
- Tag: #RuskaAI #<relevant hashtags>
- Link to include: ruska.ai/blog/<slug>

## X.com Promotional Post
<X post -- under 280 characters, punchy, with link>

## Preview Checklist
- [ ] Frontmatter is valid YAML
- [ ] Date is correct
- [ ] Excerpt is under 200 characters
- [ ] Categories match existing conventions
- [ ] Post has a clear CTA
- [ ] LinkedIn post is ready to copy-paste
- [ ] X.com post is under 280 characters
- [ ] Cover image placeholder noted
```

## LinkedIn Post Guidelines

- First-person, Ryan's voice
- Hook in first line (make them stop scrolling)
- Value in the middle (what they'll learn)
- CTA at the end (read the full post, star the repo, book a call)
- 50-200 words
- Include relevant hashtags
- Link to the blog post

## X Post Guidelines

- Under 280 characters
- Punchy, direct
- Include link to blog post or repo
- No hashtag spam (1-2 max)
