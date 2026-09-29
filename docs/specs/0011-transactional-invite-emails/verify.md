# Verify: Transactional Invite Emails · spec 0011 · updated 2026-09-27

Steps derived from spec 0011 acceptance criteria and value sourcing. `/check verify` runs these; `/test` locks the durable ones.

## UI / manual

* [x] Create team invitations in onboarding step 5 or via `createTeamInvitationsAction` -> email dispatch is invoked for each recipient -> AC-1
* [x] Verify email preview contains workspace name, inviter name, role badge, and working join button linking to `/invite/:token` -> AC-1, AC-2
* [x] Verify `Invitation.emailSentAt` is populated in the database after successful dispatch -> AC-3
* [x] Run invitation creation in local development without `RESEND_API_KEY` -> mock logger prints email content and working URL to server logs without errors -> AC-4
* [x] Simulate Resend API network failure -> invitation is successfully saved in database, and action returns `{ success: true, emailWarnings: [...] }` -> AC-5
* [x] Submit multiple invitations where one email causes a delivery error -> remaining invitations are delivered successfully and their `emailSentAt` timestamps are updated -> AC-6
* [x] Value sourcing: verify recipient email matches `invites[i].email` from input -> AC-1
* [x] Value sourcing: verify recipient role matches `invites[i].role` from input -> AC-1
* [x] Value sourcing: verify inviter name matches `user.name` or `user.email` from session -> AC-1, AC-2
* [x] Value sourcing: verify inviter `Reply-To` matches `user.email` from session -> AC-2
* [x] Value sourcing: verify workspace display name matches `organization.name` from database -> AC-1, AC-2
* [x] Value sourcing: verify personal invite URL derived from `${proto}://${host}/invite/${rawToken}` -> AC-1
* [x] Value sourcing: verify `emailSentAt` timestamp recorded upon provider dispatch -> AC-3
* [x] Value sourcing: verify sender address derived from `EMAIL_FROM` configuration -> AC-2

## Commands

* [x] `npx vitest run tests/workspace/transactional-email.test.ts` -> all 7 tests pass cleanly -> AC-1 through AC-6
* [x] `npm run build` -> Next.js production build succeeds with clean type checking -> AC-1 through AC-6
* [x] `npm test` -> full workspace test suite (170 tests across 14 test files) passes -> AC-1 through AC-6

## Acceptance criteria coverage

* AC-1: Automated invite email payload compilation with working personal invite URL
* AC-2: Branded React Email template rendering with inviter attribution and Reply To header
* AC-3: Database `Invitation.emailSentAt` timestamp tracking
* AC-4: Graceful mock logger fallback in development and test environments
* AC-5: Error isolation preventing database rollback on email provider failure
* AC-6: Safe batch iteration across multiple invite recipients
