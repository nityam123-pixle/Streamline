# Verify: Data model and database storage · spec 0002 · updated 2026-09-25
_Steps derived from spec 0002 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] Inspect live Neon PostgreSQL database tables (`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`) -> all seven tables exist with expected schema -> AC-3
- [x] Query PostgreSQL `Role` enum in `pg_enum` -> returns `owner`, `admin`, and `editor` -> AC-4
- [x] Inspect database constraints and foreign keys on `session`, `account`, `member`, and `invitation` -> foreign key cascade deletes present -> AC-7

## Commands
- [x] `npx prisma generate` -> generates typed Prisma Client into node_modules without errors -> AC-1
- [x] `npx -y tsx scripts/verify-db.ts` -> completes user, org, session, account, member, invitation creation, unique constraints, and cascade deletions cleanly -> AC-1, AC-2, AC-3, AC-7
- [x] `npm run build` -> completes Next.js build and TypeScript type check cleanly with zero errors -> AC-1, AC-2, AC-5

## Value sourcing
- Initialize database client -> `src/lib/db/index.ts` connects over pooled `DATABASE_URL` -> Value sourcing row 1
- Execute migration -> `npx prisma migrate dev` connects over direct `DIRECT_URL` and records migration `20260925064118_init` -> Value sourcing row 2
- Store automation preferences and tools -> `scripts/verify-db.ts` stores JSON arrays in `organization.automationAreas` and `organization.selectedTools` -> Value sourcing rows 4 and 5

## Acceptance criteria coverage
- AC-1 covered by `npx prisma generate` and `scripts/verify-db.ts`
- AC-2 covered by `src/lib/db/index.ts` and `npm run build`
- AC-3 covered by live schema inspection and `scripts/verify-db.ts`
- AC-4 covered by PostgreSQL `Role` enum inspection
- AC-5 covered by pooled `DATABASE_URL` and direct `DIRECT_URL` in `.env.local`
- AC-6 covered by `prisma/migrations/20260925064118_init/migration.sql`
- AC-7 covered by foreign key cascades in schema and verified by `scripts/verify-db.ts`
