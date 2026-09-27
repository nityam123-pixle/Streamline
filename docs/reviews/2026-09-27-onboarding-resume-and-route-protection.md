# Review: Onboarding Resume & Route Protection, 2026-09-27

**Reviewed by**: Reviewer (fresh model review)
**Scope**: 10 files (src/lib/onboarding/routing.ts, src/middleware.ts, src/app/page.tsx, src/app/login/page.tsx, src/app/(onboarding)/layout.tsx, src/actions/workspace.ts, src/actions/automation.ts, src/actions/tools.ts, src/actions/team-invitation.ts, tests/workspace/onboarding-routing.test.ts)
**Verdict**: Approve with nits

## Summary

This change implements authoritative onboarding resume and route protection across Next.js 16 App Router. The architecture uses edge middleware path forwarding, Server Component layout authorization, single hop root and login redirection, and high watermark step progression in database mutations. The code is modular, type safe, derives identity authoritatively on the server, and boasts exhaustive test coverage with zero regressions.

## Blockers

None

## Major

None

## Minor

### 🟡 Multi-organization scoping in getOnboardingResumeState, `src/lib/onboarding/routing.ts:159`
**Problem**: `getOnboardingResumeState` resolves the active workspace using `db.member.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } })`.
**Why it matters**: For single owner initial onboarding, this is accurate and deterministic. In future slices (such as Slice 5 teammate invite acceptance or multi-workspace switching), an owner could belong to multiple workspaces, where `createdAt: "asc"` may select the initial workspace rather than their active session organization.
**Suggested fix**: Support an optional `preferredOrganizationId` parameter on `getOnboardingResumeState(userId, organizationId?)`, querying that workspace directly when provided and falling back to `createdAt: "asc"`.

### 🟡 Next.js 16 proxy convention deprecation warning, `src/middleware.ts:42`
**Problem**: Next.js 16 displays a build deprecation notice for the `middleware` file convention, recommending `proxy`.
**Why it matters**: While middleware continues to work properly and pass all routing headers, future Next.js updates may require the new proxy convention.
**Suggested fix**: Run `npx @next/codemod@canary middleware-to-proxy .` in a subsequent maintenance cycle.

## Nits

* ⚪ `src/lib/onboarding/routing.ts:111`, trailing slash replacement on root `"/"` produces empty string `""` which evaluates to `undefined` in `PATH_TO_STEP_INDEX`. While benign due to undefined check, handling root explicitly enhances clarity.
