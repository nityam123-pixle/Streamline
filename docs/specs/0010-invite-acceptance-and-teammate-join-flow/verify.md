# Verify: Invite Acceptance and Teammate Join Flow · spec 0010 · updated 2026-09-27

Steps derived from spec 0010 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones.

## UI / manual

* [x] Visit `/invite/:token` with a valid, pending token as an unauthenticated visitor -> form displays organization name, role, and locked email field -> AC-1
* [x] Enter name and password on `/invite/:token` and submit -> account is created, session is established, member is added to organization with invited role, invitation status becomes accepted, and browser redirects to `/launch` -> AC-2
* [x] Visit `/invite/:token` while logged in with the matching email -> one click join button appears; clicking it attaches the user as a member and redirects to `/launch` -> AC-3
* [x] Visit `/invite/:token` while logged in with a different email -> error banner indicates email mismatch and prompts user to log out -> AC-4
* [x] Visit `/invite/:token` with an expired or revoked token -> informative error screen displays with links to log in or contact the workspace owner -> AC-5
* [x] Visit `/join/:code` with a valid organization invite code -> join form renders; submitting creates account or one click joins as viewer and redirects to `/launch` -> AC-6
* [x] Visit `/join/:code` with an invalid code -> error screen indicates workspace invite link was not found -> AC-7
* [x] As an invited member with role viewer or editor, log in or visit `/` -> user is automatically routed to `/launch`, completely bypassing the six step owner onboarding sequence -> AC-8
* [x] Attempt registration on `/invite/:token` or `/join/:code` using an email that already exists -> registration is stopped and user is prompted to log in to join -> AC-9


## Commands

* [x] `npx vitest run tests/workspace/invite-acceptance.test.ts` -> all unit and integration tests pass cleanly -> AC-1 through AC-9
* [x] `npm run build` -> Next.js production build succeeds with clean type checking and zero export errors -> AC-1 through AC-9
* [x] `npm test` -> full test suite passes across all modules -> AC-1 through AC-9

## Acceptance criteria coverage

* AC-1: Public token invite page rendering and email field locking
* AC-2: Unauthenticated token invite registration and role attachment
* AC-3: Authenticated one click token invite acceptance
* AC-4: Logged in email mismatch detection and error handling
* AC-5: Expired and revoked token rejection
* AC-6: Shareable organization invite code join flow with viewer role
* AC-7: Invalid organization code handling
* AC-8: Non owner onboarding bypass to `/launch`
* AC-9: Existing user email collision handling directing to login flow
