# 05 — Agent Architecture (Integration Spec)

> **Role in the 5-spec set**: This is the load-bearing integration spec. The other four specs define *content* (methodology, pallet domain, NC/GTM, outbound copy). This spec defines *structure* — how that content is realized as files, skills, heartbeats, and guardrails inside Open Harness. Every place where content must be supplied by another spec is marked **RESOLVED IN SYNTHESIS** with the source spec.

## Context

**Sandbox**: `sdr-pallet`
**Branch**: `agent/sdr-pallet` (cut from `development`)
**Worktree**: `.worktrees/agent/sdr-pallet/`
**Workspace root inside worktree**: `.worktrees/agent/sdr-pallet/workspace/`
**Issue prefix**: `agent(#N): sdr-pallet`

The agent is a Claude Code agent running inside a Dev Container provisioned by `/provision`. Its workspace is bind-mounted from the worktree, so host-side writes appear instantly inside the container. This spec assumes the orchestrator conventions in `/home/sandbox/harness/CLAUDE.md` and `/home/sandbox/harness/workspace/CLAUDE.md` apply unchanged.

The agent owns one concrete pipeline: source → research → qualify → outreach → discovery → pipeline-review — with all state persisted as tracked files under `workspace/crm/`. No external CRM, no live email send, no API calls to lead databases in scope for v1.

---

## Workspace File Map

```
.worktrees/agent/sdr-pallet/
├── .openharness/
│   └── config.json                             # compose overlays (see § Compose Overlays)
└── workspace/
    ├── IDENTITY.md                             # rewrite — name/role/mission/stack
    ├── SOUL.md                                 # rewrite — sales persona
    ├── USER.md                                 # rewrite — NC pallet company profile
    ├── MEMORY.md                               # seed — objections, heuristics (symlink → .slack/MEMORY.md)
    ├── HEARTBEAT.md                            # rewrite — meta-maintenance only
    ├── AGENTS.md                               # UNTOUCHED — orchestrator-owned (symlink → CLAUDE.md)
    ├── CLAUDE.md                               # UNTOUCHED — orchestrator-owned
    ├── TOOLS.md                                # UNTOUCHED — orchestrator-owned
    ├── heartbeats/
    │   ├── morning-pipeline.md                 # daily 08:00 ET
    │   ├── weekly-pipeline-review.md           # Mondays 09:00 ET
    │   ├── stuck-lead-sweep.md                 # Wed+Fri 10:00 ET
    │   └── memory-distill.md                   # Fridays 17:00 ET
    ├── wiki/
    │   └── sources/
    │       ├── pallet-industry-primer.md       # RESOLVED IN SYNTHESIS: Pallet Domain spec
    │       ├── nc-logistics-context.md         # RESOLVED IN SYNTHESIS: NC/GTM spec
    │       └── sdr-playbook.md                 # RESOLVED IN SYNTHESIS: Methodology + Outbound specs
    ├── crm/
    │   ├── README.md                           # schema reference; how to read/write
    │   ├── schema.json                         # column definitions + enums (§ crm/schema.json below)
    │   ├── stages.json                         # stage graph + transitions (§ crm/stages.json below)
    │   ├── leads.csv                           # master table (header-only on scaffold)
    │   ├── history.csv                         # append-only event log (header-only on scaffold)
    │   └── drafts/
    │       └── .gitkeep                        # <lead-id>/*.md created on demand
    └── .claude/
        └── skills/
            ├── crm-read/SKILL.md               # deterministic query
            ├── crm-write/SKILL.md              # deterministic upsert + validation
            ├── cold-email/SKILL.md             # LLM-generative draft
            ├── discovery-call/SKILL.md         # LLM-generative script
            ├── lead-research/SKILL.md          # LLM-generative account one-pager
            ├── pipeline-review/SKILL.md        # deterministic roll-up
            └── outreach-gate/SKILL.md          # deterministic threshold check (cloned from quality-gate/)
```

Notes on the tree:
- `AGENTS.md`, `CLAUDE.md`, `TOOLS.md`, `.claude/rules/*` are orchestrator-owned procedures that apply to every agent. Do not modify them in scaffolding.
- `MEMORY.md` symlinks to `.slack/MEMORY.md` per `workspace/CLAUDE.md` rule #10 — scaffold only the target.
- `crm/drafts/<lead-id>/` directories are created on-demand by skills, not pre-scaffolded.
- `heartbeats/heartbeat.log` is runtime, gitignored.

---

## Identity File Allocations

Each file owns exactly one concern (per `workspace/CLAUDE.md` File Responsibilities table). Drift between files is a lint failure.

### `IDENTITY.md` — name, role, mission, stack, URLs, branch

Contents:
- **Name**: `sdr-pallet`
- **Role**: Sales Development Representative (outbound)
- **Mission**: one sentence — source, qualify, and hand off pallet-buying prospects in NC/Southeast
- **Stack**: Claude Code + file-CRM (CSV/JSON) + wiki + Slack (optional)
- **Public URL**: Cloudflare tunnel URL (populated post-provision)
- **Branch**: `agent/sdr-pallet` → PR to `development`
- **Repo**: `<owner>/<repo>` (from issue metadata)
- **Sandbox**: `sdr-pallet`
- **Heartbeats**: list — `morning-pipeline`, `weekly-pipeline-review`, `stuck-lead-sweep`, `memory-distill`
- **Memory chain**: SOUL.md (persona) → USER.md (customer) → AGENTS.md (procedures) → TOOLS.md (env) → MEMORY.md (learned) → `memory/` (daily logs)

