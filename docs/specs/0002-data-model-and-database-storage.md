# 0002. Data model and database storage

**Date**: 2026-09-25
**Status**: In Progress

## Summary

This decision establishes Prisma ORM with serverless PostgreSQL (such as Neon) as Streamline's primary database and persistence layer. We define the declarative Prisma schema in `prisma/schema.prisma` covering core users, sessions, accounts, and multi tenant organizations with custom roles (`owner`, `admin`, `editor`). A singleton Prisma client is exported from `src/lib/db/index.ts` with global caching in development, using pooled connections for application queries and direct connections for versioned migrations.

## Context

Streamline requires durable, structured persistence for user accounts, authenticated sessions, organizations, onboarding answers, and teammate invitations. Feature 2 established Better Auth as our authentication engine, which relies on a backed database store to record sessions, accounts, and organization memberships.

Next.js 16 App Router runs server side code across Server Components, Server Actions, and route handlers. In serverless and hot reload development environments, unmanaged database client instantiation quickly exhausts database connection limits. We need a type safe, declarative ORM that supports relational modeling, handles foreign key cascades, generates versioned SQL migrations, and integrates natively with Better Auth.

Serverless PostgreSQL (specifically Neon) provides autoscaling, branching, and connection pooling. Pairing Neon with Prisma ORM gives developers strong TypeScript typing, schema migrations tracked in source control, and database level constraints via native enums and unique indexes.

## Requirements

**User stories**:

- As a developer, I want a single typed database client exported from `src/lib/db/` so that every query and mutation accesses the database consistently without exhausting connection pools.
- As a developer, I want declarative schema definitions and versioned migrations so that schema modifications are repeatable across environments and tracked in git.
- As an application service, I want foreign key cascades and database level constraints so that relational integrity between users, sessions, and organizations is enforced automatically.
- As an onboarding user, I want workspace metadata, selected automations, and chosen tools stored reliably so that progress is saved across steps.

**Acceptance criteria**:

- **AC-1**: Prisma ORM dependencies (`prisma`, `@prisma/client`) are installed and configured with PostgreSQL as the target database provider in `prisma/schema.prisma`.
- **AC-2**: A singleton PrismaClient instance is exported from `src/lib/db/index.ts`, employing `globalThis` caching to prevent multiple instances during development hot reloads.
- **AC-3**: The schema establishes `User`, `Session`, `Account`, `Verification`, `Organization`, `Member`, and `Invitation` models matching the project data contract.
- **AC-4**: A native PostgreSQL enum `Role` defines the authorization roles (`owner`, `admin`, `editor`) used across `Member` and `Invitation` models.
- **AC-5**: Database connection strings are split between pooled `DATABASE_URL` for application traffic and direct `DIRECT_URL` for schema migrations in `.env.local`.
- **AC-6**: Initial migration executes cleanly via `prisma migrate dev`, generating SQL files in `prisma/migrations/` and producing typed Prisma client definitions.
- **AC-7**: Cascade deletes are enforced on relational dependencies (`Session`, `Account`, `Member`, and `Invitation` records are removed when their parent entity is deleted).

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

## Decision

**Chosen option**: Option 1: Prisma ORM with Neon Serverless PostgreSQL

We adopt Prisma ORM backed by Neon serverless PostgreSQL. The schema is maintained in `prisma/schema.prisma`, and the application accesses the database through a shared singleton client in `src/lib/db/index.ts`.

**Implementation skills**: `prisma-expert` (`/Users/apple/.agents/skills/prisma-expert/`), `neon-postgres` (`/Users/apple/.agents/skills/neon-postgres/`), `better-auth-best-practices` (`better-auth/skills`, `.agents/skills/better-auth-best-practices/`)

## Rationale

Prisma ORM delivers the highest degree of type safety and developer productivity for Streamline. Root `AGENTS.md` mandates that all mutations validate with Zod, database queries import a single shared instance from `src/lib/db/`, and workspace data queries are scoped by `workspaceId`.

Prisma's generated client directly provides the types needed to write safe Server Actions and route handlers. Combining Neon's built in connection pooler with Prisma's connection configuration resolves serverless connection exhaustion, while versioned migration files in `prisma/migrations/` ensure zero divergence between development and production databases.

## Feature design

**Data model sketch**:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  owner
  admin
  editor
}

model User {
  id            String       @id @default(cuid())
  name          String
  firstName     String?
  lastName      String?
  email         String       @unique
  emailVerified Boolean      @default(false)
  image         String?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  sessions      Session[]
  accounts      Account[]
  members       Member[]
  invitations   Invitation[]

  @@map("user")
}

model Session {
  id                   String        @id @default(cuid())
  userId               String
  token                String        @unique
  expiresAt            DateTime
  ipAddress            String?
  userAgent            String?
  activeOrganizationId String?
  createdAt            DateTime      @default(now())
  updatedAt            DateTime      @updatedAt

  user                 User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("session")
}

model Account {
  id         String   @id @default(cuid())
  userId     String
  accountId  String
  providerId String
  password   String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([providerId, accountId])
  @@map("account")
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([identifier, value])
  @@map("verification")
}

model Organization {
  id              String       @id @default(cuid())
  name            String
  slug            String       @unique
  logo            String?
  onboardingStep  String       @default("welcome")
  teamSize        String?
  automationAreas Json?
  selectedTools   Json?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  members         Member[]
  invitations     Invitation[]

  @@map("organization")
}

model Member {
  id             String       @id @default(cuid())
  organizationId String
  userId         String
  role           Role         @default(editor)
  jobTitle       String?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([organizationId, userId])
  @@map("member")
}

