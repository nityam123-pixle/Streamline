# 0007. Team Invitations Persistence Rationale

## Context

Streamline is an automation platform designed for collaborative workspace environments. During step five of the onboarding journey, workspace owners are invited to bring teammates into their newly created workspace. The onboarding interface provides input fields for entering multiple colleague emails and picking roles, along with a card offering a shareable workspace invite link and an option to skip the step for now.

Before this feature, the team invitation step existed only as static client state in the user interface. Submitting the step or clicking the skip button did not persist invitations to Neon PostgreSQL, did not generate cryptographic tokens, and did not advance the workspace onboarding record in the database.

The key challenge for this feature is to support secure invitation generation without requiring live transactional email infrastructure at this stage of the product roadmap. The architecture must satisfy three primary forces. First, invitation tokens must remain secure even if read replicas or database backups are compromised, adhering to the security invariant established in specification 0001. Second, the user interface and database roles must align cleanly to avoid unexpected validation failures or silent casting. Third, owners must have a frictionless path to complete onboarding whether they choose to invite five colleagues immediately or skip the step entirely.

## Options considered

### Option 1: Transactional batch upsert with hashed tokens, database role enum alignment, and organization shareable invite codes (Chosen)

In this approach, a Next.js Server Action accepts an array of email and role objects, validates them using Zod, and checks active session authorization for workspace owners and admins. Raw invitation tokens are generated as thirty two byte random hex strings and hashed using SHA 256 before being stored in the database. The PostgreSQL Role enum is extended with the viewer role to match the user interface options. A unique plain text invite code is stored on the Organization table to power reusable public invite links. Submitting empty email fields safely advances onboardingStep to launch without creating unnecessary database rows.

**Pros**:
- High security: raw tokens are never persisted in plain text, eliminating token harvesting risks.
- Type safety and consistency: the database role enum matches the user interface options directly.
- Frictionless onboarding: supports both rich team invitations and instant skipping without errors.
- Atomic execution: invitation records and workspace step advancement succeed together inside a single database transaction.

**Cons**:
- Requires a database migration to add the viewer role to the PostgreSQL Role enum.
- Reinviting an email requires generating a new token hash since the original raw token cannot be read from the database.

### Option 2: Plain text token storage with application layer role mapping

This approach generates random tokens and stores them in plain text within the Invitation table. When the user interface submits Viewer, the Server Action maps it to the editor role in code rather than modifying the database schema.

**Pros**:
- Avoids modifying the PostgreSQL Role enum.
- Allows reading the original token directly from the database if an owner reopens the invitation view.

**Cons**:
- Severe security risk: plain text tokens stored in the database can be harvested to gain unauthorized access to workspaces.
- Data mismatch: users assigned Viewer in the user interface receive Editor permissions in the database.
- Violates the security invariant explicitly established in specification 0001.

### Option 3: Client driven individual invitations with dedicated public link records

This approach makes separate API calls from the client for each invited email address, creating individual invitations one by one. For the shareable link, it creates a special invitation record with a null email address representing the public workspace link.

**Pros**:
- Isolates failures so that one invalid email does not block other valid invitations.
- Reuses the invitation table for both direct emails and public links.

**Cons**:
- High network overhead with multiple sequential or parallel network requests during onboarding.
- Non atomic state: partial failures can leave the workspace in an inconsistent onboarding state.
- Querying invitations becomes messy due to null email placeholder records.

## Rationale

Option 1 is selected because it strictly preserves Streamline's architectural standards and security invariants while delivering a robust user experience. 

Storing invitation tokens as SHA 256 hashes ensures that sensitive access credentials are never stored in plain text. This directly fulfills the security guarantee documented in specification 0001. Extending the PostgreSQL Role enum to include viewer is a clean, permanent solution that avoids artificial mapping in application code.

Using an atomic database transaction guarantees that either all valid invitations and the onboarding step progression are saved together, or none are. Generating a dedicated shareable invite code on the Organization record provides a clear separation between reusable public workspace links and single use confidential email invitations. Rather than relying on random string length alone to guarantee uniqueness, invite code generation mirrors the collision check and retry pattern used for workspace slugs in src/actions/auth.ts: it checks uniqueness inside the transaction across up to five attempts with fresh crypto entropy, falling back to a random UUID if needed.
