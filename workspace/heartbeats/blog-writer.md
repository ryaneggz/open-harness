# Weekly Blog Post

Write a new blog post for ruska.ai/blog and create a PR in ruska-ai/website against master.

## Steps

### 1. Prepare
- Read MEMORY.md for context, past decisions, and content pillar rotation
- Read the last 3 entries in memory/ to see what was written recently
- Check `~/workspace/website/posts/` to see all published posts and avoid duplicates
- Pull latest from master: `cd ~/workspace/website && git checkout master && git pull origin master`

### 2. Choose Topic
- Rotate content pillars (check memory for which was used last):
  1. Service Spotlight — deep dive on one Ruska AI service area
  2. Technical How-To — step-by-step guide relevant to ruska.ai/services
  3. Industry Trends — AI/automation news and what it means for SMBs
  4. Behind the Build — how Ruska AI approaches a real automation challenge
  5. Tool Reviews — honest review of an AI tool relevant to service delivery
- Pick a topic that is:
  - Relevant to ruska.ai/services (automation, AI, SMB workflows)
  - Not a duplicate of existing posts
  - Timely if possible (use web search if available)
- Generate a kebab-case slug for the filename

### 3. Write the Blog Post
- Create the file at `~/workspace/website/posts/<slug>.md`
- Use this exact frontmatter format:
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
- Post should be 800-1500 words
- Include code examples, commands, or configs where relevant
- End with a CTA: book a call at cal.com/ruska-ai/ai-audit or visit ruska.ai/services
- Tone: first-person, technical but accessible, opinionated, practical

### 4. Create PR
```bash
cd ~/workspace/website
git checkout -b blog/<slug>
git add posts/<slug>.md
git commit -m "blog: <title>"
git push -u origin blog/<slug>
gh pr create \
  --repo ruska-ai/website \
  --base master \
  --title "Blog: <title>" \
  --body "<PR body — see format below>"
```

### 5. PR Description Format
The PR body MUST include these sections:

```
## Blog Post
- **Title**: <title>
- **Slug**: <slug>
- **Categories**: <list>
- **Content Pillar**: <which pillar>
- **Word Count**: <approximate count>

## Cover Image
> **Action needed**: Upload a cover image to `ruska-ai/static/blob/master/blog/<slug>.png`
> Until uploaded, the post will show without a cover image.

## LinkedIn Promotional Post
<LinkedIn post here — 50-200 words, first-person, hook + value + CTA>
- Tag: #RuskaAI #<relevant hashtag>
- Link to include: ruska.ai/blog/<slug>

## X.com Promotional Post
<X post here — under 280 characters, punchy, with link>

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

### 6. Log
- Append to memory/YYYY-MM-DD.md:
  - Topic chosen, content pillar, slug
  - PR URL
  - LinkedIn post summary
  - X.com post summary
  - What went well / what to improve
  - Next week's suggested pillar (rotate)

If all tasks complete successfully, do NOT reply HEARTBEAT_OK — always report the PR URL and summary.
If the website repo is unreachable or gh auth fails, report the error clearly.
