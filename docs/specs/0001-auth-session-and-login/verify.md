# Verify: Auth, session and login page · spec 0001 · updated 2026-09-25
_Steps derived from spec 0001 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] Visit `/welcome` without a session cookie -> browser redirects to `/login?callbackUrl=%2Fwelcome` -> AC-2
- [x] View `/login` page -> displays split screen branding panel on left and login form on right -> AC-3
- [x] Submit invalid password on `/login` -> displays inline error feedback and keeps email input -> AC-5
- [x] Submit ten invalid login attempts within one minute -> displays rate limit lockout error -> AC-5
- [x] Submit valid email and password on `/login` -> signs in, sets session cookie, and redirects to `/welcome` or safe callbackUrl -> AC-4
- [x] Navigate to `/login` or `/` with an active session cookie -> automatically redirects to `/welcome` -> AC-8
- [x] Click sign out or call sign out API -> session cookie is removed and session token is invalidated in database -> AC-6

## Commands
- [x] `npm run build` -> compiles Next.js with `/login`, `/api/auth/[...all]`, and proxy middleware with zero errors -> AC-1, AC-2, AC-3
- [x] `npx -y tsx scripts/verify-auth.ts` -> completes automated signup, signin, middleware gating, and signout checks -> AC-1, AC-2, AC-4, AC-6, AC-8

## Value sourcing
- Render `/login` -> shared layout from `BrandSection` and input components -> Value sourcing row 1
- Process sign in -> `better-auth.session_token` cookie set upon verifying password -> Value sourcing row 2
- Protect onboarding routes -> redirection to `/login` evaluated in `src/middleware.ts` -> Value sourcing row 6
- Validate return URL -> relative paths starting with single `/` accepted, external URLs rejected -> Value sourcing row 7

## Acceptance criteria coverage
- AC-1 covered by `src/lib/auth/index.ts`, `src/lib/auth/client.ts`, and `scripts/verify-auth.ts`
- AC-2 covered by `src/middleware.ts` and `scripts/verify-auth.ts`
- AC-3 covered by `src/app/login/page.tsx` and `src/components/form/LoginForm.tsx`
- AC-4 covered by `src/components/form/LoginForm.tsx` and `scripts/verify-auth.ts`
- AC-5 covered by `LoginForm` inline error state and rate limit handling
- AC-6 covered by `auth.api.signOut` and `scripts/verify-auth.ts`
- AC-7 covered by schema migrations and live database tables
- AC-8 covered by `src/middleware.ts` and `scripts/verify-auth.ts`
