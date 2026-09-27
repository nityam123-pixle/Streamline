# 0001. Auth, session and login page

**Date**: 2026-09-25
**Status**: Accepted

## Summary

This decision defines the core authentication system, session persistence, and dedicated login page for Streamline. We adopt Better Auth with its organization plugin, establishing email and password credentials, thirty day sliding session cookies, and route protection middleware for onboarding paths. A new login page at `/login` mirrors the split screen brand design of signup, providing owners a consistent entry point while safeguarding onboarding routes against unauthenticated access.

## Requirements

**User stories**:
- As a workspace owner, I want to log in with my email and password so that I can securely access my workspace and onboarding flows.
- As a returning owner with an active session, I want my session to persist across visits so that I do not have to sign in repeatedly.
- As an unauthenticated visitor, I want to be redirected to the login page when visiting protected onboarding URLs so that workspace data stays secure.
- As an owner entering incorrect credentials, I want clear and secure error feedback so that I know why authentication failed without exposing account details.

**Acceptance criteria**:
- **AC-1**: Better Auth server and client instances are configured in `src/lib/auth/` supporting email and password authentication with thirty day sliding session cookies.
- **AC-2**: Next.js proxy middleware in `src/middleware.ts` intercepts unauthenticated requests to onboarding routes (`/welcome`, `/about`, `/automation`, `/tools`, `/team-invitation`, `/launch`) and redirects visitors to `/login` with a callback URL parameter.
- **AC-3**: A dedicated login page renders at `/login`, mirroring the signup split screen layout with brand panel on the left and form inputs on the right.
- **AC-4**: Submitting the login form with valid credentials authenticates the user, sets an HTTP only session cookie, and redirects to the requested callback URL or `/welcome`.
- **AC-5**: Submitting invalid credentials shows inline error feedback, and repeated failed attempts (ten per IP per minute) trigger temporary rate limit lockouts.
- **AC-6**: Logging out clears the session cookie and invalidates the session token in the database.
- **AC-7**: The database schema supports core auth tables plus the organization plugin (`organization`, `member`, `invitation`), using `owner`, `admin`, and `editor` as the system roles and storing invitation tokens as cryptographic hashes.
- **AC-8**: Authenticated owners navigating to `/login` or `/` are automatically redirected to their current onboarding step or workspace.

## Decision

**Chosen option**: Option 1: Better Auth with organization plugin

We adopt Better Auth for authentication, session lifecycle, and organization management. It provides end to end type safety, automated rate limiting, secure password hashing, and clean Next.js 16 App Router integration through dedicated modules in `src/lib/auth/`.

**Implementation skills**: `better-auth-best-practices` (`better-auth/skills`, `.agents/skills/better-auth-best-practices/`) · `vercel-react-best-practices` (`vercel-labs/agent-skills`, `.agents/skills/vercel-react-best-practices/`)

## Feature design

**Data model sketch**:

