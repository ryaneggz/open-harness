---
paths:
  - "projects/next-app/src/app/api/**/*"
---

# API Routes

- Route Handlers (`route.ts`): `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- Validate input at boundary (Zod)
- Return `NextResponse.json()` with proper status codes
- Typed: `NextRequest` in, typed JSON out
- Try/catch — structured errors, never expose stack traces
- Thin handlers — logic in `src/lib/`
