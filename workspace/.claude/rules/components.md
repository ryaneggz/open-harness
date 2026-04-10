---
paths:
  - "projects/next-app/src/components/**/*.tsx"
---

# Components

- Add shadcn components via `npx shadcn@latest add <component>` — never copy/paste from docs
- shadcn components live in `src/components/ui/` — do not modify generated files unless customizing
- Custom components go in `src/components/` (not in `ui/`)
- Use `class-variance-authority` (cva) for component variants
- Use `tailwind-merge` (cn utility from `src/lib/utils.ts`) to merge Tailwind classes
- All interactive components must be accessible: keyboard navigation, ARIA labels, focus management
- Prefer composition over props — use `children` and slots over deeply nested prop objects
