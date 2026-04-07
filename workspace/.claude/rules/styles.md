---
paths:
  - "next-app/src/**/*.css"
  - "next-app/postcss.config.mjs"
---

# Styles & Theming

- Tailwind CSS v4 with `@tailwindcss/postcss` plugin
- CSS variables defined in `globals.css` using `@theme inline` block
- Never create circular CSS variable references (e.g., `--font-sans: var(--font-sans)`)
- Font: Geist Sans via `next/font/google` — referenced as `var(--font-geist-sans)`
- Theming: `next-themes` with `system` default — use Tailwind `dark:` variants
- shadcn uses oklch color space for theme variables — maintain this convention
- Use `@apply` for base styles in `@layer base`, utility classes in components
