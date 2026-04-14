# Git Workflow

- Branch: `agent/next-postgres-shadcn` — never push to `main` or `development`
- PR target: `development`
- Commit format: `<type>: <description>` where type is `feat`, `fix`, `task`, `audit`, or `skill`
- Keep commits small and focused — one logical change per commit
- After every `git push`, run `/ci-status` to confirm CI passes. Work is not done until CI is green.
- Never skip pre-commit hooks (`--no-verify`)
- Pre-commit runs: lint-staged (ESLint + Prettier), `tsc --noEmit`, then `pnpm test`
