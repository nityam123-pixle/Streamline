# Slice 1b Combined Build Specification: Auth Verification and Recovery (Specs 0012 and 0013)

**Date**: 2026-09-27
**Status**: Proposed
**Workflow Tier**: GA
**Scope**: Slice 1b (Feature 2b: Email Verification, Feature 2c: Password Reset)

## 1. Executive Summary

This master document combines and hardens the specifications for Email Verification (spec 0012) and Password Reset (spec 0013) into a unified architectural specification.

Streamline implements secure, frictionless credential recovery and email ownership confirmation on top of Better Auth, Prisma PostgreSQL storage, and Resend transactional email delivery. To eliminate user friction during initial onboarding, email verification is non blocking for personal workspace configuration (profile, automations, tools), while protecting Streamline email sending reputation by holding live outgoing teammate invitation emails until ownership is verified. Password reset provides complete self service recovery with generic confirmations, synthetic timing protection against enumeration side channels, atomic single use token consumption, and multi device session and cookie cache revocation.

## 2. Combined Acceptance Criteria

### Feature 2b: Email Verification (Spec 0012)
* **AC-1**: When an owner completes registration, Streamline automatically generates a secure token with namespace `email-verification:${email}` and dispatches a verification email pointing to `/verify-email?token=${token}`.
* **AC-2**: The verification email is rendered using React Email with Streamline brand styling, including the inline logo and black action button, sent from the configured `EMAIL_FROM` address.
* **AC-3**: Accessing `/verify-email?token=${token}` atomically validates the token namespace and expiry, sets `User.emailVerified = true`, updates `User.emailVerifiedAt = now()`, marks `Verification.consumedAt = now()`, and renders a dedicated confirmation screen.
* **AC-4**: Incomplete or unverified accounts display a subtle, non blocking banner across onboarding steps with a resend button governed by a 60 second cooldown and Better Auth rate limiting.
* **AC-5**: If a verification token is expired (>24 hours), invalid, or already consumed, `/verify-email` presents informative messaging and a clear action to request a new link.
* **AC-6**: When `RESEND_API_KEY` is missing or in test environments (`NODE_ENV === "test"`), email dispatch falls back to a development mock logger, ensuring registration and tests run cleanly.
* **AC-7**: While an owner remains unverified (`user.emailVerified === false`), submitting teammate invitations saves pending database records and generates shareable links, but holds live email dispatch with a clear warning to protect domain reputation.

### Feature 2c: Password Reset (Spec 0013)
* **AC-8 (Reset AC-1)**: Submitting a registered email address on `/forgot-password` generates a secure reset token namespaced as `reset-password:${email}` valid for 1 hour and dispatches a branded email via Resend pointing to `/reset-password?token=${token}`.
* **AC-9 (Reset AC-2)**: Submitting an email address on `/forgot-password` always returns the same generic confirmation message ("If an account exists with this email, a reset link has been sent") with uniform response timing regardless of whether the email is registered, eliminating timing side channel account enumeration.
* **AC-10 (Reset AC-3)**: The password reset email is rendered using React Email with Streamline brand styling, including the inline logo and black action button, sent from the configured `EMAIL_FROM` address.
* **AC-11 (Reset AC-4)**: Navigating to `/reset-password?token=${token}` immediately validates token validity and namespace on load, displaying an expired or invalid token notice with a link back to `/forgot-password` if the token is missing, expired, or previously consumed (`consumedAt !== null`).
* **AC-12 (Reset AC-5)**: Submitting a new password requires minimum 8 characters with at least one letter and one number, updates the user password hash via Better Auth, marks `Verification.consumedAt = now()` atomically, revokes all active database sessions and cookie caches via `auth.api.revokeSessions`, and redirects the user to `/login?reset=success`.
* **AC-13 (Reset AC-6)**: When `RESEND_API_KEY` is missing or in test environments (`NODE_ENV === "test"`), reset email dispatch falls back to a development mock logger, printing reset links to server logs without throwing errors.

## 3. Unified Data Model

The data model builds directly upon the existing Prisma schema, adding two precise timestamp fields for verification audit tracking and replay protection:

```prisma
model User {
  id              String       @id @default(cuid())
  name            String
  email           String       @unique
  emailVerified   Boolean      @default(false)
  emailVerifiedAt DateTime?    // New: populated upon email verification
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  sessions        Session[]
  accounts        Account[]
  members         Member[]
  invitations     Invitation[]

  @@map("user")
}

model Account {
  id                    String    @id @default(cuid())
  userId                String
  accountId             String
  providerId            String    // "credential"
  password              String?   // Updated securely via Better Auth on password reset
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([providerId, accountId])
  @@map("account")
}

model Verification {
  id         String    @id @default(cuid())
  identifier String    // Namespaced: "email-verification:${email}" or "reset-password:${email}"
  value      String    // Cryptographic token string
  expiresAt  DateTime  // 24 hours for verification, 1 hour for password reset
  consumedAt DateTime? // New: recorded atomically upon token consumption
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@unique([identifier, value])
  @@map("verification")
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
```

## 4. API Surface and Route Manifest

