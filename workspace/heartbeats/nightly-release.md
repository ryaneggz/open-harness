# Nightly Release

Cut a CalVer release if there are new commits since the last tag.

## Instructions

1. Check if there are commits since the last tag:

```bash
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [ -z "$LAST_TAG" ]; then
  echo "No tags exist — proceeding with release"
else
  NEW_COMMITS=$(git rev-list "${LAST_TAG}..HEAD" --count)
  if [ "$NEW_COMMITS" -eq 0 ]; then
    echo "No new commits since $LAST_TAG — skipping"
  fi
fi
```

2. If no new commits since the last tag, reply `HEARTBEAT_OK`.

3. If there ARE new commits, run `/release` to cut a new version.

4. Report the result: version tagged, CI status, or why it was skipped.
