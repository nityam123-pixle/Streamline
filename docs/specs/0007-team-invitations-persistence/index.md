# 0007. Team Invitations Persistence

**Date**: 2026-09-26
**Status**: In Progress

## Summary

This specification defines how Streamline saves pending team member invitations and exposes shareable workspace invite links during onboarding step five. It allows workspace owners to invite colleagues by entering email addresses and selecting roles, or skip the step without adding teammates. Raw invitation tokens are created using secure random bytes and stored in the database as cryptographic hashes, keeping tokens safe even if database records are exposed. Completing or skipping the step updates the workspace onboarding record to the launch step.

## Requirements

**User stories**:
- As a workspace owner, I want to invite teammates by email with designated roles so that they can join my workspace to collaborate on automations.
- As a workspace owner, I want a shareable workspace invite link so that I can invite my team quickly through messaging channels without typing individual emails.
- As a workspace owner, I want the option to skip team invitations so that I can complete onboarding quickly and invite teammates later.

**Acceptance criteria**:
- **AC-1**: An authenticated owner or admin visiting the team invitation step can view any existing pending invitations for their workspace, along with a permanent shareable invite link.
- **AC-2**: Submitting one or more valid teammate email addresses with chosen roles (editor, admin, viewer) validates inputs and creates pending invitation records linked to the workspace.
- **AC-3**: Each created invitation receives a status of pending, a foreign key referencing the inviter user ID, a seven day expiration timestamp, and an SHA 256 cryptographic hash of a raw random token.
- **AC-4**: Clicking Skip for now with no teammate emails entered safely advances the workspace onboarding step to launch without creating blank invitation records.
- **AC-5**: Submitting duplicate emails within a single form submission halts mutation with a validation error to prevent conflicting role assignments. Re-inviting an email that already has a pending invitation in the workspace gracefully updates the existing record role, refreshes the expiration timestamp, and generates a new token hash.
- **AC-6**: Submitting an email address that already belongs to an active member of the workspace halts the mutation and returns a clear validation error.
- **AC-7**: The shareable link card displays and copies a valid workspace invite URL based on the organization shareable invite code.
- **AC-8**: All invitation actions verify the active session and enforce that only workspace owners or admins can create or query invitations, scoping all queries strictly by organization ID.

## Decision

**Chosen option**: Option 1: Transactional batch upsert with hashed tokens, database role enum alignment, and organization shareable invite codes

We persist team invitations using a dedicated Server Action that validates inputs with Zod, checks session authorization, hashes raw invite tokens with SHA 256 before database insertion, and updates the workspace onboarding step to launch inside a single atomic database transaction. The Prisma Role enum adds the viewer role so UI options match database constraints cleanly, and the Organization record stores a reusable plain text invite code for shareable links.

