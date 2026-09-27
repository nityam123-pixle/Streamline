# 0010. Invite Acceptance and Teammate Join Flow

**Date**: 2026-09-27
**Status**: Accepted

## Summary

This specification defines the public invite acceptance and teammate join journey for Streamline. Invited collaborators can accept personal invitations via email tokens at `/invite/:token` or join through an organization shareable link at `/join/:code`. New visitors can register an account and join in one step, while existing authenticated users can confirm workspace membership with a single click. Teammates bypass the owner onboarding flow and land directly on the launch screen with their assigned role.

## Requirements

**User stories**:
* As an invited teammate receiving an email invite, I want to click my invite link to create my account and join the workspace with my assigned role so that I can collaborate with my team immediately.
* As an invited collaborator with an existing Streamline account, I want to accept an invite with a single click while logged in so that I do not need to register again.
* As an organization member joining through a shareable link, I want to enter my details and join the workspace as a viewer so that my team can collaborate without waiting for an individual email invite.
* As an invited teammate, I want to bypass the six step owner setup journey upon joining so that I land directly on the workspace launch view without redoing owner configuration.
* As a workspace owner, I want expired, revoked, or claimed invites to be rejected so that unauthorized users cannot gain access to our workspace.

**Acceptance criteria**:
* **AC-1**: Visiting `/invite/:token` with a valid, unexpired, pending token loads the invite acceptance interface, displaying the organization name, invited role, and the locked invited email address.
* **AC-2**: Submitting valid registration details (full name, password) on `/invite/:token` creates the user account, establishes a session, attaches the user as a Member with the invited role, marks the invitation status as accepted, and redirects to `/launch`. (If the email already belongs to an existing User account, registration is halted per AC-9).
* **AC-3**: Visiting `/invite/:token` while authenticated with the invited email displays a one click join button; clicking it attaches the user to the workspace, marks the invitation accepted, and redirects to `/launch`.
* **AC-4**: Visiting `/invite/:token` while authenticated with a different email displays an error banner explaining the email mismatch and prompts the user to log out.
* **AC-5**: Visiting `/invite/:token` with an expired, revoked, or nonexistent token displays an error screen with an explanation and links to contact the workspace owner or log in.
* **AC-6**: Visiting `/join/:code` with a valid organization invite code displays the workspace join interface; registering or joining assigns the user a Member record with the default viewer role and redirects to `/launch`. (If the email already belongs to an existing User account, registration is halted per AC-9).
* **AC-7**: Visiting `/join/:code` with an invalid or nonexistent code displays a clear error state indicating the workspace invite link was not found.
* **AC-8**: Non owner members (`role !== "owner"`) logging in or visiting `/`, `/login`, or onboarding routes automatically bypass the six step owner onboarding sequence and redirect directly to `/launch`.
* **AC-9**: When an unauthenticated visitor attempts registration on `/invite/:token` or `/join/:code` using an email address that already belongs to an existing User account, the system halts registration without a raw database uniqueness error and displays an error message directing them to log in first to accept the invitation via the one click flow.

## Decision

**Chosen option**: Option 1: Dual route public entrypoints with Server Actions and automated onboarding bypass.

We establish two dedicated public routes for teammate onboarding: `/invite/:token` for cryptographically verified individual invitations and `/join/:code` for organization shareable links. New teammates can complete registration and membership attachment in a single submission, while authenticated members can accept with a single click. The shared resume helper `getOnboardingResumeState` enforces an automatic bypass for non owner roles, routing them directly to `/launch`.

