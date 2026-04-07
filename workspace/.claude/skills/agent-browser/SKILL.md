---
name: agent-browser
description: |
  Navigate, interact with, and screenshot the running app using agent-browser CLI.
  TRIGGER when: verifying UI changes, QA-ing a feature, taking screenshots, or
  debugging frontend issues in the browser.
---

# Agent Browser

Automate browser interactions and capture screenshots for QA verification.

## Instructions

1. Ensure the dev server is running (`npm run dev` in `next-app/`)
2. Open the target URL
3. Perform the requested interaction or verification
4. Save screenshots to `.claude/screenshots/`

## Commands

```bash
# Open a page
agent-browser open "https://next-postgres-shadcn.ruska.dev"

# Navigation & interaction
agent-browser click "<selector>"
agent-browser type "<selector>" "<text>"
agent-browser fill "<selector>" "<text>"
agent-browser press "Enter"
agent-browser scroll down
agent-browser wait <selector|ms>

# Inspection
agent-browser snapshot                          # accessibility tree (for AI)
agent-browser eval '<js expression>'            # run JS in page context

# Screenshots
agent-browser screenshot .claude/screenshots/<name>.png

# Cleanup
agent-browser close
```

## Screenshot Naming

Use descriptive names with context:

```
.claude/screenshots/<feature>-<state>.png
```

Examples: `dashboard-empty.png`, `login-error.png`, `settings-dark-mode.png`

## Workflow

1. `agent-browser open <url>`
2. `agent-browser snapshot` -- read the page structure
3. Interact as needed (`click`, `type`, `fill`, etc.)
4. `agent-browser screenshot .claude/screenshots/<name>.png`
5. `agent-browser close`
