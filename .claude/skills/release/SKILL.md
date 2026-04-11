---
name: release
description: |
  Version and release the codebase using CalVer (YYYY.M.D-N).
  Creates a release branch, tags it, pushes to trigger the CI release
  workflow which runs tests, builds the Docker image, pushes to GHCR,
  and creates a GitHub Release.
  TRIGGER when: asked to release, version, tag, ship, cut a release,
  or push a new version.
argument-hint: "[--dry-run]"
---

# Release

Cut a CalVer release: branch, tag, push, and let CI build + push to GHCR.

## Instructions

### Step 1 — Determine the version

Format: `YYYY.M.D` for the first release of the day. If that tag already exists, append `-N` starting at 2.

```bash
TODAY=$(date '+%Y.%-m.%-d')

if ! git tag --list "$TODAY" | grep -q .; then
  # First release of the day
  VERSION="$TODAY"
else
  # Date tag exists — find highest -N suffix and increment
  LAST_N=$(git tag --list "${TODAY}-*" --sort=-v:refname | head -1 | grep -oP '\d+$' || echo "1")
  VERSION="${TODAY}-$((LAST_N + 1))"
fi

echo "Version: $VERSION"
```

### Step 2 — Pre-flight checks

Before releasing, verify the codebase is clean and tests pass:

```bash
# Must be on the agent branch
git branch --show-current

# No uncommitted changes
git status --porcelain

# Run lint + type check + tests locally
cd workspace/projects/next-app
pnpm run lint && pnpm run format:check && pnpm run type-check && pnpm test
```

If any check fails, **stop and fix before releasing**. Do not skip.

If `--dry-run` was passed, report the version and pre-flight results, then stop here.

### Step 3 — Create release branch

```bash
BRANCH="release/${VERSION}"
git checkout -b "$BRANCH"
git push origin "$BRANCH"
```

### Step 4 — Create and push the tag

The tag triggers `.github/workflows/release.yml` which runs the full CI pipeline,
builds `ghcr.io/ryaneggz/next-postgres-shadcn:<VERSION>`, and creates a GitHub Release.

```bash
git tag "$VERSION"
git push origin "$VERSION"
```

### Step 5 — Monitor CI

After pushing the tag, poll the release workflow:

```bash
# Wait for the workflow to start
sleep 10

# Get the run ID
RUN_ID=$(gh api "repos/ryaneggz/next-postgres-shadcn/actions/runs?branch=${VERSION}&per_page=1" \
  --jq '.workflow_runs[0].id')

# Poll until complete (max 10 minutes)
for i in $(seq 1 40); do
  STATUS=$(gh api "repos/ryaneggz/next-postgres-shadcn/actions/runs/$RUN_ID" --jq '.status')
  CONCLUSION=$(gh api "repos/ryaneggz/next-postgres-shadcn/actions/runs/$RUN_ID" --jq '.conclusion')
  if [ "$STATUS" = "completed" ]; then
    echo "Release workflow: $CONCLUSION"
    break
  fi
  echo "Still running... ($i/40)"
  sleep 15
done
```

### Step 6 — Verify

```bash
# Check the GitHub Release exists
gh release view "$VERSION" --repo ryaneggz/next-postgres-shadcn

# Verify the Docker image was pushed to GHCR
gh api "users/ryaneggz/packages/container/next-postgres-shadcn/versions" \
  --jq '.[0] | {tags: .metadata.container.tags, created: .created_at}'
```

### Step 7 — Return to working branch

```bash
git checkout agent/next-postgres-shadcn
```

### Step 8 — Report

```
Release $VERSION complete!

  Tag:      $VERSION
  Branch:   release/$VERSION
  Image:    ghcr.io/ryaneggz/next-postgres-shadcn:$VERSION
  Release:  https://github.com/ryaneggz/next-postgres-shadcn/releases/tag/$VERSION
  CI:       <pass/fail with run URL>
```

If CI failed, include failure details and suggest fixes.