Must NOT contain: procedures, personality, objection scripts, ICP thresholds.

### `SOUL.md` — personality, tone, values, guardrails (sales persona)

Contents — rewrites the full-stack-dev template to an SDR persona. **RESOLVED IN SYNTHESIS: Methodology spec** supplies the discipline framework name (MEDDIC / BANT / SPIN / Challenger) to reference in "Values". **RESOLVED IN SYNTHESIS: Outbound spec** supplies the tone register (direct / consultative / conversational).

Section outline (keep each section compressed per `token-conservation.md`):
- **Personality** — consultative, brief, curious; no spray-and-pray; reply-worthy first lines
- **Tone** — [resolved from Outbound spec]
- **Values** — correctness > coverage, signal > noise, [framework from Methodology spec] discipline
- **Guardrails** — never invent prospect facts; never send live mail; never bypass outreach-gate; cite sources for all claims about the prospect

Must NOT contain: procedures (in AGENTS.md), stack details (in TOOLS.md), ICP values (in USER.md).

### `USER.md` — owner preferences, company profile, territory, ICP

Contents — rewrites the orchestrator template. This file defines the *principal* (the pallet company whose SDR the agent is). **RESOLVED IN SYNTHESIS: Pallet Domain spec** supplies product enum values. **RESOLVED IN SYNTHESIS: NC/GTM spec** supplies territory + vertical + tier definitions.

Section outline:
- **Principal** — NC HQ pallet manufacturer/distributor (company name TBD during scaffolding)
- **Products offered** — [resolved from Pallet Domain spec] — the list of SKUs this principal actually sells
- **Territory** — [resolved from NC/GTM spec] — states + freight corridors
- **ICP** — [resolved from NC/GTM spec] — vertical list + tier thresholds (volume/lane/use-case)
- **Owner preferences** — small focused commits, PR-gated reviews, CI green before done, no live email without explicit approval
- **Goals** — qualified meetings booked per week target (number set by owner post-scaffold)
- **Constraints** — branch `agent/sdr-pallet`, PRs target `development`, memory protocol mandatory

Must NOT contain: stack details, procedures, personality.

### `MEMORY.md` — learned decisions, lessons, triage history (seeded)

Contents — seed entries the agent can refine. **RESOLVED IN SYNTHESIS: Methodology spec** supplies qualifying-question templates. **RESOLVED IN SYNTHESIS: Outbound spec** supplies objection→response pairs and banned-phrase rationale.

Section outline:
- **Seed: Common objections + responses** — [resolved from Outbound spec]
- **Seed: Qualifying questions** — [resolved from Methodology spec]
- **Seed: NC/Southeast trucking lane notes** — [resolved from NC/GTM spec]
- **Decision log** — empty on scaffold; agent appends
- **Lessons** — empty on scaffold
- **Triage history** — empty on scaffold

Must NOT contain: static stack info (IDENTITY.md), personality (SOUL.md), active procedures (AGENTS.md).

### `HEARTBEAT.md` — meta-maintenance only

Per `workspace/CLAUDE.md`: "Meta-maintenance routines ... Does NOT contain: Task heartbeats (in `heartbeats/`)". This file is a human-readable audit checklist, not cron tasks.

Section outline (mostly unchanged from template — this file is about *drift detection* and *memory distillation*):
- **Periodic audit** — check each identity file for ownership drift
- **Drift detection** — stack info in MEMORY.md? procedures in SOUL.md? ICP in IDENTITY.md?
- **Memory distillation** — distill `memory/YYYY-MM-DD.md` logs into MEMORY.md

Must NOT contain: task heartbeats (those live in `heartbeats/*.md` as YAML-frontmatter markdown).

---

## `crm/schema.json`

Purpose: defines column types, allowed enums, and constraints for `leads.csv`. `crm-write` validates every row against this file before appending.

> **Final column list** is **RESOLVED IN SYNTHESIS**:
> - `stage` enum comes from Methodology spec (§ 01-sales-methodology.md § Stages).
> - `qualification_*` fields come from Methodology spec (e.g., MEDDIC → `qual_metrics`, `qual_economic_buyer`, `qual_decision_criteria`, `qual_decision_process`, `qual_identify_pain`, `qual_champion`; BANT → `qual_budget`, `qual_authority`, `qual_need`, `qual_timing`). The field names below use MEDDIC placeholders — **swap at synthesis** if the Methodology spec picks a different framework.
> - `pallet_interest` enum comes from Pallet Domain spec (§ 02-pallet-domain.md § Product Taxonomy).
> - `vertical` enum and `tier` enum come from NC/GTM spec (§ 03-nc-gtm.md § ICP).

