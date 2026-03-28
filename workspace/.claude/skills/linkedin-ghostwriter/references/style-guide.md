# Ryan Eggleston — LinkedIn Style Guide

Derived from 9 top-performing posts (March 2026).

## Mission

Grow Open Harness (github.com/ryaneggz/open-harness) adoption through LinkedIn. Every post serves this goal. Content that doesn't drive someone closer to cloning the repo is wasted.

## Voice & Tone

- **Builder-in-public**: Share what you're actively working on, honest about failures
- **First person, casual**: "I found that out last night", "Going back to sleep now"
- **Confident but not preachy**: State what you did, what you learned — not what others should do
- **Authentic vulnerability**: Admit mistakes openly ("too much Wiggun", "streaming is harder than it looks")
- **Punchy closers**: One-liners that land — but NEVER repeat the same closer twice. Vary them.

## Structure Patterns

### Hook (Line 1)
Always: **Emoji + Unicode Bold Title**

Examples:
- 🏃🔄 𝐒𝐏𝐄𝐂 -> 𝐏𝐑𝐃 -> 𝐁𝐔𝐈𝐋𝐃. 𝐇𝐨𝐰 𝐈 𝐒𝐡𝐢𝐩 𝟏𝟎𝟎 𝐂𝐨𝐦𝐦𝐢𝐭𝐬 / 𝐃𝐚𝐲
- 🧩 𝐎𝐧𝐞 𝐓𝐨𝐨𝐥 𝐂𝐚𝐥𝐥, 𝐓𝐰𝐨 𝐎𝐮𝐭𝐩𝐮𝐭𝐬
- 🫣 Last night I figured out how to automate my entire SDLC

### Body
- **Short paragraphs** (1-3 sentences max)
- **Emoji-prefixed bullets** for lists:
  - 🧠 for insights/thinking
  - 🔧 for technical details
  - 📌 for next steps
  - 😅 for honest asides
  - ✅ / ❌ for do/don't
  - 🔗 for links
- **Unicode bold** (𝐛𝐨𝐥𝐝) for key terms in bullets
- **Unicode italic** (𝘪𝘵𝘢𝘭𝘪𝘤) for emphasis, quotes, vision statements
- Dash-prefixed bullets for simple lists (no emoji)

### Closing — MANDATORY elements
1. **Engagement hook** — a question, "steal my workflow", or challenge that drives comments
2. **Open Harness CTA** — link to repo, quickstart command, or specific feature
3. Never reuse a closer from a previous draft. Check "## Done" for past closers and vary.

## Formatting Rules

1. **Unicode bold** for titles and key terms: 𝐋𝐢𝐤𝐞 𝐭𝐡𝐢𝐬 (use Mathematical Bold Unicode, U+1D400 range)
2. **Unicode italic** for emphasis: 𝘓𝘪𝘬𝘦 𝘵𝘩𝘪𝘴 (use Mathematical Sans-Serif Italic, U+1D608 range)
3. **NO hashtag dumps at the end** — weave #OpenHarness into content naturally
4. **Emojis are functional** — they mark sections, not decoration
5. **Horizontal rule** (---) used sparingly to separate main content from CTA

## Length

- Most posts: **50-150 words** (short and punchy)
- Longer posts: up to **200 words** (when explaining a concept)
- Never over 250 words

## Content Strategy

### Primary Focus: Open Harness
Every post must connect a real problem to how Open Harness solves it.

### Content Pillars (rotate between these)

**Pillar 1 — Pain → Solution** (Awareness → Interest)
Lead with a pain point developers hit with AI agents, then show how Open Harness solves it.
- "My agent rm -rf'd my project" → sandbox isolation
- "Setting up Claude Code took 2 hours" → 3-command quickstart
- "Agent forgot everything between sessions" → SOUL.md + MEMORY.md

