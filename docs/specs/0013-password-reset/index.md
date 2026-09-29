# 0013. Password Reset

**Date**: 2026-09-27
**Status**: Accepted

## Summary

This specification establishes a secure self service password reset flow for Streamline workspace owners. When an owner forgets their credentials, they can request a time limited password reset link from a dedicated recovery page. To prevent account enumeration, the request form always returns the same generic confirmation message regardless of whether the email address is registered, with synthetic latency matching live dispatches to eliminate timing side channels. For valid accounts, Streamline generates a cryptographic reset token namespaced under `reset-password:${email}` with a 1 hour lifespan and sends a branded email through Resend. Upon submitting a new valid password, the system updates the account password hash, marks the token consumed atomically in the shared verification record, revokes all active sessions and cookie caches across devices, and redirects the owner to the login page with a success confirmation.

## Requirements

**User stories**:
* As an owner locked out of my account, I want to request a password reset email so that I can regain access securely.
* As a platform concerned with privacy, I want password reset requests to return identical confirmations and constant response latency for registered and unregistered emails so that third parties cannot enumerate user accounts through timing side channels.
* As an owner clicking a reset link, I want immediate verification of token validity so that I am notified right away if the link is expired or already used.
* As an owner establishing new credentials, I want clear feedback on password strength requirements so that my account remains secure.
* As an administrator, I want password changes to invalidate all prior active sessions and signed cookie caches immediately so that stolen session tokens are revoked across all devices.

**Acceptance criteria**:
* **AC-1**: Submitting a registered email address on `/forgot-password` generates a secure reset token namespaced as `reset-password:${email}` valid for 1 hour and dispatches a branded email via Resend pointing to `/reset-password?token=${token}`.
* **AC-2**: Submitting an email address on `/forgot-password` always returns the same generic confirmation message ("If an account exists with this email, a reset link has been sent") with uniform response timing regardless of whether the email is registered, eliminating timing side channel account enumeration.
* **AC-3**: The password reset email is rendered using React Email with Streamline brand styling, including the inline logo and black action button, sent from the configured `EMAIL_FROM` address.
* **AC-4**: Navigating to `/reset-password?token=${token}` immediately validates token validity and namespace on load, displaying an expired or invalid token notice with a link back to `/forgot-password` if the token is missing, expired, or previously consumed (`consumedAt !== null`).
* **AC-5**: Submitting a new password requires minimum 8 characters with at least one letter and one number, updates the user password hash via Better Auth, marks `Verification.consumedAt = now()` atomically, revokes all active database sessions and cookie caches via `auth.api.revokeSessions`, and redirects the user to `/login?reset=success`.
* **AC-6**: When `RESEND_API_KEY` is missing or in test environments (`NODE_ENV === "test"`), reset email dispatch falls back to a development mock logger, printing reset links to server logs without throwing errors.

## Decision

**Chosen option**: Option 1: Hardened native Better Auth credential recovery with Resend and React Email.

Streamline leverages Better Auth built in `sendResetPassword` hooks in `src/lib/auth/index.ts`, combined with dedicated Next.js App Router recovery pages (`/forgot-password` and `/reset-password`) that mirror the Streamline split screen branding aesthetic and enforce timing defense, token namespacing, and atomic consumption.

**Implementation skills**: `better-auth-best-practices` (`better-auth/skills`, `.agents/skills/better-auth-best-practices/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Rationale

Reasoning and options: see rationale.md

## Feature design

**Data model sketch**:

```prisma
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  accounts  Account[]
  sessions  Session[]
}

model Account {
  id         String   @id @default(cuid())
  userId     String
  providerId String   // "credential"
  password   String?  // Password hash updated on reset
  updatedAt  DateTime @updatedAt

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([providerId, accountId])
}

model Verification {
  id         String    @id @default(cuid())
  identifier String    // Namespaced as reset-password:${email}
  value      String    // Secure token hash
  expiresAt  DateTime  // 1 hour lifetime
  consumedAt DateTime? // Populated when resetPasswordAction atomically consumes token
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@unique([identifier, value])
  @@map("verification")
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  // Revoked upon password reset to terminate access
}
```

**State transitions**:
* `idle`: User visits `/forgot-password`.
* `reset_requested`: User submits email. If registered, generates 1 hour token in `Verification` namespaced as `reset-password:${email}` and dispatches email. If unregistered, synthetic delay is executed. Form always renders the generic confirmation message.
* `email_dispatched`: Resend or mock logger dispatches reset email. User sees confirmation on screen.
* `token_validated`: User opens `/reset-password?token=...`. Immediate check verifies `identifier.startsWith("reset-password:")`, `expiresAt > now()`, and `consumedAt === null`.
* `password_updated`: User submits valid password. `Account.password` updated, `Verification.consumedAt` marked atomically, Better Auth `revokeSessions` invalidates database sessions and session cookie cache versions.
* `token_expired`: Token opened after 1 hour or reused (`consumedAt !== null`). Error state shown with link to request a fresh email.

**API surface**:

| Endpoint or Action | Method | Key inputs | Key outputs | Auth | Key errors |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/forgot-password` | GET (Page) | None | Rendered request form | Public | None |
| `requestPasswordResetAction` | Server Action | `email: string` | `success: boolean, message: string` | Public | 429 rate limit cooldown |
| `/reset-password` | GET (Page) | `token: string` query param | Rendered reset form or error screen | Public | Expired token, invalid token |
| `resetPasswordAction` | Server Action | `token: string, newPassword: string` | `success: boolean` | Public | 400 invalid or expired token, 422 weak password |
| Better Auth reset password | POST `/api/auth/reset-password` | `token, newPassword` | Status response | Public | 400 invalid or expired token |

