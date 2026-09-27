# Verify: Workspace profile persistence (Feature 4)
Updated 2026-09-25

Observable runtime proof and database evidence ledger for Feature 4.

## UI and manual verification
- [x] Unauthenticated request to /about redirects to /login with callbackUrl parameter (HTTP 307)
- [x] Authenticated request to /about renders step two shell with title Tell us about yourself (HTTP 200)
- [x] First and last name inputs prefill automatically from session user name
- [x] Submitting form with missing required fields displays inline alert error messages without leaving the page
- [x] Submitting valid profile updates user first and last name, organization company name, team size, and member jobTitle in database
- [x] Successful profile submission advances organization onboardingStep to automation and transitions client to step three
- [x] Subsequent visit to /about preloads saved profile data via getWorkspaceProfileAction

## Live database evidence
Verified via scripts/verify-workspace-profile.ts against live dev server and Neon PostgreSQL:
- Owner user record:
  - User ID: CEYLBOE7buxGOMmBiYwAcxRri6TVsINE
  - First name: Nityam
  - Last name: Suchak
  - Full name: Nityam Suchak
- Organization record:
  - Organization ID: cmugp17ih0000buq0cd8ind9r
  - Company name: Streamline Automations Inc
  - Team size: 11-50 people
  - Onboarding step: automation
- Workspace membership:
  - Member role: owner
  - Job title: Founder / CEO
- Fresh lifecycle verification:
  - Created test owner Morgan Le Fay with workspace Avalon Automations
  - Updated role to Engineering / Technical and team size to 51-200 people
  - Confirmed atomic persistence and step progression to automation
  - Cleaned up temporary test records

## Commands
- [x] npm run build (Next.js 16 build succeeds with zero compiler or type errors)
- [x] npx vitest run tests/workspace/profile.test.ts (12 unit and integration tests passing)
- [x] npx tsx scripts/verify-workspace-profile.ts (7 end to end runtime checks passing)
- [x] npm test (62 of 62 tests passing across all 7 test suites)

## Code locations
- Schema and validation: src/lib/workspace/schemas.ts
- Server Actions and database transaction: src/actions/workspace.ts
- About step view and state preloading: src/components/about/AboutStepContent.tsx
- Automated test suite: tests/workspace/profile.test.ts
- End to end verification script: scripts/verify-workspace-profile.ts