**Pillar 2 — Build Log** (Interest → Desire)
Show real work happening inside Open Harness. Terminal output, commit counts, PR screenshots.
- "Shipped 10 PRs from my sandbox last night"
- "Heartbeat woke up at 3am and fixed the flaky test"
- "Here's what 54 commits in one sandbox looks like"

**Pillar 3 — Steal My Workflow** (Desire → Action)
Give people something they can copy-paste and try RIGHT NOW. Quickstart commands, config snippets, Makefile targets.
- "Here's the exact 4 commands I run every morning"
- "My HEARTBEAT.md that does X while I sleep"
- "Copy this SOUL.md and your agents will stop hallucinating"

**Pillar 4 — Honest Reflection** (Trust → Community)
Admit what doesn't work, what's hard, what you're still figuring out. This drives the most comments.
- "Open Harness doesn't solve X yet — here's what I'm exploring"
- "I ran 3 sandboxes in parallel and this is what broke"

**Pillar 5 — SMB Platform Automation** (Authority → Leads for ruska.ai/services)
Show how Open Harness agents plug into platforms SMBs already use (Zoho, QuickBooks, Guesty, Jobber, Square). Target business owners, not developers. Use simple language, concrete ROI, name specific platforms.
- "Your Zoho CRM has an API. My agent knows how to use it." (platform-specific)
- "Guest checks in on Guesty → agent handles the rest" (workflow story)
- "One agent replaced 12 Zapier zaps" (vs. no-code comparison)
- "What AI automation looks like for a 10-person team in St. George" (local + demystify)
- Name the SPECIFIC platform (Zoho, QuickBooks, Guesty, Jobber, Square, Toast) — SMB owners search for these
- Always end with CTA to ruska.ai/services or "DM me if you're in Southern Utah"
- See `references/open-harness.md` for full platform integration table

### Content Funnel — Every Post Moves People Forward

```
Awareness: "I didn't know I needed sandboxed agents"
    ↓  (Pain → Solution posts)
Interest: "That solves MY problem with agent permissions"
    ↓  (Build Log posts)
Desire: "I want to try this quickstart"
    ↓  (Steal My Workflow posts)
Action: "Let me clone and build"
    ↓  (Always include: github.com/ryaneggz/open-harness)
Community: "I'm using it, here's what I built"
    ↓  (Honest Reflection posts drive this)
```

### Proof Points — Include at Least One Per Post

- Concrete numbers: "54 commits", "3 commands", "120-second heartbeat", "5 agents"
- Real terminal commands: `make NAME=dev quickstart`
- Before/after: "2 hours of setup → 3 minutes"
- Specific file names: SOUL.md, HEARTBEAT.md, AGENTS.md, MEMORY.md

## Engagement Patterns (what performs best)

- **Highest engagement (12 reactions, 11 comments)**: "Steal my workflow!" + casual tone + concrete achievement
- **High engagement (9 reactions)**: Structured follow-up (What stood out / What's next / Side note)
- **Medium engagement (6-7 reactions)**: Lessons learned with emoji-prefixed structure
- **Lower engagement (3-5 reactions)**: Pure announcements or link shares without a hook

### Engagement Hooks (use one per post, rotate)
- "Steal my workflow!" / "Steal this config"
- "What's in your AGENTS.md?" / "What's your agent's SOUL.md look like?"
- "Who else is sandboxing their agents?"
- "What's the first thing your agent does when it wakes up?"
- "Try it: [quickstart command]. Tell me what breaks."
- "What would you put in your HEARTBEAT.md?"

## Anti-Patterns (DO NOT)

- No corporate jargon or buzzword salads
- No "I'm excited to announce" or "Thrilled to share"
- No long hashtag lists at the end (#AI #ML #LLM #DevTools...)
- No walls of text — if it's more than 3 sentences, break it up
- No abstract thought leadership without concrete Open Harness connection
- No "like and share" CTAs
- **NEVER reuse "That's not a roadmap. That's a Tuesday."** — it's been used 3x already
- **NEVER write a post without a repo link or quickstart command**
- **NEVER write a post without an engagement question or challenge**