```
user
  id: text (primary key)
  name: text (required, full name as entered at registration)
  first_name: text (nullable, split from full name on first space, editable in profile)
  last_name: text (nullable, remainder of full name, editable in profile)
  email: text (required, unique, indexed)
  email_verified: boolean (default false)
  image: text (nullable)
  created_at: timestamp (default now)
  updated_at: timestamp (default now)

session
  id: text (primary key)
  user_id: text (foreign key -> user.id, on delete cascade)
  token: text (required, unique, indexed)
  expires_at: timestamp (required)
  ip_address: text (nullable)
  user_agent: text (nullable)
  active_organization_id: text (nullable, foreign key -> organization.id)
  created_at: timestamp (default now)
  updated_at: timestamp (default now)

account
  id: text (primary key)
  user_id: text (foreign key -> user.id, on delete cascade)
  account_id: text (required)
  provider_id: text (required, e.g. "credential")
  password: text (nullable, hashed password)
  created_at: timestamp (default now)
  updated_at: timestamp (default now)

verification
  id: text (primary key)
  identifier: text (required, indexed)
  value: text (required)
  expires_at: timestamp (required)
  created_at: timestamp (default now)
  updated_at: timestamp (default now)

organization (mapped to Workspace)
  id: text (primary key)
  name: text (required, e.g. company name)
  slug: text (required, unique, indexed)
  logo: text (nullable)
  onboarding_step: text (default "welcome", tracks latest onboarding route or "completed")
  team_size: text (nullable, from about step)
  automation_areas: jsonb (nullable, list of selected area identifiers)
  selected_tools: jsonb (nullable, list of chosen tool keys)
  created_at: timestamp (default now)
  updated_at: timestamp (default now)

member
  id: text (primary key)
  organization_id: text (foreign key -> organization.id, on delete cascade)
  user_id: text (foreign key -> user.id, on delete cascade)
  role: text (required, enum: "owner", "admin", "editor")
  job_title: text (nullable, professional title from about step e.g. "Founder / CEO", distinct from authorization role)
  created_at: timestamp (default now)
  updated_at: timestamp (default now)

invitation
  id: text (primary key)
  organization_id: text (foreign key -> organization.id, on delete cascade)
  email: text (required)
  role: text (required, enum: "owner", "admin", "editor", default "editor")
  status: text (required, default "pending")
  token: text (required, unique, indexed, cryptographic hash of raw token)
  expires_at: timestamp (required)
  inviter_id: text (foreign key -> user.id, on delete cascade)
  created_at: timestamp (default now)
  updated_at: timestamp (default now)
```

**State transitions**:

User Session:
`Unauthenticated` -> (valid credentials via `/login`) -> `Active Session` -> (sliding window refresh on activity) -> `Active Session` -> (logout or thirty days idle) -> `Expired / Invalidated`

Organization Onboarding Progress:
`welcome` (step 1) -> `about` (step 2) -> `automation` (step 3) -> `tools` (step 4) -> `team-invitation` (step 5) -> `launch` (step 6) -> `completed`

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/auth/sign-in/email` | POST | `email:string (req)`, `password:string (req)`, `callbackURL:string (opt)` | `user:object`, `session:object` | public | 400 invalid input, 401 invalid credentials, 429 rate limited |
| `/api/auth/sign-up/email` | POST | `name:string (req)`, `email:string (req)`, `password:string (req)` | `user:object`, `session:object` | public | 400 invalid input, 409 email already in use |
| `/api/auth/sign-out` | POST | none | `success:boolean` | authenticated | 401 unauthorized |
| `/api/auth/get-session` | GET | none | `session:object`, `user:object` | session cookie | 200 null when unauthenticated |
| `/login` | GET | `callbackUrl:string (query, opt)` | HTML page render | public | 302 redirect if session already active |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Render `/login` | Brand assets and form fields | Shared layout from `BrandSection` and input components in `src/components/form/` |
| Process Sign In | Active session cookie (`better-auth.session_token`) | Generated securely by Better Auth upon verifying hashed password against `account.password` |
| Establish Member Role | User authorization level | `member.role` column (`owner`, `admin`, or `editor`) |
| Capture Job Title | Professional role display | `member.job_title` column populated from About step role selector |
| Split Name for Onboarding | Prefilled first and last name | `user.first_name` and `user.last_name` split on first space from signup `user.name` |
| Protect Onboarding Routes | Redirection to `/login` | Evaluated in `src/middleware.ts` by inspecting request session cookies |
| Validate Return URL | Safe redirect destination | Verified in login form as a relative path beginning with single `/` to prevent open redirects |
| Create Team Invitation | Secure invitation link | Generated raw random token hashed with SHA 256 before saving to `invitation.token` |

**Key invariants**:
- User email is unique across the entire system.
- An owner cannot hold more than one active membership record in the same organization.
- Member role and invitation role must strictly be one of `owner`, `admin`, or `editor`.
- Invitation tokens must never be written to the database in plain text.
- Protected onboarding routes must reject requests lacking a valid, unexpired session token.
- Passwords must be at least eight characters in length.
- Any `callbackUrl` redirect parameter must be a relative path starting with `/` (excluding `//`), rejecting external origins.
- Next.js middleware inspects both `better-auth.session_token` and `__Secure-better-auth.session_token` to support local development and production HTTPS.
- The middleware matcher explicitly excludes `_next/static`, `_next/image`, `favicon.ico`, and public assets from execution.

