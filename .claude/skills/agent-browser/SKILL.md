---
name: agent-browser
description: |
  Open a URL in the headless agent-browser, with a preflight health check.
  Verifies agent-browser is installed and Chromium launches before navigating.
  Errors out with a diagnostic trace if anything fails.
  TRIGGER when: asked to open a page, browse a URL, take a screenshot,
  or test a site with agent-browser.
argument-hint: "<url> [--viewport desktop|mobile] [--session <name>]"
---

# Agent Browser

Open a URL in the headless browser. Runs a health check first — if the browser is broken, errors out with a full diagnostic trace so the user can fix it.

## Instructions

### Step 1 — Parse arguments

Arguments received: `$ARGUMENTS`

- **URL**: `$0` (required)
- **VIEWPORT**: value after `--viewport` flag if present. Default: `desktop`
- **SESSION**: value after `--session` flag if present (optional, for session isolation)

If URL is missing, ask the user to provide it.

### Viewport defaults

| Name | Width | Height |
|------|-------|--------|
| `desktop` | 1920 | 1080 |
| `mobile` | 414 | 896 |

Default is `desktop` if `--viewport` is not specified.

### Step 2 — Preflight health check

Run each check sequentially. If any check fails, **stop immediately** and report the full diagnostic trace to the user.

#### 2a. Check agent-browser is installed

```bash
command -v agent-browser && agent-browser --version 2>&1 || echo "FAIL: agent-browser not found in PATH"
```

If not found, report:

```
agent-browser is not installed.

Fix (inside container):
  pnpm add -g agent-browser@0.8.5
  agent-browser install --with-deps

Or rebuild with INSTALL_BROWSER=true in your compose overlay.
```

**Stop here** — do not continue.

#### 2b. Check Chromium launches

```bash
agent-browser open "about:blank" 2>&1
```

If this fails (non-zero exit, error output mentioning "chrome", "chromium", "ENOENT", "launch", or "sandbox"), report the full error and:

```
Chromium failed to launch. Common causes:

1. Missing system dependencies:
   apt-get install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
     libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
     libpango-1.0-0 libcairo2 libasound2 libxshmfence1 libx11-xcb1 \
     fonts-liberation xdg-utils

2. Chromium not downloaded:
   agent-browser install --with-deps

3. Sandbox permission issue (containers):
   Ensure --no-sandbox is set or container has SYS_ADMIN capability.
```

**Stop here** — do not continue. Close the failed session first:

```bash
agent-browser close 2>/dev/null
```

#### 2c. Verify page loaded

```bash
agent-browser snapshot -c 2>&1
```

If snapshot returns content (even minimal), the browser is healthy. Close the health-check session:

```bash
agent-browser close
```

### Step 3 — Open the target URL with viewport

Set the viewport size based on the selected viewport, then open the URL:

```bash
# Desktop: 1920x1080, Mobile: 375x812
agent-browser open "$URL" --viewport-width $WIDTH --viewport-height $HEIGHT $( [ -n "$SESSION" ] && echo "--session $SESSION" )
```

If `agent-browser open` does not support `--viewport-width`/`--viewport-height` flags, open the URL first, then resize:

```bash
agent-browser open "$URL" $( [ -n "$SESSION" ] && echo "--session $SESSION" )
agent-browser execute "await page.setViewportSize({ width: $WIDTH, height: $HEIGHT })"
```

If this fails, report the error with the full output.

### Step 4 — Confirm page loaded

```bash
agent-browser snapshot -c
```

Report a summary of what loaded (page title, key elements visible).

### Step 5 — Report

```
Browser ready.

  URL:      $URL
  Viewport: $VIEWPORT ($WIDTHx$HEIGHT)
  Session:  $SESSION (or "default")

  Next steps:
    agent-browser screenshot <path>       # capture the page
    agent-browser snapshot -i             # interactive elements
    agent-browser is visible "<selector>" # wait for element
    agent-browser close                   # end session (always do this)
```

## Session Hygiene

- ALWAYS close browser sessions when done: `agent-browser close`
- Use `--session <name>` for isolation between concurrent test runs
- If any step errors, close the session before reporting to the user