```json
{
  "version": "1",
  "file": "crm/leads.csv",
  "delimiter": ",",
  "quote": "\"",
  "encoding": "utf-8",
  "primary_key": "id",
  "columns": [
    { "name": "id",                  "type": "string",  "required": true,  "pattern": "^L-[0-9]{6}$" },
    { "name": "company",             "type": "string",  "required": true,  "max_length": 120 },
    { "name": "domain",              "type": "string",  "required": false, "pattern": "^[a-z0-9.-]+\\.[a-z]{2,}$" },
    { "name": "city",                "type": "string",  "required": false },
    { "name": "state",               "type": "enum",    "required": true,  "values": ["NC","SC","VA","GA","TN","FL","AL","KY","WV","OTHER"], "synthesis_note": "RESOLVED IN SYNTHESIS: NC/GTM spec may expand/restrict this list" },
    { "name": "vertical",            "type": "enum",    "required": true,  "values": ["__RESOLVED_FROM_NC_GTM_SPEC__"], "synthesis_note": "RESOLVED IN SYNTHESIS: NC/GTM spec § ICP supplies enum" },
    { "name": "tier",                "type": "enum",    "required": true,  "values": ["A","B","C"], "synthesis_note": "RESOLVED IN SYNTHESIS: NC/GTM spec may rename or expand tier labels" },
    { "name": "contact_name",        "type": "string",  "required": false },
    { "name": "contact_title",       "type": "string",  "required": false },
    { "name": "contact_email",       "type": "string",  "required": false, "pattern": "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$" },
    { "name": "contact_phone",       "type": "string",  "required": false, "pattern": "^\\+?[0-9 ()-]{7,}$" },
    { "name": "pallet_interest",     "type": "enum_set", "required": false, "delimiter": "|", "values": ["__RESOLVED_FROM_PALLET_DOMAIN_SPEC__"], "synthesis_note": "RESOLVED IN SYNTHESIS: Pallet Domain spec § Product Taxonomy supplies enum; cell uses pipe delimiter e.g. GMA_48x40|heat_treated" },
    { "name": "est_volume_weekly",   "type": "integer", "required": false, "min": 0 },
    { "name": "lane_hint",           "type": "string",  "required": false, "synthesis_note": "RESOLVED IN SYNTHESIS: NC/GTM spec may define a lane enum (I40|I85|I95|PORT_WILM) — if so, switch type to enum_set" },
    { "name": "stage",               "type": "enum",    "required": true,  "values": ["__RESOLVED_FROM_METHODOLOGY_SPEC__"], "default": "new", "synthesis_note": "RESOLVED IN SYNTHESIS: Methodology spec § Stages supplies stage enum and default" },
    { "name": "qual_metrics",            "type": "string", "required": false, "synthesis_note": "RESOLVED IN SYNTHESIS: Methodology spec — rename/remove if not MEDDIC" },
    { "name": "qual_economic_buyer",     "type": "string", "required": false, "synthesis_note": "RESOLVED IN SYNTHESIS: Methodology spec" },
    { "name": "qual_decision_criteria",  "type": "string", "required": false, "synthesis_note": "RESOLVED IN SYNTHESIS: Methodology spec" },
    { "name": "qual_decision_process",   "type": "string", "required": false, "synthesis_note": "RESOLVED IN SYNTHESIS: Methodology spec" },
    { "name": "qual_identify_pain",      "type": "string", "required": false, "synthesis_note": "RESOLVED IN SYNTHESIS: Methodology spec" },
    { "name": "qual_champion",           "type": "string", "required": false, "synthesis_note": "RESOLVED IN SYNTHESIS: Methodology spec" },
    { "name": "qual_score",              "type": "integer", "required": false, "min": 0, "max": 100, "synthesis_note": "RESOLVED IN SYNTHESIS: Methodology spec § Scoring formula" },
    { "name": "owner",               "type": "string",  "required": true,  "default": "sdr-pallet" },
    { "name": "source",              "type": "enum",    "required": true,  "values": ["inbound","referral","list","research","event","other"] },
    { "name": "next_action",         "type": "string",  "required": false, "max_length": 140 },
    { "name": "next_action_date",    "type": "date",    "required": false, "format": "YYYY-MM-DD" },
    { "name": "last_contact_date",   "type": "date",    "required": false, "format": "YYYY-MM-DD" },
    { "name": "notes_ref",           "type": "string",  "required": false, "pattern": "^crm/drafts/L-[0-9]{6}/.+\\.md$" },
    { "name": "created_at",          "type": "datetime","required": true,  "format": "YYYY-MM-DDTHH:MM:SSZ", "auto": "now" },
    { "name": "updated_at",          "type": "datetime","required": true,  "format": "YYYY-MM-DDTHH:MM:SSZ", "auto": "now_on_write" }
  ],
  "invariants": [
    "id is unique",
    "stage value is listed in stages.json.states",
    "every row written appends a corresponding entry in history.csv"
  ]
}
```

---

## `crm/stages.json`

Purpose: declares the finite-state graph of allowed stage transitions. `crm-write` rejects any transition not listed in `transitions`.

> **RESOLVED IN SYNTHESIS: Methodology spec § Stages** supplies the authoritative list of state names and the allowed transition edges. The values below are placeholders that preserve the shape — replace state names at synthesis.

