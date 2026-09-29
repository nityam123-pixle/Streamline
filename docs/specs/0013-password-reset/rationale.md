# Rationale: Password Reset · spec 0013

## Context

Password authentication was established in Foundation Feature 2 (Auth, session and login page). In any credential based authentication system, users inevitably forget or misplace passwords. Without a reliable self service credential recovery mechanism, locked out owners are permanently blocked from accessing their workspaces and automation workflows.

Password recovery is a critical security surface. Reset links must be strictly time bound, protected against brute force tampering, and isolated so that old compromised sessions cannot persist after a password change. Furthermore, the recovery request must return identical confirmations for registered and unregistered email addresses to eliminate account enumeration risks. Finally, the recovery experience must align with Streamline visual standards, providing clear, immediate feedback without confusing states.

## Options considered

### Option 1: Native Better Auth credential recovery with Resend and React Email (Chosen)

Configure Better Auth native `sendResetPassword` handler within `src/lib/auth/index.ts`. Better Auth automatically generates a secure crypto token, stores the hash in the existing `Verification` database table with a 1 hour expiration, and invalidates all user sessions upon password reset submission. Streamline tracks token consumption via the shared `consumedAt` timestamp, provides the branded React Email template, and hosts dedicated Next.js recovery pages (`/forgot-password` and `/reset-password`).

**Pros**:
* Reuses Better Auth battle tested token generation, verification, and password hashing algorithms.
* Requires zero new database tables or schema migrations beyond the `consumedAt` field from spec 0012.
* Native integration automatically manages session invalidation across all devices.
* Generic confirmation prevents user account enumeration attacks across all endpoints.
* Reuses existing Resend infrastructure and Streamline design tokens.

**Cons**:
* Requires configuring Better Auth email hooks in `src/lib/auth/index.ts`.
* Ties token lifecycle rules to Better Auth verification engine.

### Option 2: Fully custom token generation and password reset action

Bypass Better Auth recovery hooks and implement a custom password reset mechanism using a custom database table and manual token generation.

**Pros**:
* Allows arbitrary custom schema structure and bespoke token lifecycles.

**Cons**:
* Directly violates the Streamline architectural rule: never hand roll password hashing or sessions.
* Substantially higher risk of security vulnerabilities, token leakage, or timing attacks.
* Requires manual session invalidation logic and additional database tables.

### Option 3: Magic link one click login instead of password reset

Replace password resets with temporary magic links that log the user in without requiring them to set a new password.

**Pros**:
* Eliminates the need for users to remember or type new passwords.

**Cons**:
* Leaves the user with an unknown or forgotten password for future logins.
* Requires installing and configuring a magic link auth plugin.
* Does not satisfy the user requirement to establish new credentials.

## Rationale

Option 1 is selected because it strictly follows Streamline core architectural principles: rely on Better Auth for cryptographic operations, sessions, and password management, while leveraging Resend and React Email for transactional communications. Better Auth handles token expiration, verification hashing, and multi device session invalidation out of the box, ensuring robust security. Consuming tokens via `consumedAt` prevents replay attacks, while returning generic responses on `/forgot-password` protects user privacy by eliminating account enumeration. Dedicated `/forgot-password` and `/reset-password` pages matching the Streamline split screen aesthetic provide a cohesive, professional user experience.
