# Scope: Streamline

Streamline is an AI workflow automation SaaS. This scope covers owner signup, login, and step by step onboarding persistence to a database so the final step renders a verified setup summary.

**Build approach:** Tracer Bullet (prove the whole pipe works end to end with a thin working thread before widening features).
**Workflow:** Beta (check verify on the real app, then test with automated suites). The project default level of rigor. `/architect` is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag (such as `· GA`) to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| #  | Feature                                   | Phase      | Status      |
| -- | ----------------------------------------- | ---------- | ----------- |
| A  | Onboarding client UI and multi step shell | Context    | existing    |
| B  | Account creation form UI                  | Context    | existing    |
| 1  | Data model and database storage           | Foundation | done        |
| 2  | Auth, session and login page              | Foundation | done        |
| 3  | Owner signup and workspace creation       | Slice 1    | done        |
| 4  | Workspace profile persistence             | Slice 1    | done        |
| 2b | Email verification                        | Slice 1b   | in-progress |
| 2c | Password reset                            | Slice 1b   | done        |
| 5  | Automation preferences persistence        | Slice 2    | done        |
| 6  | Selected tools persistence                | Slice 2    | done        |
| 7  | Team invitations persistence              | Slice 3    | done        |
| 8  | Setup summary and onboarding completion   | Slice 3    | done        |
| 9  | Onboarding resume and route protection    | Slice 4    | done        |
| 10 | Invite acceptance and teammate join flow  | Slice 5    | done        |
| 11 | Transactional invite emails               | Slice 6    | done        |

## Brownfield enrollment

### A. Onboarding client UI and multi step shell · existing

Visual components, step layouts, and animated client transitions for all six onboarding steps. code in `src/components/` and `src/context/`

### B. Account creation form UI · existing

Landing screen split layout with branding sidebar and registration input form. code in `src/app/page.tsx` and `src/components/form/`

## Foundations

### 1. Data model and database storage · done

Database schema and storage layer covering users, sessions, workspaces, onboarding step answers, and team member invitations.
**Done when:** database schema and migrations run cleanly, providing typed data access for user accounts, workspace entities, onboarding choices, and member invitations.

- [X] Design it (spec): `/architect data model & database storage`
- [X] Build it: `/develop data model & database storage`
  - [X] Install Prisma, configure postinstall hook, and setup environment connection strings (AC-1, AC-5)
  - [X] Declare seven core models, cascades, and Role enum in schema.prisma (AC-3, AC-4, AC-7)
  - [X] Implement singleton database client in src/lib/db/index.ts with development caching (AC-2)
  - [X] Run initial migration via prisma migrate dev and verify database operations (AC-6, AC-7)
- [X] Verify it: `/check verify data model & database storage`
- [X] Test it: `/test data model & database storage`
  Spec [0002](../specs/0002-data-model-and-database-storage/index.md) · code in `src/lib/db/` and `prisma/`

### 2. Auth, session and login page · done · GA

Core authentication system for owner registration and login, password hashing, session tokens or cookies, dedicated login interface, and basic session gating of onboarding routes.
**Done when:** an owner can register, log in with email and password, receive a secure session cookie, log out, view a dedicated login page, and unauthenticated traffic is blocked from onboarding routes.

- [X] Design it (spec): `/architect auth, session & login page`
- [X] Build it: `/develop auth, session & login page`
  - [X] Configure Better Auth client, server, and organization plugin (AC-1, AC-6)
  - [X] Apply database schema for core auth, organizations, roles, and hashed invites (AC-1, AC-7)
  - [X] Mount Better Auth catch all route handler at /api/auth/[...all] (AC-1, AC-6)
  - [X] Build login page and form with input validation and rate limit feedback (AC-3, AC-4, AC-5)
  - [X] Implement middleware session gating for onboarding routes and login redirection (AC-2, AC-8)
- [X] Verify it: `/check verify auth, session & login page`
- [X] Test it: `/test auth, session & login page`
- [X] Review it (fresh model): `/check review auth, session & login page`
- [X] Document it: `/document auth, session & login page`
  Spec [0001](../specs/0001-auth-session-and-login/index.md) · code in `src/lib/auth/`, `src/app/login/`, `src/app/api/auth/`, `src/middleware.ts`

## Slice 1: Walking skeleton (Signup to Workspace Profile)

### 3. Owner signup and workspace creation · done

