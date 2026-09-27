# Verify: Team Invitations Persistence · spec 0007 · updated 2026-09-26

_Steps derived from spec 0007 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [x] Visit `/team-invitation` as an authenticated owner -> shareable invite link displays with unique invite code -> AC-1, AC-7
- [x] Click "Copy invite link" -> clipboard receives valid URL and button shows copied confirmation -> AC-7
- [x] Click "Skip for now" with empty fields -> advances to `/launch` and database records `onboardingStep = "launch"` without creating invitation rows -> AC-4
- [x] Enter email of an existing workspace member -> submission halts and inline error displays -> AC-6
- [x] Enter valid teammate emails with Editor, Admin, Viewer roles and click Continue -> creates pending invitations in database with sixty four character SHA 256 token hashes, advances to `/launch` -> AC-2, AC-3
- [x] Revisit `/team-invitation` and submit an email that already has a pending invitation with a different role -> updates existing role and refreshes expiration timestamp -> AC-5

## Commands

- [x] `npx vitest run tests/workspace/team-invitation.test.ts` -> all fifteen unit and integration tests pass cleanly -> AC-1 through AC-8
- [x] `npm run build` -> Next.js production build succeeds with clean type checking and zero export errors -> AC-1 through AC-8
- [x] `npm test` -> full test suite of one hundred tests passes across all modules -> AC-1 through AC-8

## Acceptance criteria coverage

- AC-1: Share link display and getTeamInvitationsAction test
- AC-2: Multi email role submission and database verification
- AC-3: Token hash length check (sixty four hex chars) and seven day expiration verification
- AC-4: Skip for now flow with zero rows created
- AC-5: Duplicate and re-invitation upsert test
- AC-6: Existing member rejection test
- AC-7: ShareLinkCard clipboard and inviteCode generation test
- AC-8: Session authorization and non-owner forbidden test

## Value sourcing coverage

- `invitation.organizationId`: session derived active organization ID
- `invitation.inviterId`: session derived user ID
- `invitation.email`: normalized lower case trimmed email from client form
- `invitation.role`: mapped enum from user interface select
- `invitation.token`: SHA 256 hash of server generated thirty two byte random hex token
- `invitation.expiresAt`: server calculated seven day expiration
- `organization.inviteCode`: generated via collision check and retry with UUID fallback
- `organization.onboardingStep`: updated to launch on submit or skip
