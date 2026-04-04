# Update tag format to YYYY.M.D-<inckey>

## Context

The project currently uses `oh-v<semver>` tags (e.g. `oh-v1.0.0`) for releases. The user wants to switch to a date-based tag format: `YYYY.M.D` for the first release of a day, then `YYYY.M.D-1`, `YYYY.M.D-2` for subsequent ones (e.g. `2026.4.4`, `2026.4.4-1`, `2026.4.4-2`).

## Files to Modify

### 1. `.github/workflows/build.yml`

- **Line 10**: Change tag filter from `"oh-v*"` to `"[0-9][0-9][0-9][0-9].[0-9]*.[0-9]*"` — matches both `2026.4.4` and `2026.4.4-1`.
- **Lines 26-29**: Simplify parse step — the tag itself is the version, no prefix to strip. `VERSION=${GITHUB_REF#refs/tags/}`

### 2. `README.md` (Releases section, ~line 375)

- Update tag format from `oh-v<version>` to `YYYY.M.D`
- Update examples: `2026.4.4` (first), `2026.4.4-1` (subsequent)
- Update pushed image tag examples

## Verification

1. Tag pattern matches `2026.4.4` and `2026.4.4-1` but not branch pushes
2. Parse step uses the full tag as the version
3. README examples are consistent
