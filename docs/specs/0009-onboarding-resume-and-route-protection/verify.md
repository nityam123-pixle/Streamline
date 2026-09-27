# Verify: Onboarding Resume and Route Protection · spec 0009 · updated 2026-09-26

_Steps derived from spec 0009 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [x] Log in as an authenticated owner with `onboardingStep === "automation"` -> navigating to `/` or `/welcome` immediately redirects to `/automation` with automation preferences preloaded -> AC-1
- [x] Log in as an authenticated owner with `onboardingStep === "tools"` and manually type `/launch` into the browser URL bar -> page redirects back to `/tools` -> AC-2
- [x] Log in as an authenticated owner with `onboardingStep === "completed"` and attempt to visit `/welcome`, `/about`, `/automation`, `/tools`, or `/team-invitation` -> page redirects to `/launch` where the completed confirmation card renders -> AC-3
- [x] As an owner on step 4 (`/tools`), navigate backward to `/about` -> page renders normally and allows reviewing or updating company details -> AC-4
- [x] Submit an update on `/about` while on step 4 -> organization company details update, but `onboardingStep` remains `"tools"` in PostgreSQL -> AC-5
- [x] Create or update an organization with null or corrupt `onboardingStep` -> navigating to onboarding routes safely falls back to `/welcome` without server crashes -> AC-6
- [x] Log out and visit `/automation` or `/launch` as an unauthenticated visitor -> browser redirects to `/login?callbackUrl=/automation` -> AC-7

## Commands

- [x] `npx vitest run tests/workspace/onboarding-routing.test.ts` -> all unit and integration tests pass cleanly -> AC-1 through AC-8
- [x] `npm run build` -> Next.js production build succeeds with clean type checking and zero export errors -> AC-1 through AC-8
- [x] `npm test` -> full test suite passes across all modules -> AC-1 through AC-8

## Acceptance criteria coverage

- AC-1: Happy path resume redirection on `/` and `/login`
- AC-2: Forward skipping barrier blocking access to downstream routes
- AC-3: Completed owner isolation redirecting onboarding visits to `/launch`
- AC-4: Backward navigation permitted for prior steps
- AC-5: High watermark progression preserving unlocked step progress
- AC-6: Safe fallback for null, empty, or unrecognized step strings
- AC-7: Unauthenticated visitor redirection to `/login` with callback URL
- AC-8: Missing organization membership redirection to `/login`

## Value sourcing coverage

- `nextRequest.nextUrl.pathname`: current requested URL path read in middleware
- `request.headers.get("x-pathname")`: injected path read in Server Component layout
- `session.user.id`: session derived user ID via Better Auth
- `organization.onboardingStep`: active organization onboarding state in PostgreSQL
- `Math.max(currentStepIndex, newStepIndex)`: high watermark progression logic in step mutation actions
