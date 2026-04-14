# Projects

This directory is reserved for local project source code that may be needed for reference during UAT testing.

The UAT agent does **not** build, compile, or modify application code. It only tests deployed web applications via `agent-browser` (headless Chromium).

## When to use this directory

- Clone a project's source code here if the agent needs to understand page structure, routes, or component names to write more precise reproduction steps
- Reference only — the agent reads source code for context but never modifies it

## When NOT to use this directory

- The agent does not need source code to perform visual UAT — it tests the deployed app URL directly
- Do not run dev servers or build processes from here — the agent tests live deployments, not local builds

## Project registration

Projects are registered for testing in `uat/projects.json`, not by placing source code here. See the workspace README for details.