```json
{
  "version": "1",
  "initial": "new",
  "terminal": ["closed_won", "closed_lost", "disqualified"],
  "states": [
    { "name": "new",           "description": "Lead exists, no outreach yet" },
    { "name": "researched",    "description": "Account one-pager written to crm/drafts/<id>/research.md" },
    { "name": "contacted",     "description": "First outbound sent" },
    { "name": "engaged",       "description": "Prospect replied (any channel)" },
    { "name": "qualified",     "description": "Qualification fields populated above threshold" },
    { "name": "demo_booked",   "description": "Meeting on calendar" },
    { "name": "proposal",      "description": "Pricing/spec sent" },
    { "name": "closed_won",    "description": "Signed / PO issued" },
    { "name": "closed_lost",   "description": "Prospect declined or went silent >30 days post-proposal" },
    { "name": "disqualified",  "description": "Out of ICP, do-not-contact, or bad data" }
  ],
  "transitions": [
    { "from": "new",         "to": ["researched", "disqualified"] },
    { "from": "researched",  "to": ["contacted", "disqualified"] },
    { "from": "contacted",   "to": ["engaged", "closed_lost", "disqualified"] },
    { "from": "engaged",     "to": ["qualified", "closed_lost", "disqualified"] },
    { "from": "qualified",   "to": ["demo_booked", "closed_lost"] },
    { "from": "demo_booked", "to": ["proposal", "closed_lost"] },
    { "from": "proposal",    "to": ["closed_won", "closed_lost"] }
  ],
  "stuck_thresholds_days": {
    "new": 3,
    "researched": 2,
    "contacted": 7,
    "engaged": 5,
    "qualified": 10,
    "demo_booked": 14,
    "proposal": 21
  },
  "synthesis_note": "RESOLVED IN SYNTHESIS: Methodology spec § Stages supplies canonical names, transitions, and stuck thresholds. Preserve transitions as a whitelist — crm-write rejects anything not listed."
}
```

---

## `crm/leads.csv` — header row

Column order matches `schema.json`. Snake_case. No trailing spaces. Final column list resolved in synthesis (see `schema.json` synthesis notes).

```
id,company,domain,city,state,vertical,tier,contact_name,contact_title,contact_email,contact_phone,pallet_interest,est_volume_weekly,lane_hint,stage,qual_metrics,qual_economic_buyer,qual_decision_criteria,qual_decision_process,qual_identify_pain,qual_champion,qual_score,owner,source,next_action,next_action_date,last_contact_date,notes_ref,created_at,updated_at
```

---

## `crm/history.csv` — header row

Append-only event log. Every `crm-write` call emits exactly one row here. Ordered by `ts` monotonically (enforced on write).

```
ts,lead_id,event,from_stage,to_stage,actor,ref,note
```

Column semantics:
- `ts` — ISO 8601 UTC `YYYY-MM-DDTHH:MM:SSZ`
- `lead_id` — FK to `leads.csv.id`
- `event` — enum: `create` | `update` | `stage_change` | `email_draft` | `call_script` | `research` | `note` | `disqualify`
- `from_stage` / `to_stage` — populated only when `event=stage_change`; else empty
- `actor` — skill name that wrote the row (`crm-write`, `cold-email`, `discovery-call`, `lead-research`, `pipeline-review`) or `human` for manual edits
- `ref` — relative path to artifact (e.g., `crm/drafts/L-000042/2026-04-18T13-22Z-cold.md`) or empty
- `note` — ≤ 200 chars, single-line, no commas-outside-quotes

---

## Skill Contracts

Seven skills. Two deterministic data-plane skills (`crm-read`, `crm-write`) are the only writers to `leads.csv` / `history.csv`. All other skills MUST call `crm-write` to persist state — no freehand CSV writes.

Skill file layout (each skill):
```
.claude/skills/<name>/
├── SKILL.md                # frontmatter (name, description, TRIGGER) + instructions
└── (optional assets)
```

### 1. `crm-read` — deterministic query

- **Type**: Deterministic. No LLM reasoning. Pure parse + filter.
- **Input**: CLI-style args as natural language the skill parses, e.g. `stage=contacted owner=sdr-pallet days_stuck>5 vertical=brewery limit=20`. The skill parses and applies filters directly.
- **Output**: Stdout table + optional JSON when `format=json`. Example columns: `id, company, state, vertical, stage, next_action_date, days_in_stage`.
- **Side effects**: None. Read-only.
- **Determinism guarantee**: Same inputs + same files → byte-identical output. No date-dependent sorting unless `days_stuck` filter used (sort is stable on `id`).
- **Failure modes**: invalid column name → error with allowed columns; malformed CSV → error with line number; empty result → exit 0, empty table.
- **Dependencies**: `schema.json` (column validation), `stages.json` (stuck thresholds).

### 2. `crm-write` — validated upsert + transition enforcement

- **Type**: Deterministic. No LLM reasoning.
- **Input**: one of:
  - `create` — full row fields (id optional — auto-generated `L-NNNNNN` if absent)
  - `update <id> <field>=<value> ...` — partial patch
  - `transition <id> <to_stage> [reason]` — stage change
  - `note <id> <text> [ref=path]` — append event without field change
- **Output**: On success, prints new/updated row + the history row appended. On failure, non-zero exit + error.
- **Side effects**:
  - Appends/rewrites exactly one row in `leads.csv` (atomic: write temp, fsync, rename).
  - Appends exactly one row in `history.csv`.
  - Sets `updated_at = now()` on every write; `created_at` on create only.
- **Determinism guarantee**: Pure validation + atomic append. No LLM. Retries on transient `EAGAIN` but idempotent on `ts` collision (appends `-1`, `-2` suffix).
- **Validation rules**:
  - Every column validated against `schema.json` type + pattern + enum.
  - `id` must be unique on create; must exist on update/transition/note.
  - Stage transitions validated against `stages.json.transitions` — rejected if not listed.
  - Transitioning to a terminal state freezes the row (subsequent `update` calls reject except for `note`).
