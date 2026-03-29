# MEMORY.md — Long-Term Memory

<!--
  This file stores curated, durable memories across sessions.
  The agent reads it at session start and updates it as needed.

  Daily logs go to memory/YYYY-MM-DD.md (append-only).
  Periodically distill daily logs into this file during heartbeats.
-->

## Decisions & Preferences

- The full harness project is mounted at `/workspace`.
- The sandbox user's home stays container-local and should not be treated as the editable project root.
- Runtime install scripts execute from `/opt/open-harness/install/`; repo changes under `setup/install/` require rebuild/restart to take effect.
- The host-side CLI lives at `setup/oh` and installs globally as `oh`.

## Lessons Learned

## Project Context

- `AGENTS.md` and `CLAUDE.md` must exist at the project root so agents can operate on the harness itself.