**Implementation skills**: `better-auth-best-practices` (`better-auth/skills`, `.agents/skills/better-auth-best-practices/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Rationale

See rationale.md for context, options considered, and reasoning.

## Feature design

**Data model sketch**:

Zero schema migrations required. Reuses the existing Prisma schema models:

* `Invitation`:
  * `id`: String (cuid, primary key)
  * `organizationId`: String (foreign key to Organization.id)
  * `email`: String (invited email address)
  * `role`: Role (`owner`, `admin`, `editor`, `viewer`)
  * `status`: String (`pending`, `accepted`, `revoked`)
  * `token`: String (unique SHA-256 hash of the 32 byte hex token)
  * `expiresAt`: DateTime (7 day expiration)
  * `inviterId`: String (foreign key to User.id)
* `Organization`:
  * `id`: String (cuid, primary key)
  * `name`: String
  * `slug`: String (unique)
  * `inviteCode`: String? (unique 8 character alphanumeric code)
  * `onboardingStep`: String
* `Member`:
  * `id`: String (cuid, primary key)
  * `organizationId`: String (foreign key to Organization.id)
  * `userId`: String (foreign key to User.id)
  * `role`: Role (`owner`, `admin`, `editor`, `viewer`)
  * Unique constraint: `@@unique([organizationId, userId])`
* `User`:
  * `id`: String (cuid, primary key)
  * `name`: String
  * `email`: String (unique)
* `Account`:
  * `userId`: String (foreign key to User.id)
  * `password`: String (hashed password)
  * `providerId`: String (`credential`)

**State transitions**:

Invitation lifecycle:
`pending` -> `accepted` (upon token submission or one click accept)
`pending` -> `revoked` (if cancelled by workspace admin)

Organization membership creation:
No member record -> `Member` created with `role: invitation.role` (for `/invite/:token`)
No member record -> `Member` created with `role: viewer` (for `/join/:code`)

**API surface**:

| Surface | Layer | Key inputs | Key outputs | Auth requirement | Key errors |
|---|---|---|---|---|---|
| `InvitePage` | Public Server Component (`src/app/invite/[token]/page.tsx`) | `token: string` | Renders join form or one click accept | Public or Authenticated Session | Token expired, invalid token, email mismatch |
| `JoinPage` | Public Server Component (`src/app/join/[code]/page.tsx`) | `code: string` | Renders join form or one click accept | Public or Authenticated Session | Invalid invite code |
| `acceptTokenInvitationAction` | Server Action (`src/actions/team-invitation.ts`) | `token: string`, `name?: string`, `password?: string` | `{ success: boolean, redirectUrl: string }` | Public or Session | Invalid token, expired token, user already member |
| `joinOrganizationByCodeAction` | Server Action (`src/actions/team-invitation.ts`) | `code: string`, `name?: string`, `email?: string`, `password?: string` | `{ success: boolean, redirectUrl: string }` | Public or Session | Invalid code, email already in use, already member |

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| Token invite page verification | Organization name, inviter name, role | Look up `Invitation` where `token == sha256(param)`, include `Organization` and `Inviter` |
| Token invite page email lock | Pre populated email | `Invitation.email` from database record |
| Token invite acceptance | Hashed token comparison | SHA-256 digest of URL `[token]` parameter |
| Token invite membership role | Assigned member role | `Invitation.role` from database record |
| Code join verification | Organization name | Look up `Organization` where `inviteCode == code` |
| Code join membership role | Assigned member role | Default `viewer` role |
| Non owner resume bypass | Destination route `/launch` | In `getOnboardingResumeState`: check if user `Member.role !== "owner"`, return target `/launch` |
| Registration email collision check | Existing user account presence | Query `User` by email in `acceptTokenInvitationAction` and `joinOrganizationByCodeAction` |

**Key invariants**:

* Each user can have at most one `Member` association per organization (`@@unique([organizationId, userId])`).
* The token stored in `Invitation.token` is a SHA-256 hash. The client supplies the raw 32 byte hex token, which is hashed on the server prior to database lookup.
* An invitation can be accepted only once. Accepting an invitation transitions `status` to `accepted` in an atomic database transaction.
* An existing logged in user whose email does not match the token invitation cannot accept it; they must log out first.
* If an unauthenticated registration submission contains an email that already belongs to an existing `User`, registration aborts with a user friendly error directing them to log in first, preventing database uniqueness constraint errors.
* Non owner members (`role !== "owner"`) always bypass the six step owner onboarding flow and land on `/launch`.

**Security model**:

* Database records never store raw invitation tokens.
* Public verification endpoints return only sanitized organization names and roles, preventing user enumeration or credential leakage.
* New user registration hashes passwords through Better Auth scrypt configuration.
* All membership insertions and invitation status changes execute in atomic Prisma transactions.

**Configuration required**:

None. Uses existing database connection and auth secrets.

**Critical test scenarios**:

* Happy path token invite: New user registers and accepts a pending token invite, verifies **AC-1**, **AC-2**
* Authenticated one click join: Logged in user with matching email accepts invite with one click, verifies **AC-3**
* Authenticated email mismatch: Logged in user with mismatched email is blocked and prompted to log out, verifies **AC-4**
* Invalid or expired token: Visitor with expired or tampered token receives informative error screen, verifies **AC-5**
* Shareable invite code join: Visitor joins via organization code with viewer role, verifies **AC-6**
* Invalid invite code: Visitor with invalid code receives error screen, verifies **AC-7**
* Non owner onboarding bypass: Non owner teammate logging in bypasses owner steps to `/launch`, verifies **AC-8**
* Existing account conflict: Submitting registration on `/invite/:token` or `/join/:code` with an existing user email returns an error directing them to log in first, verifies **AC-9**

## Build plan

Ordered tasks following the Tracer Bullet delivery approach:

1. Update `getOnboardingResumeState` in `src/lib/onboarding/routing.ts` so that non owner members (`role !== "owner"`) bypass owner onboarding routes and resume directly at `/launch`, satisfies **AC-8**
2. Update Feature 7 shareable invite link generation in `src/actions/team-invitation.ts` and `src/actions/launch.ts` to emit `/join/${inviteCode}` instead of `/invite/${inviteCode}`, satisfies **AC-6**
3. Define Zod input schemas for invite token acceptance and code join in `src/lib/team-invitation/schemas.ts`, satisfies **AC-1**, **AC-2**, **AC-6**, **AC-9**
4. Implement Server Action `acceptTokenInvitationAction` in `src/actions/team-invitation.ts` executing existing user check, atomic account registration, membership creation with invited role, and status transition, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-9**
5. Implement Server Action `joinOrganizationByCodeAction` in `src/actions/team-invitation.ts` executing existing user check, code validation, and viewer membership creation, satisfies **AC-6**, **AC-7**, **AC-9**
6. Create the public token invite page `src/app/invite/[token]/page.tsx` with token verification, redirect shim for 8 character codes, registration form with existing account prompt, and one click join view, satisfies **AC-1**, **AC-3**, **AC-4**, **AC-5**, **AC-9**
7. Create the public organization join page `src/app/join/[code]/page.tsx` with code verification, registration form with existing account prompt, and one click join view, satisfies **AC-6**, **AC-7**, **AC-9**
8. Adapt the launch screen in `src/components/launch/LaunchStepContent.tsx` to display a teammate welcome banner for non owner roles, satisfies **AC-2**, **AC-3**, **AC-6**, **AC-8**
9. Create automated integration test suite in `tests/workspace/invite-acceptance.test.ts` verifying all nine acceptance criteria, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-8**, **AC-9**

## Consequences

**Positive**:
* Enables seamless team collaboration without manual administrator intervention.
* Prevents invited collaborators from being trapped in the owner onboarding wizard.
* Protects workspace access through cryptographic token hashing and email verification checks.
* Requires zero database migrations or schema adjustments.

**Negative**:
* Post onboarding dashboard remains a placeholder until Slice 6 is designed.
* Logged in users with different email addresses must log out before claiming token invites.

**Tradeoffs**:
* Shareable invite codes grant the viewer role by default to prevent accidental privilege escalation.
