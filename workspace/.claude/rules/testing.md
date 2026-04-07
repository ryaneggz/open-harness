---
paths:
  - "next-app/src/**/*.test.{ts,tsx}"
  - "next-app/src/**/*.spec.{ts,tsx}"
  - "next-app/src/e2e/**/*"
  - "next-app/vitest.config.ts"
  - "next-app/playwright.config.ts"
---

# Testing

- Unit/integration: Vitest + React Testing Library — files named `*.test.ts` or `*.test.tsx`
- E2E: Playwright — files in `src/e2e/`, hit `https://next-postgres-shadcn.ruska.dev`
- Test behavior, not implementation — avoid testing internal state or private methods
- Use `screen.getByRole` over `getByTestId` — tests should mirror how users interact
- Mock external dependencies (APIs, third-party services), not internal modules
- Each test file should be self-contained — no shared mutable state between tests
- Run `npm test` for Vitest, `npm run test:e2e` for Playwright
- `passWithNoTests: true` is set in vitest config — CI won't fail on missing tests
