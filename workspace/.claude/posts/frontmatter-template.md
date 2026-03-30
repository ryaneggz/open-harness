# Blog Post Frontmatter Template

Copy this frontmatter block to the top of every new blog post. Replace placeholders.

```yaml
---
title: "Post Title Here"
date: "YYYY-MM-DD"
excerpt: "1-2 sentence summary for the blog card and SEO (under 200 chars)"
categories: ["Category1", "Category2"]
coverImage: "https://github.com/ruska-ai/static/blob/master/blog/<slug>.png?raw=true"
author:
  name: "Ryan Eggleston"
  picture: "https://avatars.githubusercontent.com/u/40816745?s=96&v=4"
  linkedin: https://www.linkedin.com/in/ryan-eggleston
---
```

## Available Categories

How-To, Langchain, Anthropic, Extended Thinking, LangGraph, API Walkthrough, Agent Automation, MCP, Developer Productivity, Claude Code, Remote Development, Python, React, Vite, Agentic Coding, Workflow, AI Engineering

## Notes

- `date` must be ISO format: `YYYY-MM-DD`
- `slug` is the filename without `.md` extension
- `coverImage` placeholder -- note in PR description that a custom image is needed
- `excerpt` should be under 200 characters for blog card rendering
- Categories should use existing ones from the list above; create new ones sparingly
