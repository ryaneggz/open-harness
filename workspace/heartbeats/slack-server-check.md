---
# schedule: "*/5 * * * *"
agent: claude
---

# Slack Server Health Check

Scripted check: verify the `mom` Slack bot is alive in tmux session
`slack` inside the sandbox. No LLM reasoning — just run the check and
report.

## Tasks

1. Run this one-liner:

   ```bash
   tmux has-session -t slack 2>/dev/null && \
     tmux capture-pane -t slack -p -S -2000 | \
       grep -qE "connected and listening|\[system\]|💬 Response|→ Streaming response" && \
     echo OK || echo FAIL
   ```

2. If output is `OK`, reply `HEARTBEAT_OK`.
3. If `FAIL` or command errors, report:
   - Whether the tmux session exists (`tmux ls | grep slack`)
   - Last 30 lines of `tmux capture-pane -t slack -p` (or `/tmp/slack.log` if session is gone)

## Reporting

- Healthy: `HEARTBEAT_OK`
- Unhealthy: session status + recent output
