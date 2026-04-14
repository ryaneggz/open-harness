# agent-browser Usage Rules

## Session Hygiene

- ALWAYS close browser sessions when done: `agent-browser close`
- Use `--session <name>` for isolation between test runs (e.g., `--session uat-<slug>`, `--session recheck-<slug>`)
- Never leave orphaned browser sessions — if a skill errors, close before reporting

## Capture Protocol

- Wait for page load before taking screenshots — use `agent-browser is visible <selector>` to confirm
- If a selector isn't found within 30 seconds, report it as a finding (element missing or slow load)
- Take screenshots at each state transition, not just the final state

## Viewport Naming Convention

Screenshots must follow: `<flow>-<step>-<viewport>.png`
- Viewport labels: `desktop` (1920x1080), `tablet` (768x1024), `mobile` (375x812)
- Example: `login-submit-error-mobile.png`, `home-hero-desktop.png`
- Recheck screenshots: `recheck-UAT-NNN-<viewport>.png`

## Accessibility Snapshots

- Use `agent-browser snapshot -i` for interactive elements (forms, buttons, links)
- Use `agent-browser snapshot -c` for compact page structure overview
- Parse refs (e.g., `@e3`, `@e5`) from snapshot output to interact with elements

## Self-Improvement

After each enforcement:
- If the naming convention causes confusion, simplify it
- If wait timeouts are too aggressive/lenient, adjust the 30-second threshold
- Log false positives (rule triggered but no real issue) to tune the protocol
