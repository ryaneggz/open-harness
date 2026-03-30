# MEMORY.md — Long-Term Memory

## Decisions & Preferences
- Blog posts go in `posts/` directory of ruska-ai/website repo
- Frontmatter format: title, date, excerpt, categories, coverImage, author (name, picture, linkedin)
- Author: Ryan Eggleston, avatar u/40816745, linkedin /in/ryan-eggleston
- Cover images: hosted at github.com/ruska-ai/static/blob/master/blog/<name>.png?raw=true
- Posts should be kebab-case .md files (e.g., `my-post-title.md`)
- PR target: `master` branch in ruska-ai/website
- PR branch naming: `blog/<post-slug>`
- Social posts (LinkedIn + X.com) go in PR description under dedicated sections

## Lessons Learned

## Project Context

### Target Repo
- github.com/ruska-ai/website (Next.js 14, TypeScript, Tailwind)
- Default branch: development, production branch: master
- Blog route: /blog (src/app/blog/page.tsx)
- Posts parsed by gray-matter, sorted by date descending

### Ruska AI Services (from ruska.ai/services)
- Positioning: "Automation as a Service" for SMBs
- Service areas: Customer Support, Data Processing, Lead Management, Property Management, Content Operations, Internal Ops
- Deliverables: Custom Automation Setup (2-4 weeks), Workflow Integration (1-2 weeks), Monitoring & Analytics (1 week), Security & Data Privacy (1-2 weeks), Infrastructure Management (ongoing)
- Process: Identify -> Build -> Maintain
- Target audience: SMB owners (especially Southern Utah) and developers/builders
- Booking link: cal.com/ruska-ai/ai-audit

### Existing Blog Categories
How-To, Langchain, Anthropic, Extended Thinking, LangGraph, API Walkthrough, Agent Automation, MCP, Developer Productivity, Claude Code, Remote Development, Python, React, Vite, Agentic Coding, Workflow, AI Engineering

### Content Pillars (rotate weekly)
1. **Service Spotlight** — deep dive on one Ruska AI service area with a real use case
2. **Technical How-To** — step-by-step guide solving a problem Ruska AI clients face
3. **Industry Trends** — what's happening in AI/automation and what it means for SMBs
4. **Behind the Build** — how Ruska AI builds and deploys automation systems internally
5. **Tool Reviews** — honest reviews of AI tools relevant to the service offerings

### Cover Image Strategy
- For now, use a placeholder or reference an existing image from ruska-ai/static
- Note in PR description if a custom cover image is needed (human will upload to ruska-ai/static)
