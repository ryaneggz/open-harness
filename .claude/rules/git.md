# Git Workflow

## Issue Titles

Format: `<prefix>(<issue#>): <shortdesc>`

`<prefix>` ∈ `feat` · `bug` · `task` · `audit` · `skill` · `agent`
(matches `.github/ISSUE_TEMPLATE/<prefix>.md`)

Example: `feat(#42): slack thread replies`

> Create issue first so `<issue#>` exists, then branch.

## Branch Names

Format: `<prefix>/<issue#>-<short-desc>`

- `<short-desc>`: kebab-case, ≤5 words
- Base off default target branch (see below)

Example: `feat/42-slack-thread-replies`

## Default Target Branch

Use first of these existing in repo:

1. `development` (preferred)
2. `main` (fallback)
3. `master` (fallback)

Detect via `git show-ref --verify --quiet refs/heads/<name>` (or remote `refs/remotes/origin/<name>`). All PRs target this branch; all new branches cut from it.

## Git Authentication

Inside sandbox, run `gh auth login && gh auth setup-git` during onboarding. GitHub CLI installs credential helper — `git push` / `git fetch` use your GitHub token — no SSH keys required.

Advanced opt-ins (only when git-over-SSH explicitly needed):

- `docker-compose.ssh.yml` — mounts host `~/.ssh` read-only (reuses existing keys)
- `docker-compose.ssh-generate.yml` — generates persistent ED25519 keypair in named volume (add to GitHub manually)

Mutually exclusive — pick at most one. Both off by default.

## PR Titles

Format: `FROM <source-branch> TO <target-branch>` (literal)

Example: `FROM feat/42-slack-thread-replies TO development`

## PR Bodies

- Link issue: `Closes #<issue#>` (or `Fixes`/`Resolves`)
- Target default target branch (`development` → `main` → `master`, whichever exists)

## Commit Messages

Format: `<type>: <description>` where `<type>` ∈ `feat` · `fix` · `task` · `audit` · `skill`

## Worktrees

Default path: `.worktrees/<branch>` at project root. Create `.worktrees/` if missing.

```bash
mkdir -p .worktrees
git worktree add .worktrees/<branch> <branch>                # existing branch
git worktree add -b <prefix>/<issue#>-<short-desc> \
  .worktrees/<prefix>/<issue#>-<short-desc> $BASE            # new branch off $BASE
```

Example path: `.worktrees/feat/42-slack-thread-replies`

Cleanup: `git worktree remove .worktrees/<branch>`.

`.worktrees/` gitignored (see `.gitignore`); only `.worktrees/.gitkeep` tracked.

## Releases

Versioning: **CalVer** `YYYY.M.D` for first release of day, then `YYYY.M.D-N` (N starts at 2) for subsequent releases.

Release branch: `release/<VERSION>` (e.g., `release/2026.4.18-2`).

Pushing tag triggers `.github/workflows/release.yml` — runs lint + type-check + tests, builds `ghcr.io/ryaneggz/openharness:<VERSION>`, pushes to GHCR, creates GitHub Release.

Pre-flight before tagging:
- On intended source branch, no uncommitted changes
- `pnpm run lint && pnpm run format:check && pnpm run type-check && pnpm test` pass in `workspace/projects/next-app`

Procedure:

```bash
VERSION=$(date '+%Y.%-m.%-d')                             # append -N if tag exists
git checkout -b "release/$VERSION"
git push origin "release/$VERSION"
git tag "$VERSION" && git push origin "$VERSION"          # triggers CI release
```

After pushing tag, monitor `.github/workflows/release.yml` and verify both GitHub Release and GHCR image. Use `/release` skill for full automated procedure (version detection, pre-flight, tag, CI polling, verification).

## After Push

If `.claude/skills/ci-status/` exists, invoke `/ci-status` after every `git push` to confirm pipeline green before declaring work done. Push failing CI is not done.

## Workflow

Let `$BASE` = default target branch (detected per rule above).

1. Create GitHub issue → record `<issue#>`
2. `git checkout -b <prefix>/<issue#>-<short-desc> $BASE`
3. Commit with `<type>: <description>`
4. `git push -u origin <branch>` → then `/ci-status` (if skill exists)
5. `gh pr create --base $BASE --title "FROM <branch> TO $BASE" --body "Closes #<issue#>"`