| Route or Action | Type | Key Inputs | Key Outputs | Auth Level | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `resendVerificationEmailAction` | Server Action | None (from session) or `email` | `success: boolean, cooldownSeconds?: number` | Session preferred | Resends verification email with 60 second cooldown |
| `/verify-email` | GET Page | `token: string` | Rendered status page | Public | Confirms email ownership and displays return navigation |
| `/forgot-password` | GET Page | None | Rendered split screen form | Public | User interface to request password reset link |
| `requestPasswordResetAction` | Server Action | `email: string` | `success: boolean, message: string` | Public | Generates reset token with generic confirmation and delay |
| `/reset-password` | GET Page | `token: string` | Rendered new password form | Public | Validates token on load and presents credential inputs |
| `resetPasswordAction` | Server Action | `token: string, newPassword: string` | `success: boolean` | Public | Atomically consumes token, sets password, revokes sessions |
| `/login` | GET Page | `reset: string` query param | Enhanced login UI | Public | Displays success notification banner after credential update |

## 5. Security Architecture and Threat Mitigations

1. **Token Type Confusion Elimination**:
   Verification and password reset tokens share the `Verification` table. To prevent cross feature token substitution, tokens are strictly namespaced in the `identifier` column (`email-verification:${email}` and `reset-password:${email}`). Every lookup asserts that `identifier` matches the expected prefix.

2. **Domain Reputation Protection via Outgoing Email Gating**:
   To prevent malicious actors from registering unverified accounts to relay phishing or spam team invite emails to corporate inboxes, `createTeamInvitationsAction` verifies that `user.emailVerified === true` before triggering live Resend sends. Unverified owners retain full access to copy their shareable invite link and complete personal setup steps.

3. **Timing Side Channel Defense**:
   When an email address is submitted to `requestPasswordResetAction`, the response is generic ("If an account exists, a link has been sent"). If the email is not found in the database, the server executes a calibrated synthetic delay (~400ms to 600ms) matching the latency of a real Resend API call, ensuring uniform response timing that blinds attackers from measuring latency deltas.

4. **Multi Tier Rate Limiting**:
   Requests enforce a 60 second cooldown derived from the previous token creation timestamp in the database per email, combined with Better Auth global rate limiter (`window: 60, max: 10`) to mitigate distributed spam flooding across multiple addresses.

5. **Atomic Conditional Token Consumption**:
   To prevent double consumption race conditions from concurrent parallel requests, token consumption uses conditional database updates:
   ```ts
   const updated = await db.verification.updateMany({
     where: {
       identifier: expectedIdentifier,
       value: token,
       consumedAt: null,
       expiresAt: { gt: new Date() },
     },
     data: {
       consumedAt: new Date(),
     },
   });
   if (updated.count === 0) {
     return { success: false, error: "Invalid, expired, or already consumed token" };
   }
   ```

6. **Complete Session and Cookie Cache Revocation**:
   Submitting a new password calls Better Auth `auth.api.revokeSessions`. This not only deletes all active `Session` rows from PostgreSQL, but also increments the user session cookie cache version, immediately invalidating cached signed cookies across all client devices.

7. **Token Leakage Defense**:
   All public verification and reset endpoints enforce `Referrer-Policy: no-referrer` in middleware headers. Client page components immediately strip query tokens from the browser URL upon load via `window.history.replaceState`.

## 6. Combined Tracer Bullet Build Plan

1. **Database Migration**:
   * Add `emailVerifiedAt` to `User` and `consumedAt` to `Verification` in `prisma/schema.prisma` and execute `npx prisma migrate dev` (satisfies AC-3, AC-5, AC-11, AC-12).

2. **Branded Email Templates**:
   * Create `src/components/emails/VerifyEmail.tsx` and `src/components/emails/ResetPasswordEmail.tsx` using `@react-email/components` styled with Streamline brand tokens, inline logo, and `#161616` action buttons (satisfies AC-2, AC-10).

3. **Better Auth Configuration and Hooks**:
   * Wire `emailVerification` and `emailAndPassword.sendResetPassword` hooks in `src/lib/auth/index.ts` with namespaced token generation, Resend provider dispatches, and test mock fallbacks (satisfies AC-1, AC-6, AC-8, AC-13).

4. **Server Actions Implementation**:
   * Implement `resendVerificationEmailAction` with 60 second cooldown (satisfies AC-4).
   * Implement `requestPasswordResetAction` with generic confirmation, synthetic timing delay, and rate limiting (satisfies AC-8, AC-9).
   * Implement `resetPasswordAction` with password complexity validation, atomic token consumption, and session cache revocation (satisfies AC-11, AC-12).
   * Update `createTeamInvitationsAction` to verify `user.emailVerified === true` before live email dispatches (satisfies AC-7).

5. **User Interface Surfaces**:
   * Build dismissible `EmailVerificationBanner` in `src/components/common/` and mount in onboarding layout (satisfies AC-4).
   * Build public `/verify-email` status route with referrer protection and cross device links (satisfies AC-3, AC-5).
   * Build public `/forgot-password` request route with split screen branding (satisfies AC-8, AC-9).
   * Build public `/reset-password` page with immediate token validation and new password form (satisfies AC-11, AC-12).
   * Update `/login` page with success banner support for `?reset=success` (satisfies AC-12).

6. **Automated Verification Suites**:
   * Write comprehensive unit and integration suites in `tests/auth/email-verification.test.ts` and `tests/auth/password-reset.test.ts` locking in all 13 acceptance criteria.
