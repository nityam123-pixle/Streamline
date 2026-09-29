# Verify: Password Reset · spec 0013 · updated 2026-09-28

Steps derived from spec 0013 acceptance criteria and value sourcing. `/check verify` runs these; `/test` locks the durable ones.

## UI / manual

- [x] Navigate to `/forgot-password` and submit an unregistered email address -> displays generic confirmation message without disclosing account non existence and with matching latency -> AC-2
- [x] Submit a valid registered email address on `/forgot-password` -> reset email is dispatched with namespaced identifier `reset-password:${email}` -> AC-1, AC-2, AC-6
- [x] Inspect dispatched reset email -> branded template contains Streamline logo, `#161616` action button, and link to `/reset-password?token=...` -> AC-3
- [x] Navigate to `/reset-password` without a token or with an expired token (>1 hour) -> displays expired or invalid warning without showing password input fields -> AC-4
- [x] Attempt to submit an email verification token on `/reset-password` -> rejected due to namespace mismatch -> AC-4
- [x] Open a valid reset link -> renders password and confirmation inputs with validation feedback -> AC-4, AC-5
- [x] Attempt to submit a weak password (<8 characters or no numbers) -> displays clear validation error and blocks submission -> AC-5
- [x] Submit a valid new password -> password hash updates, Verification.consumedAt is marked atomically, and user is redirected to `/login?reset=success` -> AC-5
- [x] Test previous session from another browser or device -> old session and cookie cache are rejected, forcing re authentication with new password -> AC-5
- [x] Attempt to reuse the consumed reset link -> displays expired or already consumed notice -> AC-4, AC-5
- [x] Run reset request in local development without `RESEND_API_KEY` -> mock logger prints reset URL to console without throwing -> AC-6

## Commands

- [x] `npx vitest run tests/auth/password-reset.test.ts` -> all unit and integration tests pass cleanly -> AC-1 through AC-6
- [x] `npm run build` -> Next.js production build succeeds with clean type checking -> AC-1 through AC-6
- [x] `npm test` -> full workspace test suite passes without regression -> AC-1 through AC-6

## Acceptance criteria coverage

- AC-1: Automated reset token generation with isolated namespace and email dispatch for registered accounts
- AC-2: Generic confirmation response with timing side channel defense for unregistered email submissions
- AC-3: Branded React Email template with Streamline logo and dark button style
- AC-4: Immediate token validation on page load with clear expired or invalid messaging
- AC-5: Password complexity enforcement, database password update, session and cookie cache revocation, and atomic consumedAt marking
- AC-6: Development and test mock logger fallback without external provider dependency
