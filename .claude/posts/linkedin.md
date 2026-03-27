# LinkedIn Post — Open Harness Launch

**Author:** [Ryan Eggleston](https://www.linkedin.com/in/ryan-eggleston)
**Repo:** [github.com/ryaneggz/open-harness](https://github.com/ryaneggz/open-harness)

---

## Post

I just open-sourced Open Harness — isolated Docker sandboxes for AI coding agents.

Three commands. That's it.

```
git clone https://github.com/ryaneggz/open-harness.git && cd open-harness
make NAME=dev quickstart
make NAME=dev shell
```

You're now inside an isolated sandbox where Claude Code, OpenAI Codex, or Pi Agent can run with full permissions — without touching your host machine.

Here's what you get out of the box:

🔒 Full isolation — agents run --dangerously-skip-permissions inside a disposable container
🧠 Persistent memory — SOUL.md, MEMORY.md, and daily logs give agents continuity across sessions
⏰ Autonomous heartbeat — agents wake on a timer, perform tasks, and go back to sleep
🐳 Docker-in-Docker — agents can build and manage containers from inside the sandbox
🔄 Multi-sandbox — spin up parallel named sandboxes for different workstreams

The problem this solves: AI coding agents need broad system access to be useful. But giving them that access on your actual machine is a risk. Open Harness gives them a playground where they can't break anything that matters.

It's agent-agnostic. Same sandbox runs Claude, Codex, and Pi side by side. Same AGENTS.md instructs all of them.

Star the repo if this is useful to you: https://github.com/ryaneggz/open-harness

#OpenSource #AI #CodingAgents #DevTools #Docker #ClaudeCode #OpenAI #Developer #SoftwareEngineering

---

## Hashtags (copy-paste)

#OpenSource #AI #CodingAgents #DevTools #Docker #ClaudeCode #OpenAI #Developer #SoftwareEngineering

## Suggested Image

Screenshot of the quickstart terminal output or the repo README hero section.