- **Failure modes**: invalid enum → error listing allowed values; illegal transition → error listing allowed next states; missing required field → error listing missing fields.
- **Dependencies**: `schema.json`, `stages.json`. No LLM.

### 3. `cold-email` — LLM-generative draft

- **Type**: LLM-gated. Non-deterministic output (temperature > 0).
- **Input**: `lead_id=L-NNNNNN` — looks up the lead via `crm-read`.
- **Output**: Markdown file at `crm/drafts/<lead-id>/<ISO-ts>-cold.md` with frontmatter:
  ```
  ---
  lead_id: L-000042
  skill: cold-email
  created_at: 2026-04-18T13:22:00Z
  channel: email
  gate_status: PENDING | PASS | FAIL
  ---
  Subject: <≤ 60 chars>

  <body ≤ 120 words>

  — <signature block from USER.md>
  ```
- **Side effects**:
  - Writes draft file.
  - Calls `crm-write note <id> "cold-email drafted" ref=<path>` — appends history row with `event=email_draft`.
  - Does NOT send email. Does NOT transition stage. (Transition happens only after the owner signs off + marks sent externally.)
- **Determinism guarantee**: None. LLM generative. Same input may produce different outputs.
- **Required inputs from other specs** — **RESOLVED IN SYNTHESIS**:
  - Outbound spec § Cold Email Template — structural scaffold
  - Outbound spec § Banned Phrases — applied as soft rule in prompt, hard rule in `outreach-gate`
  - Pallet Domain spec — product positioning language
  - NC/GTM spec — lane/vertical talk-track
- **Gate**: MUST call `outreach-gate` before the draft is considered ready. Frontmatter `gate_status` starts `PENDING`; `outreach-gate` flips it to `PASS` or `FAIL`.

### 4. `discovery-call` — LLM-generative script

- **Type**: LLM-gated.
- **Input**: `lead_id=L-NNNNNN`.
- **Output**: Markdown file at `crm/drafts/<lead-id>/<ISO-ts>-discovery.md` — qualifying-question script tailored from the lead record. Must map questions to qualification fields (`qual_*`) so answers can be back-filled via `crm-write update`.
- **Side effects**:
  - Writes draft.
  - Calls `crm-write note ... event=call_script ref=<path>`.
- **Determinism guarantee**: None.
- **Required inputs** — **RESOLVED IN SYNTHESIS**: Methodology spec § Qualification Fields supplies the mapping between questions and `qual_*` columns.

### 5. `lead-research` — LLM-generative account one-pager

- **Type**: LLM-gated. Uses `WebFetch` / `WebSearch` if available.
- **Input**: `lead_id=L-NNNNNN` OR `company="Acme Brewing" state=NC` (creates a new lead).
- **Output**: Markdown file at `crm/drafts/<lead-id>/research.md` — one-pager with sections: Company snapshot, Locations, Recent news, Likely pallet need, Proposed hook.
- **Side effects**:
  - If new company, calls `crm-write create ...` first.
  - Writes research file.
  - Calls `crm-write note ... event=research ref=<path>`.
  - May transition `new → researched` via `crm-write transition`.
- **Determinism guarantee**: None (external web data + LLM).
- **Required inputs** — **RESOLVED IN SYNTHESIS**:
  - NC/GTM spec — likely-pallet-need heuristics per vertical
  - Pallet Domain spec — product fit reasoning

### 6. `pipeline-review` — deterministic roll-up

- **Type**: Deterministic. No LLM. Pure aggregation.
- **Input**: optional `window=7d|30d|mtd|qtd`, `owner=sdr-pallet`.
- **Output**: Markdown table to stdout (heartbeat-friendly):
  - Count by stage
  - Stuck leads (days-in-stage > `stages.json.stuck_thresholds_days[stage]`)
  - Next-7-day actions (`next_action_date` within window)
  - Stage transitions in window (from `history.csv`)
  - Conversion % per stage pair over window
- **Side effects**: None.
- **Determinism guarantee**: Same input + same files + same `as_of` date → byte-identical output. `as_of` defaults to `date -u +%Y-%m-%d` but can be pinned for testing.
- **Dependencies**: `leads.csv`, `history.csv`, `stages.json`.

### 7. `outreach-gate` — deterministic threshold check

Cloned from `workspace/.claude/skills/quality-gate/` and specialized.

- **Type**: Deterministic. No LLM. Regex + word-count + set-membership only.
- **Input**: path to a draft under `crm/drafts/<lead-id>/*.md`.
- **Output**: Stdout report per the `quality-gate` template format:
  ```
  OUTREACH GATE CHECK (as of YYYY-MM-DD)
  ======================================
  Subject length <= 60:     XX   [PASS/FAIL]
  Body word count <= 120:   YY   [PASS/FAIL]
  Banned phrase count:      ZZ   [PASS/FAIL threshold = 0]
  Personalization tokens:   NN   [PASS/FAIL threshold >= 2]
  Prospect facts cited:     MM   [PASS/FAIL threshold >= 1]
  Unsubscribe present:       1   [PASS/FAIL required]

  Overall Gate: PASS/FAIL
  ```
- **Side effects**:
  - Rewrites the draft's frontmatter `gate_status` to `PASS` or `FAIL`.
  - Appends one `history.csv` row via `crm-write note ... event=note note="outreach-gate <PASS|FAIL>"`.
  - On FAIL, does NOT modify the body — it's the author's job to revise.
