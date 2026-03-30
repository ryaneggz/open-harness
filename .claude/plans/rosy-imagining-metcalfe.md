# README Quickstart Restructuring

## Context
The README currently has two separate sections: a generic "Quickstart" (clone → `make NAME=dev quickstart` → `make shell` → `claude`) and an "Example Agents" section below it. The user wants these merged so the Quickstart itself leads with a concrete, compelling example — the portfolio-mgr agent that builds a mock $100K portfolio using Ray Dalio's All Weather strategy with yfinance and web search sentiment analysis.

## Plan

### Replace lines 7–53 of README.md (old Quickstart + old Example Agents) with a single merged Quickstart:

1. **Step 1: Fork/clone** — same as before
2. **Step 2: Start claude in plan mode** — `claude --permission-mode plan`
3. **Step 3: Tell it to build the portfolio-mgr** — featured prompt with description in a blockquote
4. **Step 4: Enter the sandbox** — `make NAME=portfolio-mgr shell` + `claude`
5. **Prerequisites** — preserved as-is
6. **"More example agents"** (h3) — table with blog-writer and uptime-monitor (portfolio-mgr removed from table since it's featured above)
7. **"Cleanup"** (h3) — `make NAME=portfolio-mgr clean` + `make list`
8. Trailing `---` separator

### What stays the same
- Everything above line 7 (header/tagline)
- Everything below the old Example Agents section (Why Open Harness, More Ways to Run, Structure, etc.)
- The generic `make quickstart` flow remains documented in "More Ways to Run" section

### File
- `/home/ryaneggz/ruska-ai/sandboxes/README.md` — lines 7–53 replaced

## Verification
- Read the rendered README to confirm the flow reads naturally: fork → plan mode → portfolio-mgr prompt → enter sandbox
- Confirm the old generic quickstart is still accessible under "More Ways to Run"
- Confirm no broken markdown (links, tables, code blocks)
