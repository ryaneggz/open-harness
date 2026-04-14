---
paths:
  - "projects/next-app/src/**/*.css"
  - "projects/next-app/postcss.config.mjs"
---

# Styles

- Tailwind CSS v4 + `@tailwindcss/postcss`
- CSS vars in `globals.css` via `@theme inline`
- No circular CSS var refs
- Font: Geist Sans (`var(--font-geist-sans)`)
- Theme: `next-themes`, system default, Tailwind `dark:` variants
- shadcn uses oklch for theme vars — maintain convention
- `@apply` for base styles in `@layer base`, utilities in components
