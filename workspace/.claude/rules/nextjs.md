---
paths:
  - "projects/next-app/**/*.{ts,tsx}"
  - "projects/next-app/next.config.ts"
---

# Next.js + Vercel Best Practices

## Server vs Client

- Default to Server Components — only add `"use client"` when the component needs browser APIs, hooks, or event handlers
- Use `"use client"` at the component boundary, not at the page level
- Never import server-only code in client components — use `server-only` package to enforce
- Fetch data in Server Components, pass as props to Client Components

## App Router

- Route files: `page.tsx` for pages, `layout.tsx` for layouts, `loading.tsx` for suspense, `error.tsx` for error boundaries, `not-found.tsx` for 404
- Colocate route-specific components in the route directory, shared components in `src/components/`
- Environment variables: prefix with `NEXT_PUBLIC_` only if needed client-side

## Data Fetching

- Use `async` Server Components for data loading — no `useEffect` for initial data
- Colocate data fetching with the component that uses it
- For mutations, use Server Actions (`"use server"`) over API routes when possible

## Performance

- Use `next/image` with explicit `width` and `height` — never use unoptimized `<img>`
- Use `next/link` for all internal navigation — never use `<a>` for internal routes
- Use dynamic imports (`next/dynamic`) for heavy client components
- Export `metadata` or `generateMetadata` from page/layout files

## TypeScript

- Strict mode — zero tolerance for `any`
- Use `satisfies` for type narrowing with inference
- Prefer interfaces for object shapes, type aliases for unions and intersections
- Use `import type` for type-only imports to reduce bundle size
- Generate types from schema (Prisma) — never hand-write database types

## Error Handling

- Use `error.tsx` boundaries per route segment — always include a reset button
- Log errors server-side, show user-friendly messages client-side

## Config

- `turbopack: {}` in next.config.ts for Next.js 16 compatibility
- `allowedDevOrigins` includes `next-postgres-shadcn.ruska.dev` for cloudflared tunnel
- Dev server binds `0.0.0.0` (package.json) for container port forwarding
