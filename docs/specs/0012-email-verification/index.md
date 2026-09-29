# 0012. Email Verification

**Date**: 2026-09-27
**Status**: In Progress

## Summary

This specification establishes secure email verification for owner accounts in Streamline. Upon signup, the application automatically dispatches a branded verification email through Resend with a secure single click verification link. The verification flow is non blocking for initial workspace setup (about, automations, tools), while protecting platform email reputation by holding live outgoing teammate invite emails until verified. Tokens are strictly namespaced in the shared verification table, consumed atomically to eliminate race conditions, and preserved with timestamps for security audit inspection.

## Requirements

**User stories**:
* As a newly registered workspace owner, I want to receive an email verification link so that I can confirm my email address without interrupting my initial onboarding setup.
* As an owner who missed or lost the initial email, I want a resend button with clear cooldown feedback so that I can easily request a fresh verification link.
* As a security conscious platform, I want verification tokens to be namespaced, single use, and expire after 24 hours so that token reuse and cross feature confusion attacks are prevented.
* As a platform operator, I want unverified accounts to be restricted from sending outgoing emails to third parties so that our email domain reputation is protected from spam abuse.

**Acceptance criteria**:
* **AC-1**: When an owner completes registration, Streamline automatically generates a secure token with identifier namespace `email-verification:${email}` and dispatches a verification email pointing to `/verify-email?token=${token}`.
* **AC-2**: The verification email is rendered using React Email with Streamline brand styling, including the inline logo and black action button, sent from the configured `EMAIL_FROM` address.
* **AC-3**: Accessing `/verify-email?token=${token}` atomically validates the token namespace and expiry, sets `User.emailVerified = true`, updates `User.emailVerifiedAt = now()`, marks `Verification.consumedAt = now()`, and renders a dedicated confirmation screen.
* **AC-4**: Incomplete or unverified accounts display a subtle, non blocking banner across onboarding steps with a resend button governed by a 60 second cooldown and Better Auth rate limiting.
* **AC-5**: If a verification token is expired (>24 hours), invalid, or already consumed, `/verify-email` presents informative messaging and a clear action to request a new link.
* **AC-6**: When `RESEND_API_KEY` is missing or in test environments (`NODE_ENV === "test"`), email dispatch falls back to a development mock logger, ensuring registration and tests run cleanly.
* **AC-7**: While an owner remains unverified (`user.emailVerified === false`), submitting teammate invitations saves pending database records and generates shareable links, but holds live email dispatch with a clear warning to protect domain reputation.

## Decision

**Chosen option**: Option 1: Hardened native Better Auth verification integration with Resend and React Email.

Streamline configures Better Auth built in `emailVerification` hooks in `src/lib/auth/index.ts`, sending branded React Email messages through Resend while maintaining non blocking onboarding, namespaced token isolation, and anti abuse protections.

