# Plan: Fix Ralph Process Gaps From Test Run

## Context

The first end-to-end Ralph test (issue #4, `/api/health`) exposed 6 failures in the implement pipeline. US-FINAL marked `passes: true` despite the archive never happening, the public URL being down, and Ralph corrupting the repo structure inside `workspace/next-app/`. These gaps must be resolved before the next run.

## Gap Inventory

| # | Gap | What Happened | Root Cause | Fix Location |
|---|-----|---------------|------------|-------------|
| 1 | **Archive never created** | `.ralph/archive/` and `.ralph/archives/` both empty. US-FINAL said it archived but didn't. prd.json + progress.txt still in place. | US-FINAL acceptance criteria said "archive" but Ralph marked it done without actually doing it. No verification step. | `implement/SKILL.md` US-FINAL criteria + `ralph.sh` archive path |
| 2 | **Wrong archive path format** | Skill says `.ralph/archive/YYYY-MM-DD-<feature>/`. User wants `.ralph/archives/YYYY-MM-DD/<feature>/`. `ralph.sh` uses `$ARCHIVE_DIR/$DATE-$FOLDER_NAME`. | Three different conventions across skill, user requirement, and ralph.sh | `implement/SKILL.md`, `ralph.sh`, `.ralph/CLAUDE.md`, `.gitignore` |
| 3 | **Public URL not validated** | `https://next-postgres-shadcn.ruska.dev` returned 502. Dev server was down. Ralph never checked. | US-FINAL had no acceptance criterion for public URL liveness | `implement/SKILL.md` US-FINAL criteria |
| 4 | **Ralph cloned repo inside next-app** | `workspace/next-app/workspace/`, `workspace/next-app/cli/`, `workspace/next-app/docker/`, etc. appeared. `package.json` was overwritten with monorepo root version. | Ralph ran `git clone` or `git checkout` from within `next-app/` creating a nested repo, OR the cwd was wrong when initializing the branch | `.ralph/CLAUDE.md` — needs explicit guard: "NEVER clone. NEVER run git init. Work in the existing checkout." |
| 5 | **Dev server not restarted** | Build succeeded during Ralph but no `npm run dev` was running afterward. Container had no Next.js process. | Ralph committed code but never ensured the dev server was running for validation | `implement/SKILL.md` US-FINAL criteria + `.ralph/CLAUDE.md` execution rules |
| 6 | **tmux ran as root** | `--dangerously-skip-permissions` failed because Claude ran as root. Required `gosu sandbox`. | `tmux new-session` ran as root; `ralph.sh` then invoked `claude` as root | `implement/SKILL.md` tmux launch command |

## Files to Edit

### 1. `workspace/.claude/skills/implement/SKILL.md`

**US-FINAL acceptance criteria** — replace the current JSON block with:

- Fix archive path: `.ralph/archives/YYYY-MM-DD/<feature>/` (plural `archives`, date and feature as separate directories)
- Add: "Verify dev server is running: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` must return 200. If not, start it with `npm run dev` and wait for ready."
- Add: "Verify public URL: `curl -s -o /dev/null -w '%{http_code}' https://next-postgres-shadcn.ruska.dev/` must return 200. If tunnel is down, this is a BLOCKER — do not mark passes: true."
- Add: "Verify archive exists: `ls .ralph/archives/YYYY-MM-DD/<feature>/prd.json` must succeed. If archive was not created, create it now."

**tmux launch command** (step 9) — change to run as sandbox user:
```bash
docker exec next-postgres-shadcn bash -c "tmux new-session -d -s ralph -c /home/sandbox/workspace 'gosu sandbox bash -c \"cd .ralph && HOME=/home/sandbox ./ralph.sh --tool claude 15 2>&1 | tee ralph-\$(date +%Y%m%d-%H%M).log\"'"
```

### 2. `workspace/.ralph/ralph.sh`

**Archive path** — line 39 and line 52:
- `ARCHIVE_DIR="$SCRIPT_DIR/archive"` → `ARCHIVE_DIR="$SCRIPT_DIR/archives"`
- `ARCHIVE_FOLDER="$ARCHIVE_DIR/$DATE-$FOLDER_NAME"` → `ARCHIVE_FOLDER="$ARCHIVE_DIR/$DATE/$FOLDER_NAME"`

This changes from `archives/2026-04-09-api-health/` to `archives/2026-04-09/api-health/`.

### 3. `workspace/.ralph/CLAUDE.md`

Add to the **Execution Rules** section:

```markdown
### Git Safety — CRITICAL
- You are working in an EXISTING git checkout. NEVER run `git clone`. NEVER run `git init`.
- To create a feature branch: `git checkout -b feat/<N>-<shortdesc>` from the current branch
- NEVER change the working directory to a parent of `workspace/next-app/` for git operations
- If you see files like `cli/`, `docker/`, `install/`, `packages/` appearing in `workspace/next-app/`, STOP — something has gone wrong with your git operations
- All source code changes happen under `workspace/next-app/src/` — never write files outside this path

### Pre-Submit Validation
Before marking US-FINAL as passes: true, you MUST verify:
1. `npm run build` succeeds (not just type-check — full build)
2. `npm run dev` is running and `curl http://localhost:3000/` returns 200
3. `curl https://next-postgres-shadcn.ruska.dev/` returns 200 (public URL)
4. Archive exists at `.ralph/archives/YYYY-MM-DD/<feature>/prd.json`
If ANY of these fail, fix them before marking complete.
```

### 4. `.gitignore` (root)

Update Ralph section:
```
# Ralph runtime files (keep prd.json + progress.txt tracked for recovery)
workspace/.ralph/.last-branch
workspace/.ralph/ralph-*.log
workspace/.ralph/.claude/
```

### 5. `workspace/next-app/.gitignore`

Already has the repo-clone artifact ignores from earlier. Verify they're still present after the revert.

### 6. `workspace/next-app/src/lib/implement-guards.ts`

Add a `validatePrdArchivePath` function that checks the archive path matches `.ralph/archives/YYYY-MM-DD/<feature>/`.

### 7. `workspace/next-app/src/test/ralph-prd.test.ts`

Update the `validFinalStory` fixture to use the correct archive path. Add test for archive path format validation.

## Verification

1. `npm test` — all tests pass with updated archive path
2. `npm run build` — succeeds
3. `ralph.sh` archive path: grep for `archives` not `archive` (singular)
4. `CLAUDE.md` contains git safety rules
5. US-FINAL criteria includes public URL check, dev server check, archive verification
6. tmux launch command uses `gosu sandbox`
