---
paths:
  - "next-app/src/app/api/**/*"
---

# API Routes

- Use Route Handlers (`route.ts`) with named exports: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- Validate request input at the boundary — use Zod or similar for schema validation
- Return `NextResponse.json()` with appropriate HTTP status codes
- Use typed request/response: `NextRequest` input, typed JSON output
- Handle errors with try/catch — return structured error responses, never expose stack traces
- For database operations, use Prisma transactions when multiple writes are involved
- Keep route handlers thin — extract business logic into `src/lib/` modules
