# Git

- Branch: `agent/<agent-name>` — never push `main`/`development`
- PRs target `development`
- Commits: `<type>: <description>` (feat/fix/task/audit/skill)
- Small focused commits — one logical change each
- After `git push` → `/ci-status`. Not done until green.
- Never `--no-verify`
- Pre-commit: lint-staged, `tsc --noEmit`, `pnpm test`
