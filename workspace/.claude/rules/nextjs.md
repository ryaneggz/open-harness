---
paths:
  - "projects/next-app/**/*.{ts,tsx}"
  - "projects/next-app/next.config.ts"
---

# Next.js

## Server vs Client
- Default Server Components — `"use client"` only for browser APIs/hooks/events
- `"use client"` at component boundary, not page level
- Never import server-only in client — use `server-only` package
- Fetch in Server Components, pass as props to Client

## App Router
- `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`
- Route-specific components colocated; shared in `src/components/`
- `NEXT_PUBLIC_` prefix only if client-side needed

## Data
- `async` Server Components for loading — no `useEffect` for initial data
- Colocate fetching with consumer component
- Server Actions (`"use server"`) over API routes for mutations

## Perf
- `next/image` with explicit dimensions — never `<img>`
- `next/link` for internal nav — never raw `<a>`
- `next/dynamic` for heavy client components
- Export `metadata`/`generateMetadata`

## TS
- Strict, zero `any`. `satisfies` for narrowing. `import type` for type-only.

## Errors
- `error.tsx` per route segment with reset button
- Server-side logging, user-friendly messages client-side

## Config
- `turbopack: {}` for Next.js 16
- Dev server binds `0.0.0.0` for container forwarding