**Implementation skills**: `better-auth-best-practices` (`better-auth/skills`, `.agents/skills/better-auth-best-practices/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Rationale

Reasoning and options: see rationale.md

## Feature design

**Data model sketch**:

```prisma
model User {
  id              String       @id @default(cuid())
  email           String       @unique
  emailVerified   Boolean      @default(false)
  emailVerifiedAt DateTime?
  // ... other relations
}

model Verification {
  id         String    @id @default(cuid())
  identifier String    // Namespaced as email-verification:${email}
  value      String    // Cryptographic token
  expiresAt  DateTime  // 24 hour lifetime
  consumedAt DateTime? // Timestamp recorded upon atomic consumption
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@unique([identifier, value])
  @@map("verification")
}
```

**State transitions**:
* `unverified`: Default state upon owner registration (`emailVerified = false`, `emailVerifiedAt = null`).
* `verification_dispatched`: Verification token generated in `Verification` with namespace `email-verification:${email}` (`expiresAt = now + 24h`, `consumedAt = null`), email dispatched via Resend or mock logger.
* `verified`: Token consumed atomically on `/verify-email` (`emailVerified = true`, `emailVerifiedAt = now()`, `Verification.consumedAt = now()`).
* `link_expired`: Access after 24 hours (`now > expiresAt`), token rejected, resend offered.

**API surface**:

| Endpoint or Action | Method | Key inputs | Key outputs | Auth | Key errors |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `resendVerificationEmailAction` | Server Action | `email?: string` | `success: boolean, cooldownSeconds?: number` | Session or valid email | 429 rate limit cooldown |
| `/verify-email` | GET (Page) | `token: string` query param | Rendered status page | Public | Expired token, already consumed token, invalid token |
| Better Auth verify email | GET `/api/auth/verify-email` | `token: string` | Redirect or JSON status | Public | 400 invalid or expired token |

**Value sourcing**:

| Action | Value produced or displayed | Source |
| :--- | :--- | :--- |
| Registration dispatch | Recipient email | `user.email` from registration input |
| Registration dispatch | Token identifier | Prefixed namespace `email-verification:${user.email}` |
| Registration dispatch | Verification token | Generated by Better Auth crypto token generator |
| Registration dispatch | Verification link | Derived from `${baseUrl}/verify-email?token=${token}` |
| Registration dispatch | Sender address | Configured `EMAIL_FROM` environment variable |
| Resend verification action | Target user email | Authenticated `session.user.email` or validated action param |
| Resend verification action | Cooldown timer | Derived from difference between `now()` and prior `Verification.createdAt` |
| Verify email page | Verified timestamp | Database `now()` written to `User.emailVerifiedAt` |
| Verify email page | Return destination | Derived from owner current onboarding step or `/login` |

**Key invariants**:
* Email verification never blocks or redirects an owner away from active onboarding steps 1 through 4.
* Outgoing live email dispatch in `createTeamInvitationsAction` is restricted to verified users (`user.emailVerified === true`), preventing domain abuse.
* Verification tokens are strictly namespaced as `email-verification:${email}` and expire after 24 hours.
* Token consumption is atomic using conditional update (`where: { value: token, consumedAt: null }`), eliminating double consumption race conditions.
* Cross device verification is supported; unauthenticated users clicking the link are verified and directed to `/login`.
* Public verification endpoints enforce `Referrer-Policy: no-referrer` to prevent token leakage in HTTP headers.

**Security model**:
* Token namespace separation prevents tokens created for email verification from being accepted by password reset endpoints.
* Atomic consumption via Prisma `updateMany` guarantees that parallel requests cannot double consume a token.
* Resend requests enforce a 60 second database timestamp cooldown plus Better Auth rate limiting to stop dispatch flooding.
* Outgoing transactional email dispatch is held for unverified accounts, eliminating spam and phishing relay vectors.
* Browser address bar strips the raw token via `window.history.replaceState` immediately upon component mount.

**Configuration required**:
* No new secret keys required. Reuses existing `RESEND_API_KEY` and `EMAIL_FROM`.

**Critical test scenarios**:
* Happy path: Owner registers, receives email, visits `/verify-email?token=...`, database updates `emailVerified = true`, verifies **AC-1**, **AC-2**, **AC-3**.
* Cross feature token isolation: Attempting to use an email verification token on `/reset-password` fails with an invalid token error, verifies **AC-3**.
* Anti abuse invite gate: Unverified owner creating team invitations saves pending records but does not dispatch live emails, returning a verification warning, verifies **AC-7**.
* Non blocking banner: Owner navigates onboarding steps with visible verification reminder and working resend button, verifies **AC-4**.
* Token expiration: Visiting `/verify-email` with an expired token shows clear expiration messaging and resend action, verifies **AC-5**.
* Atomic consumption: Concurrent verification requests with the same token result in exactly one successful consumption, verifies **AC-3**.
* Environment fallback: Registration and resend actions in development without API key or in test mode print mock logs without throwing, verifies **AC-6**.

## Build plan

1. Add `emailVerifiedAt` to `User` and `consumedAt` to `Verification` in `prisma/schema.prisma` and run migration, satisfies **AC-3**
2. Create branded `VerifyEmail` React Email template in `src/components/emails/VerifyEmail.tsx`, satisfies **AC-2**
3. Configure Better Auth `emailVerification` hooks in `src/lib/auth/index.ts` with namespaced token generation, Resend sending, and mock logger fallback, satisfies **AC-1**, **AC-6**
4. Update `createTeamInvitationsAction` to verify that `user.emailVerified === true` before executing live provider email dispatches, satisfies **AC-7**
5. Implement `resendVerificationEmailAction` with Better Auth rate limiting and 60 second database cooldown, satisfies **AC-4**
6. Create public `/verify-email` route handling atomic token verification, referrer policy protection, and status states, satisfies **AC-3**, **AC-5**
7. Build dismissible `EmailVerificationBanner` and wire into onboarding layout for unverified owners, satisfies **AC-4**

## Consequences

**Positive**:
* Owners confirm their email addresses without onboarding friction or progression drop off.
* Email domain reputation is guarded against spam abuse by restricting live outbound invite dispatch to verified users.
* Strict token namespace isolation eliminates cross feature token substitution attacks.
* Atomic consumption prevents concurrent race condition exploits.
* Audit retention allows verification history tracking.

**Negative / tradeoffs**:
* Unverified accounts cannot immediately dispatch live invite emails to teammates, though they can copy the shareable invite link.
* Additional email sending volume on Resend for every signup.

**Neutral**:
* Requires a small schema migration to add timestamp columns.
* Onboarding layout gains a top notification banner for unverified sessions.

## Follow-up

- [ ] Consider adding optional email verification enforcement before workspace deletion or payment operations in later phases.