**Implementation skills**: `better-auth-best-practices` (`better-auth/skills`, `.agents/skills/better-auth-best-practices/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Rationale

Reasoning and options: see rationale.md

## Feature design

**Data model sketch**:

Table: `organization` (extended)
- `id`: String (Primary Key, cuid)
- `name`: String
- `slug`: String (Unique)
- `inviteCode`: String? (Unique, plain text alphanumeric code for reusable shareable invite links)
- `onboardingStep`: String (updated to `"launch"` upon completion)
- Relations: has many `Member` records, has many `Invitation` records

Table: `invitation` (existing, aligned)
- `id`: String (Primary Key, cuid)
- `organizationId`: String (Foreign Key referencing `organization.id`, Cascade Delete)
- `email`: String (Recipient email address)
- `role`: Role enum (`owner`, `admin`, `editor`, `viewer`, default `editor`)
- `status`: String (default `"pending"`)
- `token`: String (Unique, SHA 256 cryptographic hash of raw random token)
- `expiresAt`: DateTime (seven days from creation)
- `inviterId`: String (Foreign Key referencing `user.id`, Cascade Delete)
- `createdAt`: DateTime
- `updatedAt`: DateTime
- Constraints: Unique on `[organizationId, email]`

Enum: `Role` (updated)
- Values: `owner`, `admin`, `editor`, `viewer`

**State transitions**:
- Invitation lifecycle: `pending` (created on step five) -> `accepted` (when teammate joins workspace in future feature) or `expired` (when current time exceeds `expiresAt`) or `revoked` (if canceled by admin).

**API surface**:

| Function | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `getTeamInvitationsAction` | Server Action | none | `success: boolean`, `invitations: array`, `inviteLink: string` | Authenticated session (owner or admin) | 401 Unauthorized, 403 Forbidden, 404 Workspace not found |
| `createTeamInvitationsAction` | Server Action | `invites: array of { email: string, role: string }` | `success: boolean`, `count: number`, `onboardingStep: string` | Authenticated session (owner or admin) | 400 Invalid input, 401 Unauthorized, 403 Forbidden, 409 Already a member |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| `getTeamInvitationsAction` | Existing pending invitations list | Database query on `invitation` table filtered by `organizationId === workspaceId` |
| `getTeamInvitationsAction` | Workspace shareable invite link | Derived from `organization.inviteCode` formatted with request host header |
| `createTeamInvitationsAction` | `invitation.organizationId` | Derived from authenticated session active organization or member lookup |
| `createTeamInvitationsAction` | `invitation.inviterId` | Derived from authenticated session user ID |
| `createTeamInvitationsAction` | `invitation.email` | Client form submission validated with Zod |
| `createTeamInvitationsAction` | `invitation.role` | Client form submission validated against Role enum |
| `createTeamInvitationsAction` | `invitation.status` | Set to `"pending"` on creation or update |
| `createTeamInvitationsAction` | `invitation.token` | SHA 256 hash of server generated 32 byte random hex token |
| `createTeamInvitationsAction` | `invitation.expiresAt` | Server computed timestamp (current time plus seven days) |
| `createTeamInvitationsAction` | `organization.onboardingStep` | Updated to `"launch"` upon successful persistence |
| `createTeamInvitationsAction` | `organization.inviteCode` | Generated via collision check and retry with crypto entropy and UUID fallback if previously null |

**Key invariants**:
- Raw invitation tokens must never be persisted to the database. Only their SHA 256 hash is saved.
- An email address cannot have more than one pending invitation per workspace. Reinviting updates the role and refreshes token expiration.
- Submitting duplicate emails within the same submission is rejected with a validation error to prevent silent role assignment conflicts.
- Submitted email addresses are normalized to lower case and trimmed before comparison and storage.
- Role strings from the user interface (such as Editor, Admin, Viewer) are normalized to lower case enum values (editor, admin, viewer) before validation and storage.
- A user who is already an active member of the workspace cannot be invited.
- Organization shareable invite codes are stored in plain text because they are public reusable links, whereas individual email invite tokens are one time secrets.
- Organization inviteCode generation must follow the collision check and retry pattern used for workspace slugs in src/actions/auth.ts: generate a candidate using crypto random bytes, verify uniqueness in transaction via database query, retry up to five times with fresh entropy if a collision occurs, and fall back to randomUUID if all attempts collide, rather than relying on random string length alone.
- If an organization record has a null inviteCode when getTeamInvitationsAction is invoked, the action lazily generates a unique code using this retry pattern and saves it to the organization record.
- Submitting an empty list of emails is treated as a valid skip, advancing the workspace onboarding step without creating database errors.

**Security model**:
- Authenticated session required for all reads and writes via Better Auth session cookie.
- Authorization checks verify that the calling user has `owner` or `admin` role in the active workspace.
- Cross tenant data isolation is enforced by scoping all queries and mutations to `organizationId === workspaceId`.
- Raw tokens are generated using `crypto.randomBytes(32).toString("hex")` and hashed with SHA 256 prior to persistence, preventing token harvesting from database backups.

**Configuration required**:
- No new environment variables required. Reuses existing `DATABASE_URL` and `BETTER_AUTH_SECRET`.

**Critical test scenarios**:
- Happy path: An owner enters two teammate emails with Editor and Admin roles, clicks Continue, records are saved as pending with hashed tokens, and step advances to launch, verifies **AC-2**, **AC-3**.
- Skip flow: An owner clicks Skip for now with empty fields, no invitation records are created, and onboarding step advances to launch, verifies **AC-4**.
- Duplicate email handling: An owner submits an email that already has a pending invitation, updating the role and resetting expiration, verifies **AC-5**.
- Existing member rejection: An owner submits an email of an existing workspace member, receiving a validation error, verifies **AC-6**.
- Share link generation: Loading the step displays a permanent invite link using the organization invite code, and copying the link places it on the clipboard, verifies **AC-1**, **AC-7**.
- Authorization check: An unauthenticated user or non admin user calling the Server Action receives an unauthorized error, verifies **AC-8**.

## Build plan

- [x] 1. Update `prisma/schema.prisma` to add `viewer` to `Role` enum and `inviteCode` to `Organization`, run migration, satisfies **AC-3**, **AC-7**
- [x] 2. Create Zod validation schemas and TypeScript types in `src/lib/team-invitation/schemas.ts`, satisfies **AC-2**, **AC-5**, **AC-6**
- [x] 3. Create Server Action `getTeamInvitationsAction` in `src/actions/team-invitation.ts` to fetch pending invites and provide shareable links, generating `inviteCode` using the in transaction collision check and retry pattern with UUID fallback, satisfies **AC-1**, **AC-7**, **AC-8**
- [x] 4. Create Server Action `createTeamInvitationsAction` in `src/actions/team-invitation.ts` to validate inputs, upsert invitations with SHA 256 token hashes, handle empty skip, and advance onboarding step to launch, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-8**
- [x] 5. Connect `TeamInvitationStepContent` and `ShareLinkCard` to Server Actions with loading spinners, inline errors, and clipboard feedback, satisfies **AC-1**, **AC-4**, **AC-7**

## Consequences

**Positive**:
- Secure invitation persistence with hashed tokens protects invite secrets against database exposure.
- Matching database enum with UI roles prevents runtime type casting mismatches.
- Persistent shareable links allow immediate collaboration without requiring transactional email services.
- Clean skip capability ensures users can complete onboarding without friction.

**Negative / tradeoffs**:
- Adding a value to a PostgreSQL enum requires a schema migration.
- Raw invitation tokens cannot be recovered from the database if lost before being delivered to the user.

**Neutral**:
- Actual email dispatch and invitation acceptance pages remain deferred to subsequent features per scope.

## Follow-up

- [ ] Ensure future feature 8 (Setup summary) reads invited teammates count and pending invitations from the database for display on step six.
- [ ] Implement deferred feature for accepting invitations when building the public member registration flow.
