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

Format: `YYYY.M.D-N` where N is a sequential build number for the day (starting at 1).

```bash
TODAY=$(date '+%Y.%-m.%-d')
# Find existing tags for today and compute next N
LAST_N=$(git tag --list "${TODAY}-*" --sort=-v:refname | head -1 | grep -oP '\d+$' || echo "0")
NEXT_N=$((LAST_N + 1))

# Check if a bare date tag exists (no -N suffix)
if git tag --list "$TODAY" | grep -q .; then
  VERSION="${TODAY}-${NEXT_N}"
else
  # First release of the day — check if any N suffixed tags exist
  if [ "$LAST_N" -gt 0 ]; then
    VERSION="${TODAY}-${NEXT_N}"
  else
    VERSION="${TODAY}-1"
  fi
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
cd workspace/next-app
npm run lint && npm run format:check && npm run type-check && npm test
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
