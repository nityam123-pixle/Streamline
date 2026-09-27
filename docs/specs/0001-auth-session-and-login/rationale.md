# 0001. Auth, session and login page · Rationale

## Context

Streamline is an AI workflow automation platform built on Next.js 16 App Router. The frontend UI for registration and a six step onboarding sequence is already built, but backend persistence and authentication are not yet wired. Users currently register on the landing page, yet there is no dedicated login page or session verification to authenticate returning owners.

Without an authentication and session standard, onboarding routes (`/welcome`, `/about`, `/automation`, `/tools`, `/team-invitation`, `/launch`) remain unprotected, exposing internal flows to unauthenticated visitors. Furthermore, multi tenant workspace isolation depends on knowing the authenticated user and their active organization from the session cookie on the server.

We need a secure, typed authentication system that integrates cleanly with Next.js App Router Server Components and Server Actions. The solution must enforce safe password hashing, handle session cookies with thirty day persistence, provide brute force rate limiting, and establish an organization data model with custom roles (`owner`, `admin`, `editor`) where invite tokens are stored hashed rather than plain text.

## Options considered

### Option 1: Better Auth with organization plugin (Recommended)

Better Auth is a TypeScript first authentication framework tailored for modern frameworks. It runs in App Router Server Components, Server Actions, and route handlers. It provides built in rate limiting, session management, and an official organization plugin that handles multi tenant workspaces, memberships, and pending invitations out of the box.

**Pros**:
- Native support for Next.js App Router with shared server and client modules.
- Built in email and password handling, session cookies, and rate limiting with zero custom crypto code.
- Official organization plugin provides workspace mapping, custom roles (`owner`, `admin`, `editor`), and hashed invite tokens.

**Cons**:
- Newer ecosystem than older libraries like NextAuth, requiring adherence to Better Auth conventions.

### Option 2: Auth.js (NextAuth v5) with custom organization tables

Auth.js provides standard OAuth and credentials handlers for Next.js. However, credentials authentication in Auth.js requires custom session adapters, disables database session storage by default in favor of JWTs, and does not provide built in multi tenant organization plugins or invite token hashing.

**Pros**:
- Established ecosystem and wide community usage.

**Cons**:
- Credentials provider is treated as a secondary feature with notable edge cases.
- Requires building all multi tenant organization, member, and invitation logic manually from scratch.

### Option 3: Custom authentication with manual password hashing and JWT cookies

Implement custom route handlers using argon2 or bcrypt for password hashing and jsonwebtoken for cookies.

**Pros**:
- Complete control over every line of code without third party framework abstractions.

**Cons**:
- Violates project rule ("Never hand roll password hashing or sessions").
- High security risk regarding session invalidation, cookie security flags, timing attacks, and token renewal.

## Rationale

Better Auth directly satisfies all project constraints. Root `AGENTS.md` mandates that we never hand roll password hashing or sessions and specifies Better Auth as the project authentication provider.

The organization plugin fits Streamline's workspace model cleanly: organizations map to workspaces, members carry project roles (`owner`, `admin`, `editor`), and invitations manage pending team additions with hashed tokens. Better Auth's built in sliding session mechanism delivers the required thirty day persistence while minimizing database write overhead.
