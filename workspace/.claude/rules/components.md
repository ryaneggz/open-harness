---
paths:
  - "projects/next-app/src/components/**/*.tsx"
---

# Components

- shadcn: `pnpm exec shadcn@latest add <component>` — never copy/paste
- shadcn lives in `src/components/ui/` — don't modify generated files
- Custom components: `src/components/` (not `ui/`)
- Variants: `class-variance-authority` (cva)
- Class merging: `cn()` from `src/lib/utils.ts`
- All interactive → accessible: keyboard nav, ARIA, focus management
- Composition > props — use `children`/slots over nested prop objects
