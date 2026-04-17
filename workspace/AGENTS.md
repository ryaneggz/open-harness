# Operating Procedures

## Rules

1. Read IDENTITY.md, USER.md, MEMORY.md at session start
2. Work within `workspace/` — persists across restarts
3. Next.js project: `projects/next-app/` — run pnpm from there
4. Don't modify `~/install/` (provisioning scripts)
5. `.claude/rules/` loads automatically
6. After `git push`, run `/ci-status` — work not done until CI green
7. Never push `main` or `development` — feature branches + PRs
8. Never skip pre-commit hooks (`--no-verify`)
9. Memory protocol end of every task (below)
10. `CLAUDE.md` symlinks `AGENTS.md`; `MEMORY.md` symlinks `.slack/MEMORY.md`
11. Run `/repair` end of session — verify stack health

## File Responsibilities

| File | Owns | Does NOT contain |
|------|------|-----------------|
| IDENTITY.md | Name, role, mission, stack, URLs | Procedures, personality |
| USER.md | Owner prefs, constraints, goals | Stack details, procedures |
| SOUL.md | Personality, tone, values, guardrails | Coding standards, procedures |
| AGENTS.md | Operating procedures, decision rules | Environment details, tool reference |
| TOOLS.md | Environment, tools, services, workflows | Personality, procedures |
| HEARTBEAT.md | Meta-maintenance routines | Task heartbeats (in `heartbeats/`) |
| MEMORY.md | Learned decisions, lessons, triage history | Static stack info (in IDENTITY.md) |

## Decision Rules

- Personality/tone -> SOUL.md
- User preference/constraint -> USER.md
- Tool/service/workflow -> TOOLS.md
- Operating rule/procedure -> AGENTS.md
- Learned fact/pattern -> MEMORY.md
- Domain knowledge from external doc -> wiki/pages/
- Maintenance check -> HEARTBEAT.md
- Coding standard -> `.claude/rules/`

## Response Style

- Lead with code, not explanations
- Terse. Fragments OK. See `token-conservation.md` rule.
- Commits: `<type>(#<issue>): <description>`
- PRs target `development`

## Memory Protocol

End of every task (heartbeat, skill, interactive):

1. **Log**: Append to `memory/YYYY-MM-DD.md`
2. **Qualify**: Durable learning? Recurring pattern? Skill improvement?
3. **Improve**: Yes → update MEMORY.md. No → move on.
4. **Never skip**: Even no-ops logged.

```markdown
## [Activity] — HH:MM UTC
- **Result**: OP | NO-OP | SKIP
- **Item**: #<N> "<description>" (or "none")
- **Action**: [what was done]
- **Duration**: ~Xs
- **Observation**: [one sentence]
```

## Wiki Protocol

Wiki = persistent, LLM-maintained knowledge base for structured domain knowledge from external sources. Lives in `wiki/`. Distinct from memory system.

**Memory vs Wiki:**
- **Memory** (MEMORY.md + memory/) = operational self-awareness — decisions, patterns, lessons from work
- **Wiki** (wiki/) = structured domain knowledge — entities, concepts, synthesis from external docs

### Directory Structure

| Path | Contents |
|------|----------|
| `wiki/index.md` | Master catalog — titles, types, tags, dates |
| `wiki/log.md` | Operations log (append-only, rotated at 200) |
| `wiki/sources/` | Raw input docs (immutable after ingest) |
| `wiki/pages/` | LLM-generated pages (entity, concept, synthesis) |

### Page Types

| Type | Sources | Description |
|------|---------|-------------|
| `entity` | Raw sources | Person, org, project, tool, product |
| `concept` | Raw sources | Idea, framework, methodology, pattern |
| `synthesis` | Other pages | Cross-cutting theme connecting multiple pages |

### Operations

- **Ingest** (`/wiki-ingest`): source → extract topics → create/update pages → update index + log
- **Query** (`/wiki-query`): question → search index → read pages → synthesize → optionally file back as synthesis
- **Lint** (`/wiki-lint`): health-check — index corruption, orphans, phantoms, stale pages, broken refs, tag drift

### Where Does This Go?

| Signal | Destination |
|--------|-------------|
| Learned from work | MEMORY.md |
| Extracted from external doc | wiki/pages/ |
| Operational decision/preference | MEMORY.md |
| Domain fact/entity info | wiki/pages/ |
| Recurring behavioral pattern | MEMORY.md |
| Relationship between external concepts | wiki/pages/ (synthesis) |

## Skills

| Skill | When |
|-------|------|
| `/ci-status` | After `git push` — poll CI, report pass/fail |
| `/repair` | Repair stack — detect env, test, auto-remediate |
| `/release` | CalVer release — branch, tag, push, GHCR |
| `/destroy` | Tear down — stop containers, remove volumes |
| `/delegate` | Decompose plan → parallel worker agents |
| `/heartbeat` | Create heartbeat and sync daemon — immediately live |
| `/compress` | Compress identity files/rules (~46% token savings) |
| `/prd` | Generate Product Requirements Document |
| `/ralph` | Convert PRD to `.ralph/prd.json` |
| `/quality-gate` | Validate decisions against thresholds |
| `/strategy-review` | Measure decision quality over time |
| `/backlog-rank` | Rank issues by PM criteria |
| `/strategic-proposal` | 5 experts + AI council → roadmap |
| `/implement` | Top roadmap item → Ralph loop → draft PR |
| `/issue-triage` | Triage issues with sub-agents + council |
| `/wiki-ingest` | Process sources into wiki pages — `wiki/sources/` → `wiki/pages/` |
| `/wiki-query` | Search wiki, synthesize answers, optionally file back as synthesis |
| `/wiki-lint` | Health-check wiki — orphans, broken refs, stale pages, tag drift, index integrity |

After `git push` → `/ci-status`. Not done until CI green.

## Heartbeats

- Definition: YAML frontmatter in `heartbeats/*.md` (`schedule`, `agent`, `active` fields)
- Create: `/heartbeat <description>` — writes file + syncs daemon automatically
- Tasks: `heartbeats/` directory
- Logs: `heartbeats/heartbeat.log`
- Nothing to do → `HEARTBEAT_OK`

## Sub-Agents

Parallel agents in `.claude/agents/`:

| Agent | Perspective |
|-------|------------|
| Implementer | "How I'd build this" |
| Critic | "What could go wrong" |
| PM | "How to break it down" |
| Council | Synthesizes all three (opus) |
| Expert: Product | Data models + features |
| Expert: Docs | Docs + fork showcase |
| Expert: Security | Auth + access control |
| Expert: Registry | Docker registry + licensing |
| Expert: Agent Systems | Agent capabilities |
| Strategic Critic | Challenges roadmap |
| Strategic Council | Synthesizes 5 proposals → roadmap (opus) |

## Slack

Slack bot: `tmux attach -t slack`. Shares skills, memory, agent config.
Auto-starts when `SLACK_APP_TOKEN` + `SLACK_BOT_TOKEN` set.
