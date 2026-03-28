---
name: linkedin-ghostwriter
description: |
  Draft LinkedIn posts in Ryan Eggleston's voice and style.
  TRIGGER when: heartbeat invokes linkedin ghostwriter task,
  user asks to write a LinkedIn post, draft social content,
  or generate a post for a given topic.
  DO NOT TRIGGER for: other social platforms, email, blog posts.
---

# LinkedIn Ghostwriter

Grow Open Harness adoption through LinkedIn content. Every post connects a real developer pain point to how Open Harness solves it, and drives the reader toward cloning the repo.

**Repo**: github.com/ryaneggz/open-harness
**Goal**: Followers → Stars → Contributors → Customers (SMB automation services in Southern Utah)

## Instructions

1. Read the style guide at `references/style-guide.md` — especially the Content Strategy and Anti-Patterns
2. Read `references/open-harness.md` for repo context and value props
3. Read 2 example posts from `references/posts/` for voice calibration
4. Choose a content pillar (rotate — check "## Done" in queue to avoid clustering):
   - **Pain → Solution**: Lead with a problem, solve it with Open Harness
   - **Build Log**: Show real work happening inside a sandbox
   - **Steal My Workflow**: Copy-pasteable commands, configs, or files
   - **Honest Reflection**: What doesn't work yet, what's hard
5. Draft the post following the structure below
6. Save drafts to `assets/drafts/YYYY-MM-DD-HH-MM.md`
7. Never publish automatically — drafts are for human review

### Post Structure

```
[Emoji] [Unicode Bold Hook — one compelling line about a PROBLEM or RESULT]

[1-2 sentence personal story — what happened, what you built, what broke]

[Emoji-prefixed bullets showing the insight, solution, or pattern]
- Connect to a SPECIFIC Open Harness feature (SOUL.md, heartbeat, quickstart, etc.)
- Include at least one proof point (number, command, file name)

[Engagement hook — question or challenge that drives comments]

🔗 github.com/ryaneggz/open-harness
[Optional: quickstart command as a "try it yourself" CTA]
```

### MANDATORY Checklist — Every Post Must Have:

- [ ] Link to `github.com/ryaneggz/open-harness` OR a quickstart command
- [ ] At least one concrete proof point (number, command, file name)
- [ ] An engagement hook (question, challenge, or "steal this")
- [ ] Connection to a specific Open Harness feature — not abstract agent advice
- [ ] A closer that has NOT been used in any previous draft (check "## Done")

### Heartbeat Mode

When invoked by heartbeat, **always generate a draft** — never skip:

1. Read `assets/drafts/queue.md`, the style guide, and `references/open-harness.md`
2. Read iteration memory at `memory/linkedin-ghostwriter-iterations.md` and apply past learnings
3. Read 2 reference posts from `references/posts/` for voice calibration
4. Pick a topic:
   - If pending topics exist in the queue, use the first one
   - If the queue is empty, generate a fresh topic from open-harness.md narrative angles
   - Check "## Done" to avoid repeats AND to rotate content pillars
5. Draft the post (50-200 words, passing the mandatory checklist above)
6. Save to `assets/drafts/YYYY-MM-DD-HH-MM.md`
7. Update queue: move topic to "## Done" with link to draft file
8. **Seed the next cycle**: Pick a topic from a DIFFERENT content pillar than this cycle
9. **Self-improve**: Append to `memory/linkedin-ghostwriter-iterations.md`:
   - Timestamp, topic, and which content pillar was used
   - Did the post pass the mandatory checklist? (repo link, proof point, engagement hook, OH feature, unique closer)
   - What went well / what to improve
   - Strategic note: is the content mix balanced across pillars? What's overrepresented?
   - One concrete action for next cycle

## Examples

### Example 1: Pain → Solution

```
🔥 𝐌𝐲 𝐀𝐠𝐞𝐧𝐭 𝐫𝐦 -𝐫𝐟'𝐝 𝐌𝐲 𝐏𝐫𝐨𝐣𝐞𝐜𝐭. 𝐓𝐡𝐞𝐧 𝐈 𝐁𝐮𝐢𝐥𝐭 𝐎𝐩𝐞𝐧 𝐇𝐚𝐫𝐧𝐞𝐬𝐬.

It happened at 2am. Claude Code ran a cleanup script with --dangerously-skip-permissions. Deleted my entire working directory.

That was the night I decided: agents need their own sandbox.

🔧 #OpenHarness gives agents full permissions inside a disposable Docker container
🧠 Only the workspace/ dir is bind-mounted — everything else is ephemeral
📌 If the agent nukes itself, you `make NAME=dev rebuild` and you're back in 60 seconds

Your agents should be free to break things. Just not 𝘺𝘰𝘶𝘳 things.

What's the worst thing your agent has done unsupervised? 👇

🔗 github.com/ryaneggz/open-harness
```

### Example 2: Steal My Workflow

```
🫣 𝐒𝐭𝐞𝐚𝐥 𝐌𝐲 𝐀𝐠𝐞𝐧𝐭 𝐒𝐞𝐭𝐮𝐩. 𝟑 𝐂𝐨𝐦𝐦𝐚𝐧𝐝𝐬.

git clone github.com/ryaneggz/open-harness && cd open-harness
make NAME=dev quickstart
make NAME=dev shell && claude

That's it. Clone, build, go.

You get: Claude Code, Codex, Pi Agent, Docker, tmux, ripgrep, agent-browser — all pre-installed in an isolated sandbox.

✅ Agents run with full permissions
✅ Your host machine stays untouched
✅ SOUL.md + MEMORY.md give agents persistent identity

I used to spend 2 hours setting up agent environments. Now it's 3 minutes.

Try it and tell me what you'd add to the provisioning script 👇

🔗 github.com/ryaneggz/open-harness
```

### Example 3: Honest Reflection

```
🧠 𝐎𝐩𝐞𝐧 𝐇𝐚𝐫𝐧𝐞𝐬𝐬 𝐃𝐨𝐞𝐬𝐧'𝐭 𝐒𝐨𝐥𝐯𝐞 𝐄𝐯𝐞𝐫𝐲𝐭𝐡𝐢𝐧𝐠.

Sandboxing your agents is step one. But isolation alone doesn't make them useful.

😅 I've watched agents inside perfect sandboxes still thrash for 45 minutes on a 5-minute task. The sandbox didn't help — because the problem was context, not permissions.

That's why AGENTS.md and SOUL.md exist. Isolation keeps your host safe. Identity keeps the agent focused.

Still figuring out: how to make the heartbeat smarter about when to skip cycles vs when to push harder.

What's the hardest part of running agents for you — permissions, context, or something else? 👇

🔗 github.com/ryaneggz/open-harness
```

## Guidelines

- Posts MUST be 50-200 words (never over 250)
- Always use Unicode bold for the hook (Mathematical Bold, U+1D400 range)
- Always start with an emoji before the bold hook
- Hashtags go inline: #OpenHarness, never as a list at the end
- Voice: first-person, casual, builder energy
- No corporate jargon: "excited to announce", "thrilled to share", "leveraging"
- **Every post MUST link to github.com/ryaneggz/open-harness**
- **Every post MUST end with an engagement question or "steal this" CTA**
- **Every post MUST connect to a specific Open Harness feature** (not generic agent advice)
- **NEVER reuse closers** — check "## Done" for past closers and vary
- **NEVER write "That's not a roadmap. That's a Tuesday."** — it's been used 3x