Connect the registration form to auth and data persistence, creating the owner account and their initial workspace, establishing the authenticated session so the owner passes session gating into onboarding, and prefilling the owner name for onboarding.
**Done when:** submitting valid registration details creates an owner user and a primary workspace in the database, establishes the active session, passes the owner full name to prefill first and last name on the about step, and advances to welcome.

- [X] Build it: `/develop owner signup & workspace creation`
  - [X] Implement signup Server Action with Zod validation, user registration, and workspace initialization
  - [X] Wire AccountCreationForm to Server Action with inline error and loading states
  - [X] Prefill owner first and last name in AboutStepContent from authenticated session
- [X] Verify it: `/check verify owner signup & workspace creation`
- [X] Test it: `/test owner signup & workspace creation`
  verify [verify.md](../specs/0003-owner-signup-and-workspace-creation/verify.md) · code in `src/actions/auth.ts`, `src/components/form/AccountCreationForm.tsx`, `src/components/about/AboutStepContent.tsx`

### 4. Workspace profile persistence · done

Persist user role and workspace metadata from step two (company name, team size) into the database, with first and last name prefilled from the signup full name.
**Done when:** the about step loads with first and last name prefilled from the owner registration name, and submitting the form updates the user name, role, and workspace company name and team size in the database, advancing to step three.

- [X] Build it: `/develop workspace profile persistence`
  - [X] Implement workspace profile Server Action with Zod validation and transactional database persistence
  - [X] Wire AboutStepContent form submission to Server Action with error and loading states
  - [X] Support preloading existing profile data and advance onboardingStep to automation
- [X] Verify it: `/check verify workspace profile persistence`
- [X] Test it: 12 unit and integration tests passing in profile.test.ts (separate /test run skipped)
  verify [verify.md](../specs/0004-workspace-profile-persistence/verify.md) · code in `src/actions/workspace.ts`, `src/lib/workspace/schemas.ts`, `src/components/about/AboutStepContent.tsx`

## Slice 1b: Auth verification and recovery

### 2b. Email verification · in-progress · GA

Verify owner email addresses through secure one time tokens or links without blocking initial onboarding progression.
**Done when:** an owner receives an email verification prompt and token, and confirming their address updates their verification status in the database.

- [X] Design it (spec): `/architect email verification`
- [X] Build it: `/develop email verification`
  - [X] Add emailVerifiedAt and consumedAt schema fields and apply migration (AC-3)
  - [X] Create branded VerifyEmail React Email template and Better Auth email hooks (AC-1, AC-2, AC-6)
  - [X] Implement resendVerificationEmailAction with rate limiting and cooldown (AC-4)
  - [X] Build public /verify-email status route with cross device verification (AC-3, AC-5)
  - [X] Build non blocking EmailVerificationBanner for onboarding layout (AC-4)
- [X] Verify it: `/check verify email verification`
- [X] Test it: `/test email verification`
- [X] Review it (fresh model): `/check review email verification`
- [X] Document it: `/document email verification`
  verify [verify.md](../specs/0012-email-verification/verify.md) · Spec [0012](../specs/0012-email-verification/index.md) · code in `src/actions/auth.ts`, `src/actions/team-invitation.ts`, `src/lib/auth/`, `src/lib/email/`, `src/components/emails/`, `src/components/onboarding/`, `src/app/verify-email/`

### 2c. Password reset · done · GA

Secure credential recovery flow allowing owners to request a password reset link and establish new credentials.
**Done when:** an owner can request a reset email, validate a time limited reset token, and submit a new password that updates the database and invalidates old sessions.

- [X] Design it (spec): `/architect password reset`
- [X] Build it: `/develop password reset`
  - [X] Create branded ResetPasswordEmail React Email template and Better Auth email hooks (AC-1, AC-3, AC-6)
  - [X] Implement requestPasswordResetAction with generic response and 60 second cooldown (AC-1, AC-2)
  - [X] Build public /forgot-password page matching Streamline split screen branding (AC-1, AC-2)
  - [X] Implement resetPasswordAction with password complexity rules, session revocation, and consumedAt marking (AC-4, AC-5)
  - [X] Build public /reset-password page with token validation and login feedback banner (AC-4, AC-5)
