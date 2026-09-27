# 0002. Data model and database storage · Rationale

## Context

Streamline requires durable, structured persistence for user accounts, authenticated sessions, organizations, onboarding answers, and teammate invitations. Feature 2 established Better Auth as our authentication engine, which relies on a backed database store to record sessions, accounts, and organization memberships.

Next.js 16 App Router runs server side code across Server Components, Server Actions, and route handlers. In serverless and hot reload development environments, unmanaged database client instantiation quickly exhausts database connection limits. We need a type safe, declarative ORM that supports relational modeling, handles foreign key cascades, generates versioned SQL migrations, and integrates natively with Better Auth.

Serverless PostgreSQL (specifically Neon) provides autoscaling, branching, and connection pooling. Pairing Neon with Prisma ORM gives developers strong TypeScript typing, schema migrations tracked in source control, and database level constraints via native enums and unique indexes.

## Options considered

### Option 1: Prisma ORM with Neon Serverless PostgreSQL (Chosen)

Prisma provides an industry standard declarative schema format (`schema.prisma`), an automated migration engine (`prisma migrate`), and a generated TypeScript query client. It supports PostgreSQL connection pooling, native enums, and integrates seamlessly with Better Auth via the Prisma adapter.

**Pros**:
- Declarative schema serves as single source of truth for database tables and TypeScript types.
- Robust migration tooling with versioned SQL history checked into git.
- Direct Better Auth adapter support with automatic relation mapping.
- Native enum support for strict database level role validation.

**Cons**:
- Generated client requires a build step (`prisma generate`).
- Prisma query engine adds a small binary footprint compared to bare SQL drivers.

### Option 2: Drizzle ORM with Neon Serverless PostgreSQL

Drizzle is a lightweight TypeScript ORM offering SQL like query syntax, zero runtime dependencies, and fast cold start execution.

**Pros**:
- Lightweight bundle with zero binaries and rapid execution.
- Direct SQL like query builder semantics.

**Cons**:
- Schema definitions are split across TypeScript files rather than a unified declarative schema file.
- Requires managing migration generation and custom foreign key typing manually.

### Option 3: Raw SQL driver with pg and custom migrations

Use the Node.js `pg` driver directly with manual migration scripts.

**Pros**:
- No ORM abstractions or generation overhead.

**Cons**:
- Lacks compile time type safety.
- High developer maintenance burden for writing and validating SQL migrations and relational types.

## Rationale

Prisma ORM delivers the highest degree of type safety and developer productivity for Streamline. Root `AGENTS.md` mandates that all mutations validate with Zod, database queries import a single shared instance from `src/lib/db/`, and workspace data queries are scoped by `workspaceId`.

Prisma's generated client directly provides the types needed to write safe Server Actions and route handlers. Combining Neon's built in connection pooler with Prisma's connection configuration resolves serverless connection exhaustion, while versioned migration files in `prisma/migrations/` ensure zero divergence between development and production databases.
