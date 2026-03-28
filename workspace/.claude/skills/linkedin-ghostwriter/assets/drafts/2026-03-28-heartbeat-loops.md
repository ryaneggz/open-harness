---
topic: "How I use heartbeat loops to automate content drafting with Claude Code"
drafted: 2026-03-28
status: draft
---

🔄 𝐇𝐞𝐚𝐫𝐭𝐛𝐞𝐚𝐭 𝐋𝐨𝐨𝐩𝐬: 𝐌𝐲 𝐀𝐠𝐞𝐧𝐭 𝐖𝐫𝐢𝐭𝐞𝐬 𝐌𝐲 𝐋𝐢𝐧𝐤𝐞𝐝𝐈𝐧 𝐃𝐫𝐚𝐟𝐭𝐬

I set up a heartbeat loop inside Claude Code that checks a queue file every 30 minutes. If there's a pending topic, it reads my style guide, calibrates on past posts, and drafts something new.

🧠 The insight: content doesn't need to be real-time. It needs to be 𝘤𝘰𝘯𝘴𝘪𝘴𝘵𝘦𝘯𝘵. A cron-like loop inside your agent sandbox is enough.

🔧 How it works:
- Agent reads `HEARTBEAT.md` on each cycle
- Picks the next topic from a queue file
- Loads a style guide + reference posts for voice calibration
- Writes a draft to disk, updates the queue

📌 I still review and edit every post before publishing. The agent handles the blank-page problem. I handle the taste.

😅 Yes, this post was drafted by the loop.

That's not automation replacing creativity. That's a Tuesday.

👨‍💻 Me (github.com/ryaneggz)
🤖 My Quant (github.com/im-an-ai-agent)