- [X] Verify it: `/check verify password reset`
- [X] Test it: `/test password reset`
- [X] Review it (fresh model): `/check review password reset`
- [X] Document it: `/document password reset`
  verify [verify.md](../specs/0013-password-reset/verify.md) · Spec [0013](../specs/0013-password-reset/index.md) · code in `src/actions/auth.ts`, `src/lib/auth/`, `src/components/emails/`, `src/app/forgot-password/`, `src/app/reset-password/`

## Slice 2: Automation and Selected Tools

### 5. Automation preferences persistence · done

Persist selected automation areas from step three into the workspace onboarding record.
**Done when:** selecting automation areas and clicking continue saves the choices to the workspace in the database and advances to step four.

- [X] Build it: `/develop automation preferences persistence`
  - [X] Implement automation preferences Server Action with Zod validation and workspace database persistence
  - [X] Wire AutomationStepContent selection and form submission to Server Action with error and loading states
  - [X] Support preloading existing automation preferences and advance onboardingStep to tools
- [X] Verify it: `/check verify automation preferences persistence`
- [X] Test it: 11 unit and integration tests passing in automation.test.ts (separate /test run skipped)
  verify [verify.md](../specs/0005-automation-preferences-persistence/verify.md) · code in `src/actions/automation.ts`, `src/lib/automation/schemas.ts`, `src/components/automation/AutomationStepContent.tsx`

### 6. Selected tools persistence · done

Persist the owner's chosen integrations from the tools step without establishing live provider OAuth connections.
**Done when:** selecting tools from the catalog and proceeding saves the selected tool identifiers to the database record and advances to step five.

- [X] Build it: `/develop selected tools persistence`
  - [X] Implement selected tools Server Action with Zod validation and workspace database persistence
  - [X] Wire ToolsStepContent and ToolConnectionCard to Server Action with error and loading states
  - [X] Support preloading existing selected tools and advance onboardingStep to team-invitation
- [X] Verify it: `/check verify selected tools persistence`
- [X] Test it: 12 unit and integration tests passing in tools.test.ts (separate /test run skipped)
  verify [verify.md](../specs/0006-selected-tools-persistence/verify.md) · code in `src/actions/tools.ts`, `src/lib/tools/schemas.ts`, `src/components/tools/ToolsStepContent.tsx`

## Slice 3: Team Invitations and Launch Summary

### 7. Team invitations persistence · done · GA

Capture invited team members (email, role), store them as pending invitations, and generate secure invite links.
**Done when:** adding teammate emails saves pending invitations associated with the workspace, issues secure invite tokens, and exposes shareable invite links.

- [X] Design it (spec): `/architect team invitations persistence`
- [X] Build it: `/develop team invitations persistence`
  - [X] Update Prisma schema to add viewer role and organization inviteCode, running migration (AC-3, AC-7)
  - [X] Create Zod validation schemas and types for team invitations input (AC-2, AC-5, AC-6)
  - [X] Implement Server Action getTeamInvitationsAction with collision check and retry inviteCode generation (AC-1, AC-7, AC-8)
  - [X] Implement Server Action createTeamInvitationsAction with SHA 256 hashed tokens and skip support (AC-2, AC-3, AC-4, AC-5, AC-6, AC-8)
  - [X] Connect TeamInvitationStepContent and ShareLinkCard to Server Actions with states (AC-1, AC-4, AC-7)
- [X] Verify it: `/check verify team invitations persistence`
- [X] Test it: `/test team invitations persistence`
- [X] Review it (fresh model): `/check review team invitations persistence`
- [X] Document it: `/document team invitations persistence`
  verify [verify.md](../specs/0007-team-invitations-persistence/verify.md) · Spec [0007](../specs/0007-team-invitations-persistence/index.md) · code in `src/actions/team-invitation.ts`, `src/lib/team-invitation/schemas.ts`, `src/components/team-invitation/TeamInvitationStepContent.tsx`

### 8. Setup summary and onboarding completion · done

Retrieve real workspace and owner records from the database on step six, populating the setup summary card and marking onboarding complete.
**Done when:** the launch page displays accurate company details, user role, selected automations, selected tools, and invited teammates from the database, and clicking launch marks onboarding complete.

- [X] Build it: `/develop setup summary & onboarding completion`
  - [X] Create launch summary schemas, helper formatters, and types in `src/lib/launch/schemas.ts`
  - [X] Implement Server Actions `getLaunchSummaryAction` and `completeOnboardingAction` in `src/actions/launch.ts`
  - [X] Handle nullable `inviteCode` and derive `shareableInviteLink` with `x-forwarded-host` fallback
  - [X] Wire `SetupSummaryCard` and `LaunchStepContent` with real database values, copy feedback, and button states
  - [X] Add comprehensive test coverage in `tests/workspace/launch.test.ts` (13 tests passing)
  code in `src/actions/launch.ts`, `src/lib/launch/schemas.ts`, `src/components/launch/LaunchStepContent.tsx`
