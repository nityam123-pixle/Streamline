# 0009. Onboarding Resume and Route Protection

**Date**: 2026-09-26
**Status**: Accepted

## Summary

This specification establishes session verification and route protection rules for the Streamline onboarding journey. When an authenticated workspace owner logs in or visits the application root, Streamline looks up their organization onboarding progress in the database and resumes them immediately at their latest incomplete step. Owners cannot jump forward past their unlocked progress by editing the browser URL, but they can freely navigate backward to review or update earlier steps. Completed owners are prevented from re-entering onboarding routes and are directed to the launch confirmation screen until the main dashboard is built.

## Requirements

**User stories**:
- As an authenticated workspace owner returning to Streamline after closing my browser or logging out, I want the application to resume me directly at my latest incomplete onboarding step so that I never have to manually click through screens I already finished.
- As an authenticated workspace owner who previously entered information, I want my saved setup data preloaded on my active step so that I can pick up right where I left off without retyping.
- As an authenticated workspace owner, I want the ability to navigate back to earlier steps to review or revise my details without losing my furthest unlocked progress.
- As a workspace owner who completed setup, I want the application to prevent me from accidentally re-entering the onboarding sequence so that my completed organization state remains protected.

**Acceptance criteria**:
- **AC-1**: An authenticated owner logging in or visiting the root path `/` or `/login` with an incomplete onboarding state is automatically redirected to the route matching their active `organization.onboardingStep` (`/welcome`, `/about`, `/automation`, `/tools`, `/team-invitation`, or `/launch`), with their saved data preloaded by that step component.
- **AC-2**: An authenticated owner with an incomplete onboarding state who attempts to manually navigate forward to an onboarding route beyond their latest unlocked step is immediately redirected back to their current unlocked step route.
- **AC-3**: An authenticated owner whose organization has `onboardingStep === "completed"` is denied access to onboarding steps (`/welcome`, `/about`, `/automation`, `/tools`, `/team-invitation`), and is automatically redirected to `/launch` where the completed confirmation state displays.
- **AC-4**: An authenticated owner with an incomplete onboarding state can freely navigate backward to inspect or revise earlier steps (`stepIndex <= currentStepIndex`) without being blocked by route protection.
- **AC-5**: Submitting an update on an earlier onboarding step preserves the furthest unlocked step progress using high watermark logic, so an owner who updates company details on `/about` while already on `/tools` does not lose their unlocked access to `/automation` or `/tools`.
- **AC-6**: When `organization.onboardingStep` is null, empty, or unrecognized in the database, the system safely falls back to `"welcome"` so users can proceed cleanly from the beginning without runtime errors.
- **AC-7**: Unauthenticated visitors attempting to access any onboarding route continue to be redirected to `/login` with a `callbackUrl` parameter pointing to the requested route.
- **AC-8**: Authenticated sessions with no valid organization membership are redirected to `/login` to clear invalid session state.

## Decision

**Chosen option**: Option 1: Hybrid route guard with middleware path forwarding and Server Component layout authorization

We enforce onboarding resume and route protection using a hybrid architecture. Edge middleware handles unauthenticated visitors and forwards the requested URL path in an `x-pathname` request header. The Server Component layout in `src/app/(onboarding)/layout.tsx` inspects the active user session and queries Neon PostgreSQL authoritatively through Prisma. It evaluates the current path against `organization.onboardingStep` using high watermark step logic, calling Next.js `redirect()` on mismatched or unauthorized requests before rendering occurs.

