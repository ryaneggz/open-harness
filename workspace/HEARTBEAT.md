# Workspace Maintenance

Technical heartbeats (periodic tasks) in `heartbeats/` with `heartbeats.conf`.

## Periodic Audit

1. **SOUL.md** — personality only? No procedures crept in?
2. **MEMORY.md** — duplicated from IDENTITY.md? Logs need distilling?
3. **AGENTS.md** — rules accurate? New decision rules needed?
4. **TOOLS.md** — tools current? Versions correct?
5. **USER.md** — preferences accurate?

## Drift Detection

Watch for:
- Stack info duplicated between IDENTITY.md and MEMORY.md
- Procedures in SOUL.md (belongs in AGENTS.md)
- Environment details in AGENTS.md (belongs in TOOLS.md)
- Growing root files → extract to subdirs
- Undistilled daily logs in `memory/`

## Memory Distillation

1. Read recent `memory/YYYY-MM-DD.md`
2. Extract durable patterns, lessons, decisions
3. Update MEMORY.md
4. Keep daily logs as-is (audit trail)
