# Git Workflow

## Issue Titles

Format: `<prefix>(<issue#>): <shortdesc>`

`<prefix>` ∈ `feat` · `bug` · `task` · `audit` · `skill` · `agent`
(matches `.github/ISSUE_TEMPLATE/<prefix>.md`)

Example: `feat(#42): slack thread replies`

> Create the issue first so `<issue#>` exists, then branch.

## Branch Names

Format: `<prefix>/<issue#>-<short-desc>`

- `<short-desc>`: kebab-case, ≤5 words
- Base off the default target branch (see below)

Example: `feat/42-slack-thread-replies`

## Default Target Branch

Use the first of these that exists in the repo:

1. `development` (preferred)
2. `main` (fallback)
3. `master` (fallback)

Detect with `git show-ref --verify --quiet refs/heads/<name>` (or remote `refs/remotes/origin/<name>`). All PRs target this same branch; all new branches are cut from it.

## PR Titles

Format: `FROM <source-branch> TO <target-branch>` (literal)

Example: `FROM feat/42-slack-thread-replies TO development`

## PR Bodies

- Link the issue: `Closes #<issue#>` (or `Fixes`/`Resolves`)
- Target the default target branch (`development` → `main` → `master`, whichever exists)

## Commit Messages

Format: `<type>: <description>` where `<type>` ∈ `feat` · `fix` · `task` · `audit` · `skill`

## Worktrees

Default path: `.worktrees/<branch>` at the project root. Create the `.worktrees/` directory if it does not already exist.

```bash
mkdir -p .worktrees
git worktree add .worktrees/<branch> <branch>                # existing branch
git worktree add -b <prefix>/<issue#>-<short-desc> \
  .worktrees/<prefix>/<issue#>-<short-desc> $BASE            # new branch off $BASE
```

Example path: `.worktrees/feat/42-slack-thread-replies`

Clean up when done: `git worktree remove .worktrees/<branch>`.

`.worktrees/` contents are gitignored (see `.gitignore`); only `.worktrees/.gitkeep` is tracked.

## Releases

Versioning: **CalVer** `YYYY.M.D` for the first release of the day, then `YYYY.M.D-N` (N starts at 2) for subsequent releases.

Release branch: `release/<VERSION>` (e.g., `release/2026.4.18-2`).

Pushing the tag triggers `.github/workflows/release.yml` — it runs lint + type-check + tests, builds `ghcr.io/ryaneggz/openharness:<VERSION>`, pushes to GHCR, and creates a GitHub Release.

Pre-flight before tagging:
- On the intended source branch, no uncommitted changes
- `pnpm run lint && pnpm run format:check && pnpm run type-check && pnpm test` pass in `workspace/projects/next-app`

Procedure:

```bash
VERSION=$(date '+%Y.%-m.%-d')                             # append -N if tag exists
git checkout -b "release/$VERSION"
git push origin "release/$VERSION"
git tag "$VERSION" && git push origin "$VERSION"          # triggers CI release
```

After pushing the tag, monitor `.github/workflows/release.yml` and verify both the GitHub Release and the GHCR image. Use the `/release` skill for the full automated procedure (version detection, pre-flight, tag, CI polling, verification).

## After Push

If `.claude/skills/ci-status/` exists, invoke `/ci-status` after every `git push` to confirm the pipeline is green before declaring work done. A push that fails CI is not done.

## Workflow

Let `$BASE` = default target branch (detected per rule above).

1. Create GitHub issue → record `<issue#>`
2. `git checkout -b <prefix>/<issue#>-<short-desc> $BASE`
3. Commit with `<type>: <description>`
4. `git push -u origin <branch>` → then `/ci-status` (if the skill exists)
5. `gh pr create --base $BASE --title "FROM <branch> TO $BASE" --body "Closes #<issue#>"`