**Implementation skills**: `better-auth-best-practices` (`better-auth/skills`, `.agents/skills/better-auth-best-practices/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Rationale

Reasoning and options: see rationale.md

## Feature design

**Data model sketch**:

Table: `organization` (reused, no schema migration required)
- `id`: String (Primary Key, cuid)
- `name`: String
- `slug`: String (Unique)
- `inviteCode`: String? (Unique)
- `onboardingStep`: String (Default: `"welcome"`, valid states: `"welcome"`, `"about"`, `"automation"`, `"tools"`, `"team-invitation"`, `"launch"`, `"completed"`)
- `teamSize`: String?
- `automationAreas`: Json?
- `selectedTools`: Json?
- `createdAt`: DateTime
- `updatedAt`: DateTime

Related tables:
- `user`: Authenticated user profile
- `session`: Active Better Auth session token
- `member`: User organization association (Role: `owner`, `admin`, `editor`, `viewer`)

**State transitions**:

Step index sequence defined in application configuration:
1. `welcome` (route: `/welcome`)
2. `about` (route: `/about`)
3. `automation` (route: `/automation`)
4. `tools` (route: `/tools`)
5. `team-invitation` (route: `/team-invitation`)
6. `launch` (route: `/launch`)
7. `completed` (terminal state, routes away to `/launch` confirmation view)

Transition rules:
- Starting state upon owner account creation is `welcome`.
- Advancing through steps updates `onboardingStep` to the subsequent step ID.
- High watermark rule: When updating an earlier step (for example, saving `/about` at step index 2 while the database currently records `tools` at step index 4), the database update retains `Math.max(currentStepIndex, newStepIndex)` so that unlocked step access is never regressed.
- Completing setup on `/launch` transitions `onboardingStep` to `"completed"`.

**API surface**:

| Surface | Layer | Key inputs | Key outputs | Auth requirement | Key errors |
|---|---|---|---|---|---|
| `middleware` | Next.js Edge Middleware (`src/middleware.ts`) | Request URL, session cookie | Passes through with `x-pathname` header, or redirects unauthenticated visitors to `/login` | Public or Session Cookie | None |
| `getOnboardingResumeState` | Single Shared Server Helper (`src/lib/onboarding/routing.ts`) | `userId: string` | `{ step: string, targetPath: string, isCompleted: boolean }` | Internal server caller | Returns null or safe welcome fallback |
| `RootPage` | Server Component (`src/app/page.tsx`) | Session cookie | Renders signup form or calls `getOnboardingResumeState` to issue single hop `redirect(targetPath)` | Public or Authenticated Session | None |
| `LoginPage` | Server Component (`src/app/login/page.tsx`) | Session cookie | Renders login form or calls `getOnboardingResumeState` to issue single hop `redirect(targetPath)` | Public or Authenticated Session | None |
| `OnboardingLayout` | Server Component Layout (`src/app/(onboarding)/layout.tsx`) | `headers()` (`x-pathname`, cookie) | Calls `getOnboardingResumeState` to enforce step boundaries, rendering children or calling `redirect()` | Authenticated owner session | Redirect to `/login` if unauthenticated or no member record |

**Value sourcing**:

| Action | Value produced or evaluated | Source |
|---|---|---|
| Middleware routing check | Current request pathname | NextRequest `nextUrl.pathname` |
| Middleware authentication check | Session existence flag | Cookie `better-auth.session_token` or `__Secure-better-auth.session_token` |
| Server resume resolution | User ID | Better Auth session from `auth.api.getSession` |
| Server resume resolution | Active organization onboarding step | Prisma query on `Member` joined with `Organization` |
| Server resume resolution | Canonical destination path | Step registry mapping in `src/lib/onboarding/routing.ts` |
| Layout route guard | Current request pathname | Request header `x-pathname` (injected by middleware) |
| Step progression updates | Target onboarding step string | Application code logic using high watermark comparison against database `onboardingStep` |

**Key invariants**:
- Single source of truth: Step order and route paths are declared strictly in code (`src/config/onboardingSteps.tsx` and `src/lib/onboarding/routing.ts`).
- Single shared helper: `getOnboardingResumeState` is the sole implementation of step resolution and resume state, shared identically across `src/app/page.tsx`, `src/app/login/page.tsx`, and `src/app/(onboarding)/layout.tsx`.
- Single hop navigation: Authenticated visits to `/` and `/login` resolve the database step immediately in their respective Server Components and redirect directly to the active step in one hop.
- Authoritative evaluation: All route authorization and redirect decisions query PostgreSQL directly on the server, avoiding out of sync client or cookie state.
- Completed workspace protection: Once `onboardingStep === "completed"`, visiting any onboarding route other than `/launch` redirects to `/launch`.
- Strict forward barrier: An incomplete workspace owner cannot visit any route whose step index is greater than their current database step index.
- Backward navigation freedom: An incomplete workspace owner can view any route whose step index is less than or equal to their current database step index.
- Safe fallback: Unrecognized or null step values in the database resolve to `"welcome"`.

**Security model**:
- Identity is derived strictly on the server from the verified Better Auth session token, never from client parameters or headers.
- Route access is scoped to the authenticated user active organization membership.
- Step parameters cannot be spoofed by URL query string tampering because route authorization checks match against database state.

**Configuration required**:
- Zero new environment variables or secret keys required.

**Critical test scenarios**:
- Happy path resume from root: An authenticated owner with `onboardingStep === "tools"` visiting `/` redirects directly to `/tools` in one hop, verifies **AC-1**.
- Happy path resume from login: An authenticated owner with `onboardingStep === "tools"` visiting `/login` redirects directly to `/tools` in one hop, verifies **AC-1**.
- Forward skipping blocked: An authenticated owner with `onboardingStep === "about"` navigating to `/tools` or `/launch` is redirected back to `/about`, verifies **AC-2**.
- Completed protection: An authenticated owner with `onboardingStep === "completed"` navigating to `/about` or `/automation` is redirected to `/launch`, verifies **AC-3**.
- Backward navigation allowed: An authenticated owner with `onboardingStep === "tools"` visiting `/about` is allowed to view and interact with the page, verifies **AC-4**.
- High watermark update: An authenticated owner on step 4 updating their company name on step 2 preserves `onboardingStep: "tools"` in the database, verifies **AC-5**.
- Safe fallback: An authenticated owner with an empty or corrupt `onboardingStep` string is safely routed to `/welcome`, verifies **AC-6**.
- Unauthenticated access: An unauthenticated user visiting `/automation` is redirected to `/login?callbackUrl=/automation`, verifies **AC-7**.
- Missing membership: An authenticated user without an organization record is redirected to `/login`, verifies **AC-8**.

## Build plan

1. Create onboarding route definitions, step order mapping, high watermark resolution, and the single shared `getOnboardingResumeState` helper in `src/lib/onboarding/routing.ts` with unit test coverage, satisfies **AC-1**, **AC-2**, **AC-4**, **AC-5**, **AC-6**.
2. Update `src/middleware.ts` to forward `x-pathname` header and guard onboarding routes against unauthenticated requests, removing the redundant redirect from `/` and `/login` to `/welcome`, satisfies **AC-1**, **AC-7**.
3. Wire the shared `getOnboardingResumeState` helper into `src/app/page.tsx` and `src/app/login/page.tsx` so authenticated visitors are redirected to their active step in a single hop, satisfies **AC-1**, **AC-3**.
4. Implement Server Component layout authorization guard in `src/app/(onboarding)/layout.tsx` using `getOnboardingResumeState` to enforce step boundaries, backward navigation freedom, and completed state protection, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-8**.
5. Update step mutation actions (`updateWorkspaceProfileAction`, `saveAutomationPreferencesAction`, `saveSelectedToolsAction`, `createTeamInvitationsAction`) to apply high watermark step progression so revising previous steps never regresses unlocked steps, satisfies **AC-5**.
6. Add comprehensive integration and end to end tests in `tests/workspace/onboarding-routing.test.ts` verifying single hop resume, route protections, and edge cases, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-8**.

## Consequences

**Positive**:
- Owners can close their browser or sign out at any point during onboarding and resume exactly where they left off with zero data loss.
- Database integrity is guaranteed because owners cannot bypass prerequisites to access downstream steps.
- Completed workspaces cannot accidentally re-enter onboarding steps or corrupt their finalized organization setup.
- Architecture requires zero database schema migrations and zero new dependencies.

**Negative / tradeoffs**:
- Every onboarding route request incurs a fast server database read in the layout to confirm authorization.
- Backward navigation allows owners to view prior steps, which requires step actions to use high watermark logic so earlier updates do not regress progress.

**Neutral**:
- Until the permanent application dashboard is built in a later slice, completed owners continue to land on the `/launch` completed confirmation screen.

## Follow-up

- [ ] Connect completed owner redirection to the main dashboard route once Slice 6 or the workspace dashboard is created.
- [ ] Incorporate invite acceptance routing (Slice 5) into middleware and layout rules so invited members bypass owner onboarding completely.