- [X] Verify it: `/check verify setup summary & onboarding completion`
- [X] Test it: 13 unit and integration tests passing in `launch.test.ts` (separate `/test` run skipped)

## Slice 4: Onboarding Resume and Routing

### 9. Onboarding resume and route protection · done · GA

Session verification and routing rules that automatically redirect an owner to their latest incomplete onboarding step, and prevent completed owners from repeating onboarding.
**Done when:** logging in with an incomplete onboarding state routes directly to the latest uncompleted step with saved data preloaded, and completed owners cannot reenter onboarding.

- [X] Design it (spec): `/architect onboarding resume & route protection`
- [X] Build it: `/develop onboarding resume & route protection`
  - [X] Create route mapping, step order configuration, high watermark resolution, and the single shared getOnboardingResumeState helper in `src/lib/onboarding/routing.ts` (AC-1, AC-2, AC-4, AC-5, AC-6)
  - [X] Update `src/middleware.ts` to forward `x-pathname` header and guard onboarding routes against unauthenticated requests (AC-1, AC-7)
  - [X] Wire shared getOnboardingResumeState into `src/app/page.tsx` and `src/app/login/page.tsx` for single hop resume (AC-1, AC-3)
  - [X] Implement Server Component layout authorization guard in `src/app/(onboarding)/layout.tsx` using getOnboardingResumeState (AC-1, AC-2, AC-3, AC-4, AC-8)
  - [X] Update step mutation actions to apply high watermark step progression so revising previous steps preserves progress (AC-5)
  - [X] Add comprehensive integration and end to end tests in `tests/workspace/onboarding-routing.test.ts` (AC-1 through AC-8)
- [X] Verify it: `/check verify onboarding resume & route protection`
- [X] Test it: `/test onboarding resume & route protection`
- [X] Review it (fresh model): `/check review onboarding resume & route protection`
- [X] Document it: `/document onboarding resume & route protection`
  verify [verify.md](../specs/0009-onboarding-resume-and-route-protection/verify.md) · Spec [0009](../specs/0009-onboarding-resume-and-route-protection/index.md) · code in `src/middleware.ts`, `src/app/(onboarding)/layout.tsx`, `src/lib/onboarding/routing.ts`

## Slice 5: Invite Acceptance

### 10. Invite acceptance and teammate join flow · done

Public, unauthenticated routes allowing an invited teammate to join an existing workspace via a named email invite token or the organization's shareable invite code, without going through owner onboarding. Incorporates the accept invite flow and invited member onboarding bypass previously deferred.
**Done when:** a person visiting a valid, unexpired invite link can create an account, is attached to the existing organization as a Member with the invitation's role, the invitation is marked accepted, and they land somewhere sensible without being routed through the 6-step owner onboarding flow.

- [X] Design it (spec): `/architect invite acceptance & teammate join flow`
- [X] Build it: `/develop invite acceptance & teammate join flow`
  - [X] Implement non owner onboarding bypass in getOnboardingResumeState (AC-8)
  - [X] Update shareable invite link generation to emit /join/${inviteCode} (AC-6)
  - [X] Implement token and code validation schemas and Server Actions with existing user checks (AC-1, AC-2, AC-6, AC-7, AC-9)
  - [X] Build public token invite route /invite/[token] with registration and one click accept (AC-1, AC-2, AC-3, AC-4, AC-5, AC-9)
  - [X] Build public organization join route /join/[code] with registration and viewer role join (AC-6, AC-7, AC-9)
  - [X] Adapt launch screen with teammate welcome banner and test suite (AC-1 through AC-9)
- [X] Verify it: `/check verify invite acceptance & teammate join flow`
- [X] Test it: `/test invite acceptance & teammate join flow`
- [X] Review it: `/check review invite acceptance & teammate join flow`
  verify [verify.md](../specs/0010-invite-acceptance-and-teammate-join-flow/verify.md) · Spec [0010](../specs/0010-invite-acceptance-and-teammate-join-flow/index.md) · code in `src/app/invite/`, `src/app/join/`, `src/actions/team-invitation.ts`


