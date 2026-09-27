# 0009. Onboarding Resume and Route Protection Rationale

## Context

Streamline is an automation platform with a six step onboarding process for workspace owners. Across previous feature slices, the application gained database persistence for workspace profiles, automation choices, selected tools, team invitations, and final launch completion. Each step saves data to Neon PostgreSQL and advances the `onboardingStep` string on the `Organization` record.

Prior to this feature, onboarding routing had no resume capability or route protection. When an authenticated user logged in or returned to the root URL `/`, Edge middleware unconditionally redirected them to `/welcome`. If an owner was halfway through onboarding, such as on step four (`/tools`), they landed back on step one and had to manually navigate forward through previously completed steps. Furthermore, an owner who completed onboarding (`onboardingStep === "completed"`) could freely navigate back into incomplete steps or was redirected to `/welcome` on login, creating a confusing loop. Finally, users could manually type downstream route URLs into their browser (such as jumping straight to `/launch` from an empty workspace), bypassing required configuration dependencies.

The architectural challenge is to enforce strict route authorization and seamless resume behavior across Next.js App Router boundaries. Next.js middleware runs on an Edge or lightweight runtime where database connections and heavy ORM operations are discouraged. In contrast, Server Component layouts run in Node.js with direct access to Prisma and PostgreSQL, but traditional App Router layouts do not automatically re-execute on every nested client navigation unless a route segment changes. The solution must provide airtight security, prevent infinite redirect loops, maintain low latency, and preserve data integrity when users navigate backward to edit earlier steps.

## Options considered

### Option 1: Hybrid route guard with middleware path forwarding and Server Component layout authorization (Chosen)

In this approach, Edge middleware performs fast unauthenticated checks and injects the current requested pathname into an `x-pathname` request header. The Server Component layout in `src/app/(onboarding)/layout.tsx` reads this header alongside the verified Better Auth session. It queries Neon PostgreSQL through Prisma to retrieve the owner active organization and its `onboardingStep`. The layout compares the requested step against the database step using high watermark logic:
- If `onboardingStep` is completed, any request to an onboarding step other than `/launch` redirects to `/launch`.
- If `onboardingStep` is incomplete, any request to `/welcome` or to a forward step beyond the owner unlocked step redirects to the exact route for `onboardingStep`.
- Any request to an earlier or current unlocked step (`stepIndex <= currentStepIndex`) is allowed to render normally.
- If `onboardingStep` is null, empty, or unrecognized, it safely defaults to `"welcome"`.

**Pros**:
- Authoritative accuracy: Route protection and resume checks read live database state directly, eliminating cache desynchronization.
- Clean separation of concerns: Middleware handles lightweight URL normalization and authentication gates, while Server Components handle domain authorization and database queries.
- Zero extra client overhead: Redirections occur on the server before client HTML or JavaScript bundles are rendered.
- High watermark support: Owners can navigate back to inspect or modify earlier steps without having their unlocked progress regressed.
- Zero schema migrations: Fully reuses the existing `onboardingStep` column on the `Organization` table.

**Cons**:
- Every onboarding route navigation involves a quick PostgreSQL query in the server layout.
- Requires injecting a custom `x-pathname` header in middleware because Server Component layouts in Next.js App Router do not expose the full request URL directly in page props.

### Option 2: Stateful signed cookie caching for Edge middleware routing

This approach stores the owner active `onboardingStep` inside an encrypted or signed HTTP cookie updated whenever a step mutation succeeds. Edge middleware reads this cookie on every request and executes all redirects directly at the network edge without invoking Server Components.

**Pros**:
- Near zero latency: All redirects happen at the edge before hitting Node.js or PostgreSQL.
- Eliminates database queries during layout evaluation.

**Cons**:
- State desynchronization risk: If an owner operates across multiple browser tabs, or if a database update succeeds but cookie serialization fails, the cookie becomes stale and causes incorrect routing or redirect loops.
- Secret management complexity: Requires cookie encryption or HMAC signing utilities shared between server actions and Edge middleware.
- Security vulnerability: Client cookie tampering could theoretically be attempted if signing keys are misconfigured.

### Option 3: Dedicated resume route handler (/onboarding/resume)

This approach creates a dedicated Next.js Route Handler at `/onboarding/resume`. When an authenticated owner visits `/login` or `/`, middleware redirects them to `/onboarding/resume`. The route handler queries Prisma, determines the target route, and issues an HTTP 307 redirect to the correct step.

**Pros**:
- Centralizes resume redirection in a single endpoint separate from UI components.
- Avoids custom header injection in middleware.

**Cons**:
- Does not protect against manual URL tampering: A user can still manually type `/launch` in their browser, completely bypassing the `/onboarding/resume` handler.
- Adds an unnecessary extra HTTP redirect hop on every login.
- Fails to enforce completed owner protection across direct page visits.

### Option 4: Pure client side redirection inside OnboardingProvider

This approach allows all onboarding routes to render immediately. Inside `OnboardingProvider`, a React `useEffect` calls a Server Action to fetch the owner current `onboardingStep`. If the current pathname does not match, it calls `router.replace()` to navigate to the target step.

**Pros**:
- Trivial to implement using existing React context and router hooks.
- Requires no changes to middleware.

**Cons**:
- Visual flash of unauthorized content: Users briefly see the requested screen before being kicked back to their active step.
- Poor security: Sensitive downstream setup forms or summaries are delivered to the browser before authorization is verified.
- Violates Streamline core rule: Server Components by default; authorization must be enforced on the server before rendering.

## Rationale

Option 1 is selected because it delivers airtight server authorization while aligning with Next.js 16 App Router architectural principles and Streamline established rules.

Relying on live database queries inside server components ensures that route decisions reflect true PostgreSQL state. This prevents the stale state bugs and cross tab desynchronization that plague cookie based approaches (Option 2). Because Next.js App Router Server Components run before sending responses to the client, unauthorized requests are halted with Next.js `redirect()` before any step markup is transmitted, avoiding the flash of content inherent in client side checking (Option 4).

Crucially, to prevent fragmented logic and double redirects, a single shared helper `getOnboardingResumeState(userId: string)` in `src/lib/onboarding/routing.ts` serves as the sole implementation of step resolution. This helper is invoked identically across:
1. `src/app/page.tsx` (Server Component): When an authenticated session exists, it queries the shared helper and redirects directly to the active step in a single hop.
2. `src/app/login/page.tsx` (Server Component): When an authenticated session exists, it queries the shared helper and redirects directly to the active step in a single hop.
3. `src/app/(onboarding)/layout.tsx` (Server Component Layout): It queries the shared helper to enforce forward boundary barriers, completed workspace protection, and `/welcome` resume handling.

Forwarding `x-pathname` through middleware is standard practice in Next.js App Router applications to grant server layouts visibility into the active route. Combining this with the shared resume helper and high watermark step evaluation satisfies all requirements: owners resume seamlessly in one hop, completed workspaces remain locked, backward review is preserved, and forward skipping is completely blocked without duplicating logic across routes.
