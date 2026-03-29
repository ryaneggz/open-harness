# MEMORY.md — Long-Term Memory

<!--
  This file stores curated, durable memories across sessions.
  The agent reads it at session start and updates it as needed.

  Daily logs go to memory/YYYY-MM-DD.md (append-only).
  Periodically distill daily logs into this file during heartbeats.
-->

## Decisions & Preferences

- Managed sandbox worktrees are mounted at `~` inside each container.
- The host-side `oh` CLI is the supervisor; sandboxes are created only from managed git worktrees under `.worktrees/`.
- The sandbox user's home stays container-local and should not be treated as the editable project root.
- Runtime install scripts execute from `/opt/open-harness/install/`; repo changes under `setup/install/` require rebuild/restart to take effect.
- The host-side CLI lives at `setup/oh` and installs globally as `oh`.

## Lessons Learned

## Project Context

- `AGENTS.md` and `CLAUDE.md` must exist at the project root so agents can operate on the harness itself.