## Slice 6: Transactional Emails

### 11. Transactional invite emails · done

Send real emails to invited teammates when an invitation is created, using a transactional email provider, replacing the current manual copy paste link sharing. Builds on top of Feature 7 (invitation creation and token generation) and Feature 10 (accept side routes /invite/:token and /join/:code), which are its dependencies.
**Done when:** creating a team invitation via Feature 7's createTeamInvitationsAction triggers an email to the invited address containing their working invite link, using Resend and React Email.

- [X] Design it (spec): `/architect transactional invite emails`
- [X] Build it: `/develop transactional invite emails`
  - [X] Add emailSentAt to Invitation schema and apply database migration (AC-3)
  - [X] Install Resend and React Email with mock logger environment fallback (AC-4)
  - [X] Create branded TeamInviteEmail component using @react-email/components (AC-1, AC-2)
  - [X] Implement email sending utility with error isolation and wire into createTeamInvitationsAction (AC-1, AC-2, AC-3, AC-5, AC-6)
- [X] Verify it: `/check verify transactional invite emails`
- [X] Test it: 7 unit and integration tests passing in transactional-email.test.ts (separate /test run skipped)
  verify [verify.md](../specs/0011-transactional-invite-emails/verify.md) · Spec [0011](../specs/0011-transactional-invite-emails/index.md) · code in `src/actions/team-invitation.ts`, `src/components/emails/`, `src/lib/email/`

## Deferred

Out of scope for the current build pass, kept so the plan stays honest.

- **Main application dashboard**: post onboarding workspace dashboard and navigation · needs a decision
- **Workflow execution engine**: creating, configuring, and executing AI automation workflows · needs a decision
- **Subscription billing and plans**: paid tiers, checkout, and usage quotas · needs a decision · GA
- **Social authentication**: Google and GitHub login integrations · needs a decision
- **Real OAuth integration connections**: connecting live third party accounts and API token management · needs a decision

## Legend

**The decision box.** Every feature carries exactly one, the sub task whose label ends with `(spec)`. Its wording varies (`Design it (spec)` normally), so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State                           | Set by                                                                                         | The feature shows                                                                                                                                                                                                                                               |
| ------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `planned` · needs a decision | `/scope`                                                                                     | one box:`Design it (spec): /architect <feature>`                                                                                                                                                                                                              |
| `in-progress` (designed)      | **`/architect` at spec capture**                                                       | `Design it` ticked; spec linked; `Build it: /develop <feature>` + **2 to 5 milestones**; the tier's closing boxes (`Verify it` Alpha+, `Test it` Beta+, `Review it` + `Document it` GA); any surfaced follow up enrolled                      |
| `in-progress` (building)      | `/develop`                                                                                   | milestone sub boxes tick one by one; code pointer filled                                                                                                                                                                                                        |
| `in-progress` (verified)      | `/check verify`                                                                              | `Build it` + milestones ticked; `Verify it` ticked                                                                                                                                                                                                          |
| `done`                        | **you, when you decide it is** (any skill sets it when you say so); `/sync` reconciles | boxes you ran ticked, skipped ones marked skipped; the tier's last stage (`Prototype` → after `/develop`; `Alpha` → after `/check verify`; `Beta`/`GA` → after `/test`) is the suggested point to call it done; `/sync` captures conventions |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first; otherwise straight to `/develop` (or `/audit` for standards and tooling). The tag drops once the spec is captured.
- **Atomic build tasks live in the spec's `## Build plan`, not here**: the scope carries only the milestone rollup.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (pre workflow) and `dropped` (de scoped, kept for history).
- **Approach tag** beside a heading (such as `· Facade`) overrides the project default for that feature; no tag = inherits it.
- **Workflow tier tag** beside a heading (such as `· GA`, `· Prototype`) sets that one feature's rigor above or below the project default; no tag inherits the default. It decides the feature's check boxes and each skill's next suggestion.
- **Workflow** (header line) is the project default, what runs after `/develop`: **Prototype** = nothing (trust develop's own build time self check); **Alpha** = `/check verify`; **Beta** = `/check verify` then `/test`; **GA** = adds a fresh model `/check review` then `/document`. A feature built on an unratified decision (an `Assumed` spec) stays flagged, but that never blocks `done`.
- **Pointer line** (`spec <n> · code in <path>`): the spec link added by `/architect`, the code path by `/develop`.
