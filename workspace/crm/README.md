# CRM — File-based Sales Data

Single source of truth for the sdr-pallet agent. Everything is owner-editable in Sheets; history is append-only; schema is deterministic.

## Layout

| Path | Purpose |
|------|---------|
| `leads.csv` | Master table — one row per lead, 41 columns, schema in `schema.json` |
| `history.csv` | Append-only event log (`ts, lead_id, event, from_stage, to_stage, actor, ref, note`) |
| `schema.json` | Column definitions, enums, patterns, invariants |
| `stages.json` | 8-stage graph, allowed transitions, stuck thresholds |
| `templates/` | Curated starter emails per vertical × touch × scenario — **never sent**; `cold-email/` uses them as tailoring scaffolds |
| `drafts/<lead-id>/` | Per-lead artifacts (research, cold-email, discovery, handoff) — markdown with frontmatter |
| `sourcing/` | `lead-source/` skill output (research + proposed lead lists, awaiting owner approval) |
| `imports/` | Owner-dropped CSV lists; ingested by `lead-import/` |
| `attention/YYYY-MM-DD.md` | Daily snapshot of the ranked attention list (audit trail) |

## Access Rules

1. **Only `crm-write/` writes to `leads.csv` and `history.csv`.** All other skills call through it.
2. Every `leads.csv` write emits exactly one `history.csv` row.
3. Stage transitions are validated against `stages.json.transitions` — illegal transitions rejected.
4. Enum values are validated against `schema.json` — no freeform strings in enum columns.
5. Terminal stages (`closed_won`, `closed_lost`) freeze the row against `update`; `note` still appends.

## Stage Graph

```
new → researched → contacted → engaged → qualified → quoted → closed_won
                                    ↘                           ↘
                                     closed_lost ←──────────────┘
                                         ↓
                                        new (reactivation only, dq_reason-gated)
```

See `stages.json` for allowed/forbidden transitions, entry requirements, and auto-close rules.

## Related Specs

- `.claude/specs/sdr/01-sales-methodology.md` — BANT-Hybrid, qualification fields, scoring
- `.claude/specs/sdr/02-pallet-domain.md` — `pallet_interest` enum, objection bank
- `.claude/specs/sdr/03-nc-gtm.md` — `vertical` enum, tier thresholds, territory
- `.claude/specs/sdr/04-outbound-execution.md` — cadence, 25 gate checks
- `.claude/specs/sdr/05-agent-architecture.md` — skill contracts, evals, heartbeats