model Invitation {
  id             String       @id @default(cuid())
  organizationId String
  email          String
  role           Role         @default(editor)
  status         String       @default("pending")
  token          String       @unique
  expiresAt      DateTime
  inviterId      String
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  inviter        User         @relation(fields: [inviterId], references: [id], onDelete: Cascade)

  @@unique([organizationId, email])
  @@map("invitation")
}
```

**State transitions**:

Database Schema Evolution:
`Schema Edit in schema.prisma` -> `prisma migrate dev --name <migration_name>` -> `SQL generated in prisma/migrations/` -> `Prisma Client generated` -> `Live database updated`

**API surface**:

| Function / Module          | Target                  | Inputs                   | Outputs                   | Purpose                                                       |
| -------------------------- | ----------------------- | ------------------------ | ------------------------- | ------------------------------------------------------------- |
| `prisma` client          | `src/lib/db/index.ts` | none                     | `PrismaClient` instance | Singleton database client with development hot reload caching |
| `npx prisma migrate dev` | CLI                     | migration name           | SQL migration files       | Generates and runs versioned migrations locally               |
| `npx prisma generate`    | CLI                     | `prisma/schema.prisma` | `@prisma/client` types  | Rebuilds typed query client matching active schema            |

**Value sourcing**:

| Action                       | Value produced / displayed            | Source                                                                   |
| ---------------------------- | ------------------------------------- | ------------------------------------------------------------------------ |
| Initialize Database Client   | Active`prisma` singleton            | Instantiated in`src/lib/db/index.ts` reading pooled `DATABASE_URL`   |
| Execute Migration            | Applied schema state in PostgreSQL    | Read from SQL scripts in`prisma/migrations/` via direct `DIRECT_URL` |
| Scope Workspace Query        | Scoped records matching tenant        | Query filtering on`organizationId` matching active session context     |
| Store Automation Preferences | Serialized list of chosen automations | Written to`organization.automationAreas` as JSON array                 |
| Store Selected Tools         | Serialized list of selected tool IDs  | Written to`organization.selectedTools` as JSON array                   |

**Key invariants**:

- The database client is always a single shared instance; no module may instantiate `new PrismaClient()` ad hoc.
- All migrations must be recorded as versioned SQL files in `prisma/migrations/`.
- Deleting an organization or user cascades cleanly to remove child sessions, accounts, memberships, and invitations.
- Role values are strictly constrained by the PostgreSQL `Role` enum to `owner`, `admin`, or `editor`.
- User emails and organization slugs are unique across the entire database.
- A `postinstall` script runs `prisma generate` upon dependency installation to ensure typed client availability.

**Security model**:

- Database credentials live exclusively in `.env.local` and are never committed to version control.
- Connections require SSL (`sslmode=require`) in transit.
- All workspace queries must filter by `organizationId` derived from the server session, preventing cross tenant data leaks.

**Configuration required**:

- `DATABASE_URL`: Pooled PostgreSQL connection string (including pgbouncer parameters) used by runtime queries.
- `DIRECT_URL`: Direct unpooled PostgreSQL connection string used by migration commands.
- `package.json` script: `"postinstall": "prisma generate"` ensuring client generation across development, CI, and deployment environments.
- Next.js server external packages: `@prisma/client` is treated as a server only module to avoid bundling query engine binaries into client code.

**Critical test scenarios**:

- Connection validation: Prisma client connects successfully to database and performs simple query, verifies **AC-1**, **AC-2**.
- Schema migration: Running `prisma migrate dev` creates all seven tables and the `Role` enum without error, verifies **AC-3**, **AC-4**, **AC-6**.
- Relational cascading: Deleting a `User` record automatically deletes associated `Session` and `Account` rows, verifies **AC-7**.
- Unique constraint defense: Attempting to insert two users with the same email or two members in the same organization fails with a unique constraint violation, verifies **AC-3**.
- Connection pooling split: Application runtime connects over `DATABASE_URL` while migration CLI uses `DIRECT_URL`, verifies **AC-5**.

## Build plan

Following the Tracer Bullet build approach, tasks establish the runnable database foundation before feature slices build upon it:

1. Install Prisma dependencies (`prisma`, `@prisma/client`), add the `postinstall` hook in `package.json`, and initialize Prisma directory, satisfies **AC-1**.
2. Configure `.env.local` with pooled `DATABASE_URL` and direct `DIRECT_URL` connection strings, satisfies **AC-5**.
3. Write `prisma/schema.prisma` declaring the seven core models, relations, cascades, and the `Role` enum, satisfies **AC-3**, **AC-4**, **AC-7**.
4. Implement the singleton database client in `src/lib/db/index.ts` with development caching, satisfies **AC-2**.
5. Execute the initial migration (`npx prisma migrate dev --name init`) to generate SQL files and the typed client, satisfies **AC-6**.
6. Verify database connectivity and cascade behaviors with a lightweight verification script, satisfies **AC-1**, **AC-7**.

## Consequences

**Positive**:

- Establishes a robust, type safe database foundation supporting both Better Auth and application workflows.
- Single declarative schema file keeps database design auditable and version controlled.
- Built in connection pooling configuration ensures serverless readiness.
- Clear separation between runtime pooled queries and migration direct connections.

**Negative**:

- Adds Prisma build generation step (`prisma generate`) to the build pipeline.
- Requires maintaining two connection strings (`DATABASE_URL` and `DIRECT_URL`) for Neon pooling.

## Follow-up

- Feature 2 will attach the Better Auth Prisma adapter to this client.
- Feature 3 will utilize `prisma.organization` and `prisma.user` to record owner registration.
- Slices 2, 3, and 4 will persist onboarding steps against `prisma.organization`.
