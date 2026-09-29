# Verify: Email Verification · spec 0012 · updated 2026-09-27

Steps derived from spec 0012 acceptance criteria and value sourcing. `/check verify` runs these; `/test` locks the durable ones.

## UI / manual

* [x] Register a new owner account on landing page -> verification email is automatically dispatched with namespaced identifier -> AC-1, AC-6
* [x] Inspect dispatched verification email -> branded template contains Streamline logo, `#161616` action button, and link to `/verify-email?token=...` -> AC-2
* [x] Click verification link in email -> lands on `/verify-email`, atomically marks `User.emailVerified = true`, updates timestamps, and displays success state -> AC-3
* [x] Click verification link from a separate browser or incognito session without cookies -> verification succeeds cleanly across devices and links to login -> AC-3
* [x] Navigate onboarding steps with an unverified account -> top notification banner is visible with working resend button -> AC-4
* [x] Click resend button -> triggers fresh verification email and activates 60 second cooldown timer -> AC-4
* [x] Unverified owner creates team invitations in onboarding step 5 -> invitations save in database, but live email dispatch is held with warning banner -> AC-7
* [x] Verified owner creates team invitations in onboarding step 5 -> invitations save and live emails dispatch successfully -> AC-7
* [x] Attempt to use an email verification token on the `/reset-password` endpoint -> request is rejected due to token namespace mismatch -> AC-3
* [x] Attempt to use an expired token (>24 hours) -> displays friendly expiration message and option to request a new link -> AC-5
* [x] Click a previously consumed verification link -> displays friendly already verified message without errors -> AC-5
* [x] Verify consumed token record in database -> `Verification.consumedAt` timestamp is populated -> AC-3
* [x] Run signup in local development or test environment without `RESEND_API_KEY` -> mock logger logs email details without throwing -> AC-6

## Commands

* [x] `npx vitest run tests/auth/email-verification.test.ts` -> all unit and integration tests pass cleanly -> AC-1 through AC-7
* [x] `npm run build` -> Next.js production build succeeds with clean type checking -> AC-1 through AC-7
* [x] `npm test` -> full workspace test suite passes without regression -> AC-1 through AC-7

## Acceptance criteria coverage

* AC-1: Automated verification email dispatch upon owner registration with isolated namespace
* AC-2: Branded React Email template with Streamline logo and dark button style
* AC-3: Successful atomic token verification and timestamp tracking across devices
* AC-4: Non blocking onboarding banner with rate limited resend capability
* AC-5: Graceful error states for expired, invalid, and already consumed tokens
* AC-6: Development and test mock logger fallback without external provider dependency
* AC-7: Outgoing transactional email gating protecting domain reputation until owner is verified