- **Determinism guarantee**: Full. Pure regex + dictionary lookup.
- **Thresholds** — **RESOLVED IN SYNTHESIS**:
  - Subject max length — Outbound spec § Subject Rules
  - Body max words — Outbound spec § Body Rules
  - Banned phrase list — Outbound spec § Banned Phrases (the regex/dictionary the gate checks against)
  - "Personalization tokens" definition — Outbound spec § Personalization (e.g., regex matching `{company}`, `{city}`, `{vertical-specific term}`)
  - "Prospect facts cited" — Outbound spec § Evidence (e.g., at least one fact pulled from `lead-research` output)

---

## Heartbeat Definitions

Heartbeats are YAML-frontmatter markdown files in `workspace/heartbeats/`. Cron expressions run in the container's timezone (UTC by default). ET offset is shown for author clarity; convert UTC↔ET carefully across DST.

> **Active-hours convention**: SDR cadence runs business days only. Cron expressions restrict to Mon–Fri. Heartbeats reply `HEARTBEAT_OK` on weekends if accidentally triggered.

### `heartbeats/morning-pipeline.md`

Purpose: daily prospecting brief — today's follow-ups, stuck leads, next-7-day actions.

```
---
schedule: "0 13 * * 1-5"
agent: claude
---

# Morning Pipeline

Daily 08:00 ET (13:00 UTC during EST; 12:00 UTC during EDT — accept a ~1h drift).

## Tasks

1. Run `/pipeline-review window=7d`.
2. Surface leads with `next_action_date <= today`.
3. Surface leads exceeding `stuck_thresholds_days[stage]` in `stages.json`.
4. For each stuck lead, suggest one next action (no auto-write).
5. Append summary to `memory/YYYY-MM-DD.md` per Memory Protocol.
6. Reply `HEARTBEAT_OK` if pipeline empty, else print the brief.
```

### `heartbeats/weekly-pipeline-review.md`

Purpose: weekly roll-up for owner review.

```
---
schedule: "0 14 * * 1"
agent: claude
---

# Weekly Pipeline Review

Mondays 09:00 ET.

## Tasks

1. Run `/pipeline-review window=mtd`.
2. Compute stage-to-stage conversion over last 30 days (`history.csv` joins).
3. Highlight: top 3 accelerating leads, top 3 at risk, week's wins/losses.
4. Write report to `memory/YYYY-MM-DD.md` and notify in Slack if configured.
5. Memory Protocol — distill any patterns into `MEMORY.md`.
```

### `heartbeats/stuck-lead-sweep.md`

Purpose: mid-week nudge for leads exceeding stuck threshold.

```
---
schedule: "0 15 * * 3,5"
agent: claude
---

# Stuck Lead Sweep

Wed + Fri 10:00 ET.

## Tasks

1. `/crm-read stage!=closed_won,closed_lost,disqualified days_stuck>threshold`.
2. For each stuck lead, propose ONE of: (a) follow-up email draft via `/cold-email`, (b) disqualify via `/crm-write transition <id> disqualified`, (c) leave note and bump `next_action_date`.
3. Execute (a) by drafting only — gate + send stay manual.
4. Reply `HEARTBEAT_OK` if no stuck leads.
```

### `heartbeats/memory-distill.md`

Purpose: weekly memory hygiene.

```
---
schedule: "0 21 * * 5"
agent: claude
---

# Memory Distill

Fridays 17:00 ET.

## Tasks

1. Read `memory/` entries from the last 7 days.
2. Extract durable patterns, winning objection handles, new ICP signals.
3. Update `MEMORY.md` under "Lessons" and "Decision log".
4. Keep daily logs as-is (audit trail).
5. Reply `HEARTBEAT_OK` if nothing distilled.
```

---

## Compose Overlays — `.openharness/config.json`

Scaffolded at worktree root (NOT in `workspace/`). Read by `/provision`.

```json
{
  "composeOverrides": [
    ".devcontainer/docker-compose.cloudflared.yml",
    ".devcontainer/docker-compose.slack.yml",
    ".devcontainer/docker-compose.git.yml"
  ]
}
```

Overlay rationale:
- **cloudflared** — public URL for future SDR dashboard or Slack-to-web handoff.
- **slack** — inbound channel for prospect replies, heartbeat reports, and human approval loop on outbound drafts.
- **git** — required because we're provisioning from `.worktrees/agent/sdr-pallet/`; `init-env.sh` populates `GIT_COMMON_DIR`. Without this overlay, git operations inside the container fail with dangling worktree references.

Explicitly excluded:
- **postgres** — not needed; file-CRM is the single source of truth for v1.
- **sshd**, **ssh**, **ssh-generate** — agent uses `gh auth setup-git` per `.claude/rules/git.md § Git Authentication`.

---

## Guardrails

Enforced by skill contracts and rules. Violations = immediate stop + surface to owner.

