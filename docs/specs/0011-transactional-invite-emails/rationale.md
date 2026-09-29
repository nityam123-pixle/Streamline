# Rationale: 0011. Transactional Invite Emails

## Context

Streamline previously allowed workspace owners to invite team members by entering email addresses and roles during step 5 of the onboarding wizard. While this created pending `Invitation` database records with secure SHA-256 token hashes, the application did not dispatch automated emails. Instead, owners had to manually copy and distribute a single shareable link.

Manual link distribution introduces friction into the collaboration loop. Prospective teammates must wait for owners to paste links over messaging platforms, and personal invite links with specific role assignments cannot be easily delivered individually without automated email dispatch.

To make team onboarding functional and scalable, Streamline requires a transactional email delivery pipe. The system must support branded templates matching Streamline visual identity, deliver links reliably, handle missing credentials during local development, and prevent external provider outages from corrupting database transactions.

## Options considered

### Option 1: Resend with React Email (Recommended)

Integrate Resend via the `resend` TypeScript SDK and author email templates using `@react-email/components`.

**Pros**:
* First class TypeScript support and modern developer experience.
* React Email allows building emails with familiar JSX components, sharing typography and color palette tokens with the main Next.js app.
* Built in support for development sandboxing and test environments.
* High deliverability infrastructure built on top of modern email standards.

**Cons**:
* Adds runtime dependencies on `resend` and `@react-email/components`.

### Option 2: Postmark with inline HTML templates

Use Postmark server API with raw concatenated HTML strings or handlebars templates.

**Pros**:
* Established reputation for transactional deliverability and strict separation from marketing broadcasts.
* Fast API response times and robust delivery metrics.

**Cons**:
* Inline HTML templates lack component reusability and type checking, making styling maintenance cumbersome compared to React Email.
* Development sandbox requires dedicated test server tokens.

### Option 3: External message queue (Redis/BullMQ) with asynchronous workers

Buffer all email sending jobs into a Redis backed queue and process delivery via background worker processes.

**Pros**:
* Completely decouples email dispatch latency from HTTP request lifecycles.
* Built in retry backoff and rate limit pacing.

**Cons**:
* Introduces operational complexity requiring a persistent Redis instance and worker process, which is excessive for current onboarding traffic volumes.
* Significantly increases architectural footprint without immediate performance benefit.

## Rationale

Resend with React Email (Option 1) provides the ideal balance between developer velocity, type safety, and visual polish. By authoring emails in JSX with `@react-email/components`, the invitation email directly mirrors Streamline design conventions, typography, and button styling.

Executing delivery synchronously within `createTeamInvitationsAction` with error isolation provides immediate feedback to owners while keeping architecture lightweight. Because Prisma transactions commit before email dispatch begins, database state remains consistent even if the network fails. A development mock logger fallback ensures engineers can build and run tests without external API dependencies.

### Coexistence with manual shareable link UI

We evaluated whether to replace the manual `ShareLinkCard` with an inline sent status or list of individual copy links once invitations are submitted.

We decided to keep `ShareLinkCard` and the onboarding UI exactly as is:
* The organization shareable link serves a different use case than individual emails. It enables rapid broadcast across group channels such as Slack, Discord, or Microsoft Teams.
* Step 5 already states that invitees will receive an email. Clicking Continue advances directly into the launch step where setup summary cards already reflect invited team members.
* Preserving existing UI components avoids introducing layout shifts, adhering strictly to the principle of wiring data into existing Figma interfaces without altering layout or motion behavior.

## References

None required. Full reasoning is documented in this rationale record.
