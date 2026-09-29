# 0011. Transactional Invite Emails

**Date**: 2026-09-27
**Status**: Accepted

## Summary

This specification defines transactional email delivery for team invitations in Streamline. When a workspace owner or administrator creates team invitations during onboarding or in workspace settings, Streamline sends a branded transactional email to each invitee containing their unique invite link. Built on Resend and React Email, the system delivers responsive email templates with inviter attribution, records delivery timestamps in the database, and gracefully isolates delivery failures so invitation records are never lost.

## Requirements

**User stories**:
* As an invited collaborator, I want to receive an email invitation with workspace context and a direct join link so that I can access my team workspace without manual link sharing.
* As a workspace owner, I want my invited teammates to automatically receive clear email notifications so that team onboarding is seamless and professional.
* As an administrator, I want email delivery failures to be isolated so that a single network or provider error does not roll back created invitations.

**Acceptance criteria**:
* **AC-1**: When `createTeamInvitationsAction` creates valid pending invitations, it compiles an invite email for each recipient containing workspace name, inviter name, assigned role, and working personal invite URL (`/invite/:token`).
* **AC-2**: The email is rendered using React Email (`@react-email/components`) with Streamline brand styling, sent from `${workspaceName} via Streamline <invitations@streamline.app>` (or configured `EMAIL_FROM`), with `Reply-To` set to the inviter email address.
* **AC-3**: Upon successful provider dispatch, the database updates the corresponding `Invitation.emailSentAt` field with the current timestamp.
* **AC-4**: When `RESEND_API_KEY` is not configured or `NODE_ENV === "test"`, the system falls back to a development mock logger, printing email content and the working invite URL to server logs without throwing errors or blocking invitation creation.
* **AC-5**: If the email provider API fails or times out, the failure is caught and isolated, leaving the database `Invitation` record intact in `pending` status, and returning an informative warning message in the action response.
* **AC-6**: Email dispatch operations iterate safely across all valid invites in a batch, ensuring an error on one recipient does not stop delivery to other valid invitees in the same submission.

## Decision

**Chosen option**: Option 1: Direct Resend API dispatch with React Email templates and graceful fallback.

Streamline integrates Resend via its official Node SDK and renders email markup using React Email. Dispatch runs synchronously inside `createTeamInvitationsAction` with comprehensive error boundary protection, ensuring database transactions complete and failures degrade gracefully to warnings.

