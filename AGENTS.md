# next-postgres-shadcn — Full Stack Developer Workspace

A Next.js + TypeScript + PostgreSQL + shadcn/ui development workspace running inside an [Open Harness](https://github.com/ryaneggz/open-harness) sandbox.

## Stack

- Next.js 16 (App Router, TypeScript strict, Turbopack)
- PostgreSQL 16 (Docker Compose, Prisma ORM)
- shadcn/ui + Tailwind CSS v4
- next-themes (light/dark/system)
- next-pwa (Progressive Web App)
- Cloudflared tunnel → `next-postgres-shadcn.ruska.dev`

## Working Directory

Your code lives in `workspace/projects/next-app/`. Run all npm commands from there.

## Identity & Context

| File | Purpose |
|------|---------|
| `workspace/IDENTITY.md` | Name, role, mission, stack, URLs |
| `workspace/USER.md` | Owner preferences and constraints |
| `workspace/SOUL.md` | Personality, tone, values, guardrails |
| `workspace/AGENTS.md` | Operating procedures, decision rules, memory protocol |
| `workspace/TOOLS.md` | Environment, tools, services, workflows |
| `workspace/HEARTBEAT.md` | Meta-maintenance routines |
| `workspace/MEMORY.md` | Learned decisions, lessons, triage history |

## Quick Reference

| Resource | Value |
|----------|-------|
| Dev server | `npm run dev` (port 3000, binds `0.0.0.0`) |
| Public URL | `https://next-postgres-shadcn.ruska.dev` |
| Database | PostgreSQL 16 — `sandbox:sandbox@postgres:5432/sandbox` |
| Prisma schema | `workspace/projects/next-app/prisma/schema.prisma` |
| UI components | `workspace/projects/next-app/src/components/ui/` (shadcn) |
| Tests | `npm test` (Vitest) / `npm run test:e2e` (Playwright) |
| Tunnel start | `cloudflared tunnel --config ~/.cloudflared/config-next-postgres-shadcn.yml run next-postgres-shadcn` |

## Project Structure

```
workspace/
  projects/
    next-app/           # Next.js project
      src/app/          # App Router routes
      src/components/   # React components (ui/ for shadcn)
      src/lib/          # Utilities
      prisma/           # Database schema & migrations
  .claude/skills/       # Slash command skills (see below)
  .claude/agents/       # Sub-agent definitions (implementer, critic, pm, council)
  .claude/rules/        # Coding standards + workflow rules
  .ralph/               # Autonomous agent loop (PRD → implement → validate)
  heartbeats/           # Periodic task definitions
  memory/               # Daily append-only logs
  IDENTITY.md           # Name, role, mission, stack, URLs
  USER.md               # Owner preferences and constraints
  SOUL.md               # Personality, tone, values, guardrails
  AGENTS.md             # Operating procedures, decision rules
  TOOLS.md              # Environment, tools, services, workflows
  HEARTBEAT.md          # Meta-maintenance routines
  MEMORY.md             # Learned decisions, lessons, triage history
```

## Skills

### Host-level skills (`.claude/skills/`)

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `/delegate` | Decomposing a plan into parallel tasks | Decompose plan into tasks, spawn parallel worker agents in waves |
| `/diagnose` | After crashes, failed builds, broken stack | Diagnose and fix the full stack (container, deps, Prisma, DB, dev server, tunnel) |
| `/release` | Cutting a new version | Cut a CalVer release (branch, tag, push, CI builds + pushes to GHCR) |
| `/destroy` | Tearing down the sandbox | Tear down sandbox (stop containers, remove volumes) |
| `/provision` | Provisioning or rebuilding the sandbox | Build image, start services, validate with test:setup |

### Workspace-level skills (`workspace/.claude/skills/`)

| Skill | Trigger | Purpose |
|-------|---------|---------|
| `/ci-status` | After `git push`, verifying work is done | Poll GitHub Actions, report pass/fail with failure details |
| `/agent-browser` | QA, verifying UI, taking screenshots | Navigate, interact with, and screenshot the app via headless browser |
| `/prd` | Planning a feature, writing requirements | Generate a Product Requirements Document |
| `/ralph` | Converting a PRD for autonomous loop | Convert PRD to `.ralph/prd.json` format |
| `/issue-triage` | Heartbeat (hourly) or manual triage | Triage unassigned GitHub issues with parallel sub-agents + council, draft PR |
| `/quality-gate` | Before consequential actions | Template: validate decisions against thresholds |
| `/strategy-review` | Periodic self-assessment | Template: measure decision quality over time |
| `/backlog-rank` | Prioritizing open issues | Rank open issues by PM criteria, update pinned backlog tracking issue |
| `/strategic-proposal` | Building or refreshing the product roadmap | Spawn 5 experts + AI council, produce signal-validated product roadmap |
| `/implement` | Picking up the next roadmap item | Pick top validated roadmap item, run Ralph loop in tmux, submit draft PR |

## Infrastructure (do not modify)

| Directory | Purpose |
|-----------|---------|
| `.devcontainer/` | Dockerfile, compose files (base + cloudflared/docker overlays), entrypoint |
| `install/` | Provisioning scripts (setup.sh, heartbeat.sh, cloudflared-tunnel.sh) |
| `.openharness/` | Compose overrides config (`config.json`) |

## Git Workflow

| Item | Convention |
|------|-----------|
| Branch | `agent/next-postgres-shadcn` |
| PR target | `development` |
| Commit format | `<type>: <description>` (`feat`, `fix`, `task`, `audit`, `skill`) |
