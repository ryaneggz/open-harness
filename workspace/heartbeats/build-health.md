# Build Health Check

Run a quick health check on the project. This catches regressions early.

## Tasks

0. `cd next-app` first — all npm commands run from the project directory
1. Run `npm run build` — verify Next.js builds without errors
2. Run `npm test` — verify all Vitest tests pass
3. Run `npm run type-check` — verify no TypeScript errors
4. Run `npm run lint` — verify no lint errors
5. Check that PostgreSQL is reachable: `psql -c "SELECT 1"`

## Reporting

- If all checks pass, reply `HEARTBEAT_OK`
- If any check fails, report the specific failure with error output
- Append a summary to `memory/YYYY-MM-DD.md` (today's date) noting the result
