# Code Quality

- TypeScript strict mode — no `any`, no `@ts-ignore`, no `@ts-expect-error` without justification
- All exports must be typed explicitly — no inferred return types on public functions
- Run `npm run lint && npm run format:check && npm run type-check` before considering code complete
- Use `npm run format` (Prettier) to fix formatting, not manual edits
- Prefer small, focused functions over large ones
- Name files in kebab-case, components in PascalCase, utilities in camelCase
