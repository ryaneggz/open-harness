# Plan: Update tag schema to `claude-v*`

## Context

The CI workflow currently triggers on `sandbox-*` tags and parses `sandbox-<type>-<version>`. Since this branch is specifically for the Claude Code sandbox, the tag schema should be simplified to `claude-v*` (e.g. `claude-v1.0.0`). This produces images tagged as `ghcr.io/ruska-ai/sandbox:claude-v1.0.0` and `ghcr.io/ruska-ai/sandbox:claude-latest`.

## Changes

### 1. `.github/workflows/build.yml`

- Tag filter: `"sandbox-*"` → `"claude-v*"`
- Simplify parse step: extract version directly from `claude-v<version>` (no more sandbox/type split)
- Image tags: `ghcr.io/ruska-ai/sandbox:claude-v1.0.0` + `ghcr.io/ruska-ai/sandbox:claude-latest`

### 2. `README.md`

- Add a "Releases" or "Tagging" section documenting the tag schema
- Example: `git tag claude-v1.0.0 && git push origin claude-v1.0.0`

### 3. `Makefile`

- Update IMAGE to align: `ghcr.io/ruska-ai/sandbox:claude-$(TAG)`
- `TAG ?= latest` remains default for local builds

---

## Files to modify

- `.github/workflows/build.yml`
- `README.md`
- `Makefile`

## Verification

1. Workflow parses `claude-v1.0.0` tag correctly
2. Image names: `ghcr.io/ruska-ai/sandbox:claude-v1.0.0` and `ghcr.io/ruska-ai/sandbox:claude-latest`
3. `make build` still works locally with default tag
4. README documents the tag format
