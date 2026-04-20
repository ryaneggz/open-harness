---
paths:
  - "projects/next-app/src/**/*.test.{ts,tsx}"
  - "projects/next-app/src/**/*.spec.{ts,tsx}"
  - "projects/next-app/src/e2e/**/*"
  - "projects/next-app/vitest.config.ts"
  - "projects/next-app/playwright.config.ts"
---

# Testing

- Unit/integration: Vitest + RTL — `*.test.ts(x)`
- E2E: Playwright — `src/e2e/`
- Test behavior, not implementation
- `screen.getByRole` > `getByTestId`
- Mock external deps, not internal modules
- Self-contained tests — no shared mutable state
- `pnpm test` (Vitest), `pnpm run test:e2e` (Playwright)
- `passWithNoTests: true` — CI won't fail on missing tests
