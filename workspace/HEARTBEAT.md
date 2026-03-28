# Heartbeat

<!--
  The agent reads this file periodically during heartbeat cycles.
  Add tasks below for the agent to check on each cycle.
  If empty (only headers/comments), the heartbeat is skipped to save API costs.
-->

## Tasks

### Check & Respond to Mail
- Read the state file at `~/workspace/.mail-state.json` to get the API key and inbox ID
- Use the `agentmail` CLI to list inboxes (if inbox_id is null) and check for new messages
- For each new inbound message, read it and send a helpful reply
- Update the state file with processed message IDs and `last_checked` timestamp
- Append a brief activity summary to `memory/YYYY-MM-DD.md` (today's date)
- If no new messages, reply: HEARTBEAT_OK

### Send Dallas Weather Report
- Use `curl` to fetch current weather for Dallas, TX from wttr.in: `curl -s "wttr.in/Dallas,TX?format=4"`
- Also fetch a detailed text forecast: `curl -s "wttr.in/Dallas,TX?T"`
- Compose a weather report email with the current conditions and forecast
- Send it to kre8mymedia@gmail.com using the agentmail CLI:
  ```
  API_KEY=$(jq -r '.api_key' ~/workspace/.mail-state.json)
  INBOX_ID=$(jq -r '.inbox_id' ~/workspace/.mail-state.json)
  agentmail inboxes:messages send --api-key "$API_KEY" --inbox-id "$INBOX_ID" \
    --to kre8mymedia@gmail.com \
    --subject "Dallas Weather Report — $(date -u +%Y-%m-%d)" \
    --text "<weather report body>"
  ```
- Only send ONE weather report per day — check `memory/YYYY-MM-DD.md` for a line containing `WEATHER_SENT` before sending. After sending, append `WEATHER_SENT` to today's memory file
- Log the send result to `memory/YYYY-MM-DD.md`