1. **Never send live email.** `cold-email` only drafts. No SMTP/API call. Sending happens externally after owner approves.
2. **Never invent lead data.** `lead-research` must cite sources; `cold-email` must reference facts from `crm/drafts/<id>/research.md`. Unsupported claims block the outreach gate.
3. **Never skip `outreach-gate`.** No draft with `gate_status: PENDING` or `FAIL` is considered deliverable. Owner sign-off requires `gate_status: PASS`.
4. **Never freehand-write `leads.csv` or `history.csv`.** Only `crm-write` touches them. Other skills call through it.
5. **Never push `main` or `development`.** Per `.claude/rules/git.md`. Agent PRs target `development` from `agent/sdr-pallet`.
6. **Never bypass stage validation.** Illegal transitions rejected at `crm-write` — agent surfaces the rejection, does not auto-retry with a legal transition it didn't plan.
7. **Never touch orchestrator-owned files.** `CLAUDE.md`, `AGENTS.md`, `TOOLS.md`, `.claude/rules/` in workspace are orchestrator-owned. Agent edits IDENTITY, SOUL, USER, MEMORY, HEARTBEAT, heartbeats/, wiki/pages/, crm/, .claude/skills/ only.
8. **Never skip the memory protocol.** End of every task — heartbeat, skill, interactive — append to `memory/YYYY-MM-DD.md`, even for no-ops.
9. **Never commit secrets.** `contact_email` and `contact_phone` in `leads.csv` are already in the repo — that's intentional for the file-CRM model. API keys / OAuth tokens / customer PII beyond name+title+email+phone must NOT be committed.
10. **Never skip pre-commit hooks or CI.** `/ci-status` after every push. A push that fails CI is not done.

---

## Eval Criteria

Split into deterministic (fast, automatable) and LLM-judge (slower, human-readable).

### Deterministic checks — run as part of a future `test:sdr` suite

| # | Test | How |
|---|------|-----|
| D1 | `leads.csv` header row matches `schema.json.columns[].name` in order | Parse both, assert equality |
| D2 | `history.csv` header matches the fixed spec above | String compare |
| D3 | Every row in `leads.csv` passes `schema.json` validation | Iterate + validate |
| D4 | Every `stage` value in `leads.csv` is in `stages.json.states[].name` | Set membership |
| D5 | Every `stage_change` event in `history.csv` has a legal `from_stage -> to_stage` per `stages.json.transitions` | Graph walk |
| D6 | `crm-write` rejects an illegal transition (unit test with known-bad input) | Expect non-zero exit |
| D7 | `crm-write` rejects an invalid enum (unit test) | Expect non-zero exit |
| D8 | `pipeline-review` produces byte-identical output for pinned `as_of=<fixture-date>` across 3 runs | Diff |
| D9 | `outreach-gate` fails on a draft containing a banned phrase (unit fixture) | Expect FAIL |
| D10 | `outreach-gate` passes on a known-good draft (unit fixture) | Expect PASS |
| D11 | No file under `crm/` is written by a skill other than `crm-write` (audit history actor column) | Assert `actor` in allowed set |
| D12 | All heartbeat files have valid YAML frontmatter with `schedule` + `agent` fields | Parse + validate |

### LLM-judge checks — periodic, sample-based

| # | Test | Rubric |
|---|------|--------|
| L1 | `cold-email` draft for a sample lead reads as on-brand per `SOUL.md` | Judge prompt scores tone, concision, specificity |
| L2 | `cold-email` draft cites >= 1 prospect-specific fact | Judge checks for entity references matching `lead-research` |
| L3 | `discovery-call` script questions map to `qual_*` columns | Judge marks each question -> column |
| L4 | `lead-research` one-pager covers required sections | Judge checklist |
| L5 | Weekly `pipeline-review` report is actionable (owner-testable) | Owner thumb-up/down weekly, track trend |

### Smoke tests (run once post-provision)

| # | Test | Expected |
|---|------|----------|
| S1 | `claude` boots inside sandbox, asks "who are you?" | Answers as SDR for NC pallet co, cites USER.md |
| S2 | `/crm-read` on empty `leads.csv` | Empty table, exit 0 |
| S3 | `/crm-write create company="Acme Brewing" state=NC vertical=<from synthesis> tier=B source=research` | Row appended, `id` auto-generated, history row emitted |
| S4 | `/cold-email lead_id=<S3 id>` | Draft written; `outreach-gate` run; history row emitted |
| S5 | `/pipeline-review` on the 1-lead pipeline | Table shows 1 lead in `new`, 0 stuck |
| S6 | `openharness heartbeat status sdr-pallet` | Lists 4 heartbeats with next fire times |

---

## Onboarding Steps Inside Sandbox

After `/provision` completes, one-time steps:

```bash
openharness shell sdr-pallet                       # enter sandbox
gh auth login && gh auth setup-git                 # GitHub auth (no SSH needed)
claude                                             # authenticate Claude Code (OAuth)
# Optional:
pi                                                 # Pi Agent (Slack + heartbeat automations)
```

Smoke-test inside the sandbox:

```bash
cd ~/harness/workspace
cat IDENTITY.md                                    # should read "SDR", not "Full Stack Developer"
ls crm/                                            # schema.json, stages.json, leads.csv, history.csv, drafts/, README.md
claude                                             # then ask: "who are you?" — expect SDR role answer
```

Bootstrap a test lead (inside claude):

```
/crm-write create company="Acme Brewing" state=NC vertical=<from_synthesis> tier=B source=research
/lead-research lead_id=L-000001
/cold-email lead_id=L-000001
/outreach-gate crm/drafts/L-000001/<ts>-cold.md
/pipeline-review
```

Expected: one lead in `new` -> `researched`, one cold-email draft marked `gate_status: PASS` or `FAIL`, history.csv has 4+ rows.

