# Code Quality

- TypeScript strict — no `any`, no `@ts-ignore` without justification
- Explicit types on all exports
- Run `pnpm run lint && pnpm run format:check && pnpm run type-check` before done
- `pnpm run format` for formatting (not manual)
- Small focused functions
- Files: kebab-case. Components: PascalCase. Utilities: camelCase.
