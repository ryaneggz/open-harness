---
sidebar_position: 100
title: "Contributing"
---

# Contributing to Open Harness

This guide covers the workflow for contributing to Open Harness: creating branches, writing commits, updating the changelog, and shipping releases.

## Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/ryaneggz/open-harness.git
cd open-harness
pnpm install
```

If you are working inside the orchestrator sandbox, the `oh` CLI and git credentials are already configured. For local development on your laptop, authenticate with GitHub first:

```bash
gh auth login && gh auth setup-git
```

Link the development binary for quick testing:

```bash
pnpm link -g
oh version
```

## Branch Naming

All feature branches follow the format `<prefix>/<issue#>-<short-desc>`.

Prefixes: `feat` · `fix` · `task` · `audit` · `skill` · `agent`

Short description: kebab-case, maximum 5 words.

Example:

```
feat/42-slack-thread-replies
```

Create your branch off the default target (`development` if it exists, otherwise `main`):

```bash
git checkout -b feat/42-slack-thread-replies development
```

## Commit Messages

Commit format: `<type>: <description>`

Types: `feat` · `fix` · `task` · `audit` · `skill`

Example:

```
feat: add Slack thread replies for multi-channel mode
```

## CHANGELOG Entries

Every pull request with user-visible impact must add an entry to `CHANGELOG.md` under `## [Unreleased]` in the same commit as your change.

Categories: `### Added` · `### Changed` · `### Fixed` · `### Removed` · `### Deprecated` · `### Security`

Format: one line, imperative mood, link to your PR or issue.

Example:

```markdown
### Added
- Slack thread replies in multi-channel mode ([#42](https://github.com/ryaneggz/open-harness/pull/42)).
```

Skip CHANGELOG entries only for pure chores with no runtime or workflow effect (refactors, test fixes, typos). When in doubt, add an entry.

## Pull Requests

Target the default branch (`development`). Title format: `FROM <source-branch> TO <target-branch>` (literal).

Example:

```
FROM feat/42-slack-thread-replies TO development
```

Link the issue in the body:

```
Closes #42
```

Create the PR:

```bash
gh pr create --base development \
  --title "FROM feat/42-slack-thread-replies TO development" \
  --body "Closes #42"
```

## Releases

Open Harness uses CalVer versioning: `YYYY.M.D` for the first release of the day, then `YYYY.M.D-N` (N ≥ 2) for subsequent releases.

Releases are automated via the `/release` skill, which:

1. Computes the next version
2. Creates a release branch
3. Promotes `[Unreleased]` to the new version in CHANGELOG.md
4. Tags and pushes to trigger CI
5. Verifies the GitHub Release and GHCR image

Run the skill from inside the orchestrator sandbox:

```bash
/release
```

For details on the full workflow and manual procedure, see `.claude/rules/git.md` in the repo.

---

Need to dive deeper? See `.claude/rules/git.md` in the repo for the canonical workflow.
