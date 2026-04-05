# Plan: Ralph CLI Workflow — Plan to PR Pipeline

## Context

Ralph needs a complete workflow in the `cli/` that orchestrates: plan → PRD → prd.json → tmux loop → finalize PR. The draft PR is created when plans are committed before code changes begin. When Ralph completes all stories, the PR is taken out of draft.

## Workflow

```
openharness ralph prd <name>       # 1. Generate PRD from plan
openharness ralph setup <name>     # 2. Convert PRD → prd.json + create draft PR
openharness ralph run <name>       # 3. Start Ralph loop in tmux
openharness ralph status <name>    # 4. Check progress
openharness ralph reflect <name>   # 5. Update MEMORY.md + daily log from session
openharness ralph cleanup <name>   # 6. Lint, format, test, commit cleanup
openharness ralph pr <name>        # 7. Archive prd.json, take PR out of draft
```

### Design Principles

- **Phased approach with tight feedback loops**: Each Ralph iteration works on ONE story, commits, and validates. Stories are small enough for one context window. This prevents large, risky changes.
- **Context window management**: Ralph clears its session after each iteration (fresh spawn per loop). The `.ralph/progress.txt` Codebase Patterns section carries forward critical learnings without bloating context. If context reaches ~50% of the window, the iteration should wrap up its current work, commit, and exit cleanly — staying in the "smart zone" where the model reasons most effectively.
- **Reflect to improve future work**: The `reflect` step focuses on encoding actionable intelligence — not summarizing what happened, but identifying what would make the next session faster and better. Patterns, approaches, gotchas, and codebase insights go to MEMORY.md; factual session logs go to `memory/YYYY-MM-DD.md`.
- **Cleanup before PR**: The `cleanup` step runs a comprehensive quality pass (lint, format, type-check, tests) before the PR is finalized. This catches anything individual iterations missed.
- **Archive by branch**: Archives are named by branch (`ralph/<feature>` → `.ralph/archive/<feature>/`) so they map to the work done, not when it was done. The memory system handles temporal tracking.

### Detailed flow:

1. **Agent enters plan mode** → creates plan → commits plans
2. **`ralph prd`** — Runs the `/prd` skill inside the container, taking the plan as context. Generates `tasks/prd-<feature>.md` in the workspace.
3. **`ralph setup`** — Runs the `/ralph` skill to convert PRD → `.ralph/prd.json`. Then commits the PRD + prd.json and creates a **draft PR** so reviewers can see the plan and requirements before code begins.
4. **`ralph run`** — Starts `.ralph/ralph.sh --tool claude <iterations>` inside a **tmux session** in the container. Runs autonomously in the background. Each iteration implements one story, commits, and validates.
5. **`ralph status`** — Shows `.ralph/progress.txt` and current story completion from `.ralph/prd.json`.
6. **`ralph reflect`** — Reflects over the session: updates `MEMORY.md` with decisions, lessons learned, and patterns discovered. Appends a session summary to `memory/YYYY-MM-DD.md`. This preserves institutional knowledge for future sessions.
7. **`ralph cleanup`** — Runs lint, format, type-check, tests. Commits any fixes. Ensures the branch is CI-green.
8. **`ralph pr`** — Archives `.ralph/prd.json` and `.ralph/progress.txt` into `.ralph/archive/<branch-name>/` (named by branch, not date — memory handles daily records). Then runs `gh pr ready` to take the PR out of draft.

## Changes

### 1. Delete `workspace/next-app/Makefile`

### 2. Create `packages/sandbox/src/tools/ralph.ts`

New tool with actions:

```typescript
export const RALPH_ACTIONS = ["prd", "setup", "run", "status", "reflect", "cleanup", "pr"] as const;
```

Each action maps to a `docker exec` command:

- **`prd`**: Runs claude inside container with the /prd skill prompt. Reads plan files from workspace and generates PRD.
  ```
  docker exec --user sandbox <name> bash -c 'cd ~/workspace && claude --dangerously-skip-permissions -p "Read the plan files and generate a PRD using the /prd skill. Save to tasks/"'
  ```

- **`setup`**: Runs claude inside container with the /ralph skill to convert PRD to prd.json. Then commits PRD + prd.json and creates a **draft PR**.
  ```
  docker exec --user sandbox <name> bash -c 'cd ~/workspace && claude --dangerously-skip-permissions -p "Convert the latest PRD in tasks/ to .ralph/prd.json using the /ralph skill"'
  docker exec --user sandbox <name> bash -c 'cd ~/workspace && git add tasks/ .ralph/prd.json && git commit -m "task: add PRD and prd.json for ralph" && git push -u origin HEAD && gh pr create --draft --base development --title "feat: <feature>" --body "PRD and prd.json ready for Ralph execution"'
  ```

- **`run`**: Starts Ralph loop in a tmux session inside the container. Accepts `--iterations` flag (default 200).
  ```
  docker exec --user sandbox <name> bash -c 'tmux new-session -d -s ralph "cd ~/workspace && .ralph/ralph.sh --tool claude <iterations>"'
  ```