---

## Open Questions (Synthesis Inputs)

Every item below must be resolved by reading another spec before scaffolding can proceed deterministically. Each is annotated with its source spec.

### From `01-sales-methodology.md` (Methodology spec)

- M1. Qualification framework name (MEDDIC vs BANT vs SPIN vs Challenger vs hybrid) — determines `qual_*` column names and count in `schema.json`.
- M2. Stage enum list + default — replaces placeholders in `stages.json.states` and `schema.json.columns.stage.values`.
- M3. Stage transition edges — replaces `stages.json.transitions`.
- M4. Stuck thresholds per stage — replaces `stages.json.stuck_thresholds_days`.
- M5. Qualification scoring formula — defines how `qual_score` is computed from `qual_*` fields.
- M6. Discovery question -> `qual_*` column mapping — consumed by `discovery-call` skill.

### From `02-pallet-domain.md` (Pallet Domain spec)

- P1. Product SKU enum — replaces placeholder in `schema.json.columns.pallet_interest.values`.
- P2. Product positioning snippets per SKU — consumed by `cold-email` and `lead-research`.
- P3. Pricing levers list — consumed by `USER.md § Products offered`.

### From `03-nc-gtm.md` (NC/GTM spec)

- G1. Vertical enum — replaces placeholder in `schema.json.columns.vertical.values`.
- G2. Tier enum + thresholds (what makes a lead A vs B vs C) — replaces placeholder in `schema.json.columns.tier.values` and scoring.
- G3. State enum scope — may narrow or expand `schema.json.columns.state.values`.
- G4. Lane enum (I40 / I85 / I95 / PORT_WILM / ...) — decides whether `lane_hint` becomes `lane` with `enum_set` type.
- G5. Likely-pallet-need heuristic per vertical — consumed by `lead-research`.
- G6. Territory list for `USER.md`.

### From `04-outbound-execution.md` (Outbound spec)

- O1. Cold-email subject max length, body max words — replaces `outreach-gate` placeholder thresholds.
- O2. Banned phrase regex/dictionary — replaces `outreach-gate` banned-phrase check.
- O3. Personalization-token definition — replaces `outreach-gate` personalization check.
- O4. Evidence-cited rule — replaces `outreach-gate` prospect-facts check.
- O5. Cadence days (when to follow up) — informs `stuck_thresholds_days` cross-check.
- O6. Objection -> response seed pairs — replaces `MEMORY.md` seed content.
- O7. Tone register — replaces `SOUL.md § Tone`.

### Locally owned (this spec decides)

- A1. Heartbeat cron expressions — set above (13:00 / 14:00 / 15:00 / 21:00 UTC on business days). Approved unless Methodology spec demands a different cadence.
- A2. `id` format — `L-NNNNNN` zero-padded 6-digit. Approved.
- A3. CSV delimiter — `,`. Approved.
- A4. File locations — `workspace/crm/`. Approved.
- A5. Timezone — UTC inside container, author comments in ET. Approved.
- A6. `outreach-gate` is deterministic — no LLM. Approved.
- A7. `crm-read` / `crm-write` are deterministic — no LLM. Approved.

---

## Synthesis Checklist (for the synthesis step that consumes all 5 specs)

Mechanical actions only. Every item here is a direct substitution, not a judgement call.

- [ ] Replace `__RESOLVED_FROM_METHODOLOGY_SPEC__` in `schema.json.columns.stage.values` with values from Methodology § Stages.
- [ ] Replace `__RESOLVED_FROM_PALLET_DOMAIN_SPEC__` in `schema.json.columns.pallet_interest.values` with values from Pallet Domain § Product Taxonomy.
- [ ] Replace `__RESOLVED_FROM_NC_GTM_SPEC__` in `schema.json.columns.vertical.values` with values from NC/GTM § ICP.
- [ ] Replace `stages.json.states[]`, `stages.json.transitions[]`, `stages.json.stuck_thresholds_days{}` with Methodology spec values.
- [ ] Rename/adjust `qual_*` columns in `schema.json` to match Methodology framework choice.
- [ ] Update `leads.csv` header row to reflect any column renames from the previous two items.
- [ ] Write Outbound spec's subject/body/banned/personalization/evidence rules into `outreach-gate/SKILL.md`.
- [ ] Write Methodology spec's discovery-question -> `qual_*` mapping into `discovery-call/SKILL.md`.
- [ ] Write NC/GTM spec's likely-pallet-need heuristics into `lead-research/SKILL.md`.
- [ ] Seed `MEMORY.md` with Outbound spec's objection pairs, Methodology spec's question templates, NC/GTM spec's lane notes.
- [ ] Write Pallet Domain spec's product list into `USER.md § Products offered`.
- [ ] Write NC/GTM spec's territory + ICP into `USER.md § Territory` and `USER.md § ICP`.
- [ ] Write Outbound spec's tone register into `SOUL.md § Tone`.
- [ ] Copy Pallet Domain spec text into `wiki/sources/pallet-industry-primer.md`.
- [ ] Copy NC/GTM spec text into `wiki/sources/nc-logistics-context.md`.
- [ ] Copy Methodology + Outbound spec text into `wiki/sources/sdr-playbook.md`.

After substitution, run deterministic checks D1–D12 against the scaffolded workspace. All must pass before `/provision`.
