# 0010. Invite Acceptance and Teammate Join Flow · Rationale

## Context

Streamline is a multi tenant AI automation platform. In earlier slices, owners could sign up, configure workspace profiles, choose tools, and generate team invitations with SHA-256 hashed tokens and shareable invite codes. However, invited teammates had no interface or endpoint to accept those invitations.

Furthermore, returning non owner teammates who joined a workspace would risk being trapped in the six step owner onboarding flow designed exclusively for initial workspace setup. Slice 5 addresses both requirements by introducing public invite acceptance routes and an automatic onboarding bypass for non owner teammates.

## Options considered

### Option 1: Dual route architecture with /invite/:token for personal invites and /join/:code for shareable links (Chosen)

This option establishes two dedicated public routes. Personal invitations sent to specific email addresses are resolved via `/invite/:token`, locking the registration form to the invited email address. General team access via the organization shareable code is resolved via `/join/:code`, allowing teammates to register with their own email.

**Pros**:
* Clear semantic and security separation between individual tokens and shareable team codes.
* Enforces strict recipient email matching on personal invitations.
* Aligns directly with URL generation logic established in Feature 7.

**Cons**:
* Requires two route handlers in the Next.js App Router.

### Option 2: Unified /invite/:id route resolving both token and code

A single public route inspects the URL parameter length, attempting a 64 character SHA-256 token lookup first and falling back to an 8 character organization code lookup.

**Pros**:
* Single page component to maintain.

**Cons**:
* Blurs distinct security boundaries between personal invitations and public organization links.
* More complex client form states accommodating both locked and unlocked email fields.

### Option 3: Magic link authentication redirecting through standard login

Visitors click an email link that logs them in via a temporary session token, redirecting them through the standard login page before claiming the invitation.

**Pros**:
* Reuses existing login UI.

**Cons**:
* Clunky multi hop experience for first time users.
* Requires live transactional email infrastructure, which is explicitly deferred in the project scope.

## Rationale

Option 1 provides the cleanest, most secure user experience. Personal invitations lock the email input to prevent unauthorized account claims, while organization shareable codes provide frictionless onboarding for teammates. Reusing existing database tables eliminates migration risk, while the non owner bypass in `getOnboardingResumeState` ensures invited members land cleanly on the launch screen without touching owner setup forms.

## References

None.