**Value sourcing**:

| Action | Value produced or displayed | Source |
| :--- | :--- | :--- |
| Reset request | Target user account | Queried from `User` table where `email = input.email` (silent if missing) |
| Reset request | Token identifier | Prefixed namespace `reset-password:${input.email}` |
| Reset request | Reset token | Generated by Better Auth crypto token generator |
| Reset request | Reset link | Derived from `${baseUrl}/reset-password?token=${token}` |
| Reset request | Sender address | Configured `EMAIL_FROM` environment variable |
| Reset page validation | Token validity status | Evaluated against `Verification` table where `value = token`, `identifier` matches prefix, `now < expiresAt`, and `consumedAt === null` |
| Password reset action | New password hash | Computed securely by Better Auth password hasher |
| Token consumption | Consumed timestamp | Database `now()` written atomically to `Verification.consumedAt` |
| Session revocation | Revoked session count | Executed via Better Auth `auth.api.revokeSessions` |
| Success redirect | Login notification | Passed via URL query parameter `/login?reset=success` |

**Key invariants**:
* The `/forgot-password` form always returns the generic confirmation message with uniform response latency regardless of account existence.
* Reset requests enforce Better Auth rate limiting plus a 60 second database cooldown to prevent dispatch abuse.
* Reset tokens are strictly namespaced as `reset-password:${email}` and expire after 1 hour.
* Token consumption is atomic using conditional update (`where: { value: token, consumedAt: null }`), eliminating parallel consumption race conditions.
* Submitting a new password calls `auth.api.revokeSessions`, invalidating all active PostgreSQL sessions and incrementing cookie cache versions.
* Passwords must satisfy length and complexity rules (at least 8 characters, at least one letter, at least one number).
* Public reset endpoints enforce `Referrer-Policy: no-referrer` to prevent token leakage in HTTP headers.

**Security model**:
* Generic confirmation response paired with synthetic delay eliminates timing side channel account enumeration.
* Token namespace separation guarantees email verification tokens cannot be submitted to password reset.
* Atomic consumption via Prisma `updateMany` guarantees that parallel requests cannot double consume a token.
* Full session cache revocation invalidates both database session records and client cookie caches across all devices.
* Browser address bar strips the raw token via `window.history.replaceState` immediately upon component mount.

**Configuration required**:
* No new environment variables needed. Reuses existing `RESEND_API_KEY` and `EMAIL_FROM`.

**Critical test scenarios**:
* Happy path: Owner requests reset on `/forgot-password`, receives email, visits link, enters new password meeting complexity rules, and is redirected to `/login?reset=success`, verifies **AC-1**, **AC-3**, **AC-5**.
* Generic confirmation and timing: Submitting an unregistered email address displays the same generic confirmation message with matching response latency and zero dispatched emails, verifies **AC-2**.
* Cross feature token isolation: Attempting to use an email verification token on `/reset-password` fails with an invalid token error, verifies **AC-4**.
* Initial token validation: Visiting `/reset-password` with an expired (>1 hour) or missing token immediately displays an expired warning without showing password inputs, verifies **AC-4**.
* Atomic token consumption: Concurrent reset requests with the same token result in exactly one successful consumption, verifies **AC-4**, **AC-5**.
* Session and cookie cache revocation: User with active sessions across multiple devices resets password; subsequent requests on older sessions and cached cookies are rejected, verifies **AC-5**.
* Password complexity enforcement: Submitting a password with fewer than 8 characters or missing numbers or letters returns validation errors, verifies **AC-5**.
* Mock fallback: In development or test environments without an API key, email details log to console without throwing errors, verifies **AC-6**.

## Build plan
 
- [X] 1. Create branded `ResetPasswordEmail` React Email template in `src/components/emails/ResetPasswordEmail.tsx`, satisfies **AC-3**
- [X] 2. Configure Better Auth `sendResetPassword` hooks in `src/lib/auth/index.ts` with namespaced tokens, Resend sending, and mock logger fallback, satisfies **AC-1**, **AC-6**
- [X] 3. Implement `requestPasswordResetAction` with generic confirmation response, synthetic timing equalization, and Better Auth rate limiting, satisfies **AC-1**, **AC-2**
- [X] 4. Build public `/forgot-password` page matching Streamline split screen branding, satisfies **AC-1**, **AC-2**
- [X] 5. Implement `resetPasswordAction` with password complexity validation, atomic token consumption, and `auth.api.revokeSessions` cache revocation, satisfies **AC-4**, **AC-5**
- [X] 6. Build public `/reset-password` page with immediate token validation, referrer policy protection, and new password form, satisfies **AC-4**, **AC-5**
- [X] 7. Update `/login` page to render password reset success banner when accessed via `?reset=success`, satisfies **AC-5**


## Consequences

**Positive**:
* Owners can self recover their accounts securely without administrative intervention.
* Generic confirmation and synthetic delay eliminate timing side channel user enumeration attacks.
* Strict token namespace isolation eliminates cross feature token substitution attacks.
* Atomic consumption prevents concurrent race condition exploits.
* Full session revocation guarantees security across all active devices and cached cookies.

**Negative / tradeoffs**:
* Users who mistype their email on `/forgot-password` receive no inline warning and must check their inbox to discover the error.
* Synthetic delay adds ~400ms latency to non existent email requests to ensure timing safety.
* Requires creating two new public auth routes and one new email template.

**Neutral**:
* Reuses existing database models (`Account`, `Verification`, `Session`) without requiring new Prisma migrations beyond the `consumedAt` field introduced in spec 0012.
* Login page requires a small banner component for query param feedback.

## Follow-up

- [ ] Consider adding optional security notification emails alerting users when their password has been changed.