**Implementation skills**: `better-auth-best-practices` (`better-auth/skills`, `.agents/skills/better-auth-best-practices/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

### Manual shareable link and UI flow coexistence

The manual shareable link flow (`ShareLinkCard` and organization `inviteCode` copy link) stays exactly as is alongside the automated email dispatch. The UI does not change to show inline sent receipts or personal copy links.

This decision rests on three design principles:
* **Dual channel delivery**: Transactional emails deliver role specific personal links (`/invite/:token`) directly into invitee inboxes, while `ShareLinkCard` remains available as an immediate copyable alternative for group messaging channels like Slack or Discord.
* **Onboarding transition lifecycle**: Step 5 (`TeamInvitationStepContent`) already informs users that teammates will receive an email invite. Upon clicking Continue, the wizard transitions immediately to Step 6 (`/launch`), where the launch summary displays the invited teammate count and team roster. No intermediate post creation link screen exists in the Figma flow.
* **Figma UI preservation**: Keeping `ShareLinkCard` and `TeamInvitationStepContent` intact upholds the core project rule to wire data into existing Figma designs without altering layouts or animations.

**Build plan impact**: No onboarding UI components require layout modifications. The build plan touches only the database schema, email template components, email dispatch library, and Server Actions.


## Rationale

See rationale.md for full context, options considered, and trade-off analysis.

## Feature design

**Data model sketch**:
* `Invitation` model updated in `prisma/schema.prisma`:
  * `emailSentAt`: DateTime? (nullable timestamp recording when email was dispatched)

**State transitions**:
* `Invitation.emailSentAt`: null (initial pending) -> DateTime (dispatched via provider or development logger)

**API surface**:
| Endpoint / Action | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `createTeamInvitationsAction` | Server Action (POST) | `invites: { email: string, role: string }[]` | `{ success: boolean, count: number, emailWarnings?: string[] }` | Owner or Admin session | 401 Unauthorized, 400 Invalid input |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| `createTeamInvitationsAction` | Recipient email address | `invites[i].email` from action input |
| `createTeamInvitationsAction` | Recipient invited role | `invites[i].role` from action input |
| `createTeamInvitationsAction` | Inviter display name | `user.name` or `user.email` from session |
| `createTeamInvitationsAction` | Inviter reply to email | `user.email` from session |
| `createTeamInvitationsAction` | Workspace display name | `organization.name` from database |
| `createTeamInvitationsAction` | Personal invite URL | Derived from `${proto}://${host}/invite/${rawToken}` |
| `createTeamInvitationsAction` | `emailSentAt` timestamp | System clock `new Date()` upon provider dispatch |
| `createTeamInvitationsAction` | Sender address `from` | `EMAIL_FROM` env, falling back to `invitations@streamline.app` or `onboarding@resend.dev` |

**Key invariants**:
* An email delivery error must never rollback or delete a valid database `Invitation` record.
* Invitations without a valid API key in development must still be created and provide working URLs via server logs.
* Email links must use the unhashed raw token (`/invite/:rawToken`), while database storage retains only the SHA-256 hash.
* `ShareLinkCard` and the organization shareable invite link remain active and unaltered alongside email delivery.
* Personal invite tokens are delivered securely via email and development logs rather than exposed in client DOM elements.

**Security model**:
* Only authenticated workspace owners and administrators can trigger invite email dispatch.
* Secrets (`RESEND_API_KEY`) remain strictly on the server in `.env.local` and are never bundled to client components.
* `Reply-To` headers reflect the authentic inviter email, preventing spoofed communication.

**Configuration required**:
* `RESEND_API_KEY`: API key for Resend transactional email service (optional in development).
* `EMAIL_FROM`: Sender address format (defaults to `onboarding@resend.dev` in development, `invitations@streamline.app` in production).

**Critical test scenarios**:
* Happy path: creating team invitations dispatches email and records `emailSentAt` timestamp, verifies **AC-1**, **AC-2**, **AC-3**.
* Development mock: creating invitations without `RESEND_API_KEY` logs payload and link without error, verifies **AC-4**.
* Provider failure: Resend API failure leaves invitation in `pending` status and returns delivery warning, verifies **AC-5**.
* Batch isolation: one failing email address does not halt delivery to subsequent valid recipients, verifies **AC-6**.

## Build plan

1. [X] Add `emailSentAt DateTime?` field to `Invitation` in `prisma/schema.prisma` and execute migration, satisfies **AC-3**.
2. [X] Install `resend` and `@react-email/components`, and add environment variable validation in `src/lib/env.ts`, satisfies **AC-4**.
3. [X] Create type safe React Email template component in `src/components/emails/TeamInviteEmail.tsx`, satisfies **AC-1**, **AC-2**.
4. [X] Implement email sending utility in `src/lib/email/invite.ts` with mock logger fallback and individual error isolation, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**.
5. [X] Update `createTeamInvitationsAction` in `src/actions/team-invitation.ts` to dispatch invite emails and persist `emailSentAt`, satisfies **AC-1**, **AC-3**, **AC-5**, **AC-6**.
6. [X] Write automated test suite in `tests/workspace/transactional-email.test.ts` verifying dispatch, mock fallback, error resilience, and database timestamp updates, satisfies **AC-1** through **AC-6**.

*Note on UI files*: No client UI files in `src/components/team-invitation/` require modifications. `ShareLinkCard` and `TeamInvitationStepContent` stay exactly as is, preserving Figma designs while `createTeamInvitationsAction` handles background email dispatch.

## Consequences

**Positive**:
* Eliminates friction of manual invite link copying by sending automated notifications directly to teammates.
* Clean separation of concerns with React Email templates matching Streamline typography and visual styling.
* Robust error isolation guarantees database records are preserved regardless of provider uptime.

**Negative**:
* Introduces external dependency on Resend for production delivery.
* Requires production domain verification in Resend dashboard before sending from custom domain addresses.

## Follow-up

* Implement resend email action in workspace team settings so owners can re-trigger invitations.
* Add webhook receiver for Resend delivery events (bounces, complaints, delivery confirmations) if detailed delivery tracking is required.