- **`status`**: Shows progress from prd.json (stories completed vs total) and tail of progress.txt.
  ```
  docker exec --user sandbox <name> bash -c 'cd ~/workspace && echo "=== Stories ===" && jq ".userStories[] | {id, title, passes}" .ralph/prd.json && echo "=== Progress ===" && tail -20 .ralph/progress.txt'
  ```

- **`reflect`**: Reflects on the session with a focus on **improving future iterations and tasks**. Reads progress.txt and prd.json, then updates harness memory:
  - **MEMORY.md**: Add patterns that will make the NEXT session faster/better — what worked, what didn't, which approaches to reuse or avoid, codebase patterns discovered, dependency gotchas, testing strategies that caught real bugs.
  - **memory/YYYY-MM-DD.md**: Append a factual session log (stories completed, files changed, time spent, blockers hit).
  - The goal is NOT to summarize what was done — it's to encode **actionable intelligence** for future iterations.
  ```
  docker exec --user sandbox <name> bash -c 'cd ~/workspace && claude --dangerously-skip-permissions -p "Read .ralph/progress.txt and .ralph/prd.json. Focus on: what would make the NEXT session better? Update MEMORY.md with actionable patterns, approaches to reuse, mistakes to avoid, and codebase insights. Append a session log to memory/$(date +%Y-%m-%d).md. Commit memory updates."'
  ```

- **`cleanup`**: Runs a cleanup pass — lint, format, type-check, test, ensure all files committed.
  ```
  docker exec --user sandbox <name> bash -c 'cd ~/workspace/next-app && npm run lint:fix && npm run format && npm run type-check && npm test && git add -A && git diff --cached --quiet || git commit -m "task: cleanup before PR submission"'
  ```

- **`pr`**: Archives prd.json + progress.txt into `.ralph/archive/<branch-name>/` (branch-named, not date — memory handles daily records). Then validates all stories pass and runs `gh pr ready` to undraft the PR.
  ```
  docker exec --user sandbox <name> bash -c 'cd ~/workspace && BRANCH=$(jq -r .branchName .ralph/prd.json | sed "s|ralph/||") && mkdir -p .ralph/archive/$BRANCH && cp .ralph/prd.json .ralph/progress.txt .ralph/archive/$BRANCH/ && git add .ralph/archive/ && git commit -m "task: archive ralph run for $BRANCH"'
  docker exec --user sandbox <name> bash -c 'cd ~/workspace && ALL_PASS=$(jq "[.userStories[].passes] | all" .ralph/prd.json) && if [ "$ALL_PASS" = "true" ]; then git push && gh pr ready; else echo "Not all stories pass yet"; exit 1; fi'
  ```

### 3. Register in `packages/sandbox/src/tools/index.ts`

Export `ralphTool`.

### 4. Add to `cli/src/cli.ts`

- Add `"ralph"` to `SUBCOMMANDS`
- Export `RALPH_ACTIONS`
- Add ralph routing in `resolveSubcommand()` (same pattern as heartbeat)
- Add to `SandboxModule` interface: `ralphTool`
- Add to help text:
  ```
  ralph <action> <name>            Ralph workflow (prd|setup|run|status|reflect|cleanup|pr)
  ```
- Add `--iterations` flag parsing for ralph run

### 5. Update `cli/src/types/openharness-sandbox.d.ts`

Add `ralphTool` to type declarations.

### 6. Create `workspace/.claude/skills/prd/SKILL.md`

PRD generator skill (content already fetched from ryaneggz/ralph).

### 7. Create `workspace/.claude/skills/ralph/SKILL.md`

Ralph PRD converter skill (content already fetched from ryaneggz/ralph).

### 8. Add Ralph section to `workspace/AGENTS.md`

Document the full workflow and all commands.

### 9. Configure Slack hooks

The hooks are already installed at `workspace/.claude/hooks/notify_slack.sh` and configured in `workspace/.claude/settings.local.json` (Stop + Notification events). Need to create the env file with the Slack webhook URL:

Create `workspace/.claude/.env.claude`:
```
SLACK_WEBHOOK_URL=<your-slack-webhook-url>
```

The hook script loads from `~/.env/.claude/.env.claude` or falls back to `.claude/.env.claude` in the project.

### 10. Update `cli/src/__tests__/cli.test.ts`

Tests for ralph subcommand routing, RALPH_ACTIONS, help text.

### 11. Commit & push

## Critical Files

| File | Action |
|------|--------|
| `workspace/next-app/Makefile` | Delete |
| `packages/sandbox/src/tools/ralph.ts` | Create |
| `packages/sandbox/src/tools/index.ts` | Edit (register) |
| `cli/src/cli.ts` | Edit (subcommand + help) |
| `cli/src/types/openharness-sandbox.d.ts` | Edit (types) |
| `cli/src/__tests__/cli.test.ts` | Edit (tests) |
| `workspace/.claude/skills/prd/SKILL.md` | Create |
| `workspace/.claude/skills/ralph/SKILL.md` | Create |
| `workspace/AGENTS.md` | Edit (Ralph docs) |
| `workspace/.claude/.env.claude` | Create (Slack webhook URL) |

## Verification

- `cd cli && npx vitest run` — all tests pass
- `cd packages/sandbox && npx tsc --noEmit` — type check clean
- `openharness ralph status next-postgres-shadcn` — shows progress
- `/prd` and `/ralph` available as skills inside sandbox
