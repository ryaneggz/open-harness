---
paths:
  - "next-app/prisma/**/*"
  - "next-app/prisma.config.ts"
---

# Prisma & Database

- Schema-first: define models in `prisma/schema.prisma`, then generate + migrate
- Prisma 7: `url` is in `prisma.config.ts` only, NOT in `schema.prisma` datasource block
- After schema changes: `npx prisma generate` then `npx prisma migrate dev --name <descriptive-name>`
- Generated client outputs to `src/generated/prisma` — import from `@/generated/prisma`
- Use Prisma types for all database access — no raw SQL unless absolutely necessary
- Migration names should be descriptive: `add-users-table`, `add-email-index`, not `migration-1`
- Database: PostgreSQL 16 on `postgres:5432`, credentials `sandbox/sandbox/sandbox`
- Direct access: `psql` (uses PG* env vars, no args needed)
- Browse data: `npx prisma studio` (port 5555)