**Security model**:
- Session tokens are stored in `httpOnly`, `sameSite: "lax"`, and `secure` (in production) cookies to mitigate cross site scripting and request forgery.
- Failed authentication attempts are rate limited by Better Auth at ten requests per IP per minute.
- Password hashes use modern one way cryptographic algorithms managed by Better Auth.
- Authorization derives strictly from the verified server session, never trusting client headers or form inputs.
- Callback redirect URLs are sanitized against open redirect vulnerabilities.

**Configuration required**:
- `BETTER_AUTH_SECRET`: Thirty two character random string used for cryptographic signing of cookies and tokens.
- `BETTER_AUTH_URL`: Canonical base URL of the application (e.g. `http://localhost:3000` in development).

**Critical test scenarios**:
- Happy path: An owner submits valid email and password on `/login`, receives session cookie, and is redirected to `/welcome` or the validated callback URL, verifies **AC-1**, **AC-3**, **AC-4**.
- Failure case: Submitting incorrect password returns error message and retains email in input; submitting ten incorrect attempts triggers 429 rate limit lockout, verifies **AC-5**.
- Auth / permission: An unauthenticated browser requests `/welcome`, and middleware redirects to `/login?callbackUrl=%2Fwelcome`, verifies **AC-2**.
- Open redirect defense: Attempting to supply an external `callbackUrl=https://malicious.com` is sanitized to default `/welcome`, verifies **AC-4**.
- Session invalidation: Calling sign out destroys session cookie and removes session row from database, blocking subsequent visits to onboarding, verifies **AC-6**.
- Role validation: Creating members or invitations rejects roles outside `owner`, `admin`, `editor`, and stores invitation token as a hash, verifies **AC-7**.
- Authenticated redirection: An authenticated user visiting `/login` is automatically redirected to their current onboarding step without re prompt, verifies **AC-8**.

## Build plan

Following the Tracer Bullet build approach, tasks are ordered to establish a thin, functional authentication thread through database, API, and UI before expanding features:

1. Install Better Auth dependencies and configure client and server instances in `src/lib/auth/index.ts` with email, password, and organization plugins, satisfies **AC-1**, **AC-6**.
2. Define auth schema migrations (`user`, `session`, `account`, `verification`, `organization`, `member`, `invitation`) enforcing `owner`, `admin`, `editor` role enums and hashed invite tokens, satisfies **AC-1**, **AC-7**.
3. Create the catch all route handler at `src/app/api/auth/[...all]/route.ts` linking Better Auth server handler, satisfies **AC-1**, **AC-6**.
4. Build the login page at `src/app/login/page.tsx` and login form component in `src/components/form/LoginForm.tsx` mirroring signup brand styling, sanitizing callback URLs, and invoking Better Auth client sign in, satisfies **AC-3**, **AC-4**, **AC-5**.
5. Configure Next.js middleware at `src/middleware.ts` with static asset exclusion matchers and dual cookie name detection (`better-auth.session_token` and `__Secure-better-auth.session_token`), redirecting unauthenticated visitors to `/login`, satisfies **AC-2**.
6. Implement authenticated redirection logic directing logged in users away from `/login` and `/` toward their active onboarding step, satisfies **AC-8**.

## Consequences

**Positive**:
- Provides robust, standard authentication without hand rolling security critical cryptography or session handling.
- Multi tenant organization and member roles (`owner`, `admin`, `editor`) are established early, preventing schema rework in later slices.
- Onboarding routes are protected from unauthenticated access from day one.
- Consistent visual presentation across signup and login using existing Figma inspired components.

**Negative**:
- Adds Better Auth library dependency and schema tables to database migrations.
- Requires maintenance of environment variables (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`) across deployment environments.

## Follow-up

- Feature 2b will implement email verification flows using the established `verification` table.
- Feature 2c will implement password reset using time limited verification tokens.
- Feature 3 will connect the existing registration form to Better Auth signup and organization creation.
- Feature 7 will generate hashed invitation tokens and expose shareable invite links based on the `invitation` table defined here.
