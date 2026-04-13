# Fix Husky Pre-Commit Hook

## Task
Fix the husky pre-commit hook at `/home/ryaneggz/ruska-ai/sandboxes/.husky/pre-commit` after the `cli/` directory consolidation.

## Current State
- File has 2 lines (plus blank line 3)
- Line 1: `cd cli && pnpm exec lint-staged && pnpm run build && pnpm run test`
- Line 2: `cd ../packages/sandbox && pnpm exec lint-staged && pnpm run build && pnpm run test`
- The `cli/` directory no longer exists (consolidated into `packages/sandbox/src/cli/`)
- Line 1 will fail on every commit

## Solution
Replace entire file content with single line:
```
cd packages/sandbox && pnpm exec lint-staged && pnpm run build && pnpm run test
```

## Reasoning
- The original hook chained two commands: first in `cli/`, then relative from there to `../packages/sandbox`
- Since `cli/` no longer exists, we skip directly to `packages/sandbox` from repo root
- This eliminates the failing path and maintains the linting/build/test workflow

## Steps to Execute
1. Use Edit tool to replace entire file content with the single line
2. Report the change

## Status
Plan created - awaiting user approval to execute
