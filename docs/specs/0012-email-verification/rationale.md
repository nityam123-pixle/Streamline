# Rationale: Email Verification · spec 0012

## Context

Streamline is an AI automation workflow platform where workspace owners register and configure multi step onboarding. In the original MVP auth setup (Feature 2), email verification was deferred so owners could sign up and reach the onboarding wizard immediately. However, allowing completely unverified emails long term creates risks of mistyped addresses, mailbox typos, spam registrations, and delivery failures on critical team notifications.

Furthermore, introducing live email sending capabilities (Feature 11) creates a critical threat vector: an attacker could register with a fake unverified email and use Streamline to dispatch spam or phishing team invites to third party corporate inboxes. The challenge is balancing security and verification against onboarding completion rates. The solution adopted is non blocking setup for private workspace steps (about, automations, tools) paired with gating outgoing transactional email dispatches until the owner verifies their address.

## Options considered

### Option 1: Hardened native Better Auth integration with Resend and React Email (Chosen)

Configure Better Auth built in `emailVerification` plugin hooks in `src/lib/auth/index.ts` with namespaced token generation (`email-verification:${email}`). Better Auth manages token creation and storage in the existing `Verification` database table, while delegating email compilation and delivery to a custom handler using Resend and React Email. Outgoing team invite emails in Feature 11 are held until verification is confirmed, and token consumption is executed atomically via conditional database updates.

**Pros**:
* Reuses existing Better Auth tables, cryptographic token helpers, and session management.
* Reuses existing Resend client, environment configuration, and React Email components established in Feature 11.
* Strictly namespaces tokens to eliminate cross feature token substitution attacks.
* Protects platform domain reputation by restricting outgoing emails until the sender address is verified.
* Atomic consumption prevents concurrent race condition exploits.

**Cons**:
* Requires configuring Better Auth email hooks alongside existing plugins.
* Unverified accounts cannot dispatch live invite emails to teammates, though they can copy the manual shareable invite link.

### Option 2: Fully custom verification token table and Server Actions

Bypass Better Auth email verification subsystem entirely and create a dedicated custom token table with manual token generation, SHA hashing, and custom verification endpoints.

**Pros**:
* Complete bespoke control over schema and lifecycle rules.
* Independent of Better Auth internal schema or configuration conventions.

**Cons**:
* Reinvents functionality that Better Auth already provides and maintains.
* Higher surface area for potential security flaws, timing attacks, or token leaks.
* Requires maintaining separate token lookup logic and session synchronization.

### Option 3: Hard verification gating blocking onboarding entry

Require owners to click the verification link and verify their email address before accessing the welcome step or any onboarding screen.

**Pros**:
* Guarantees 100 percent of active workspace owners have verified email addresses from minute one.
* Simplifies state management by eliminating unverified active sessions.

**Cons**:
* Creates significant onboarding drop off if transactional email delivery experiences latency.
* Degrades the smooth developer experience and quick time to value emphasized in Streamline product principles.
* Directly violates the explicit project scope requirement for non blocking onboarding.

## Rationale

Option 1 is selected because it directly aligns with Streamline architectural rules (never hand roll auth, import shared instances from `src/lib/auth/` and `src/lib/db/`). Better Auth already provides battle tested token creation and validation primitives in the existing database schema. By namespacing tokens (`email-verification:${email}`), applying atomic conditional updates (`updateMany`), and gating live outbound invite dispatches until verification is completed, Streamline secures its domain reputation while keeping the owner onboarding journey fast and intuitive.
