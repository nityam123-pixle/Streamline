import { db } from "../src/lib/db/index"

async function runVerification() {
  console.log("Starting database verification...")

  const testEmail = `test-${Date.now()}@example.com`
  const testSlug = `test-org-${Date.now()}`

  // 1. Create Organization and User
  console.log("Creating test organization and user...")
  const user = await db.user.create({
    data: {
      name: "Jane Doe",
      firstName: "Jane",
      lastName: "Doe",
      email: testEmail,
      emailVerified: true,
    },
  })

  const org = await db.organization.create({
    data: {
      name: "Acme Automation",
      slug: testSlug,
      teamSize: "1-10",
      automationAreas: ["marketing", "sales"],
      selectedTools: ["slack", "github"],
    },
  })

  console.log(`Created user ${user.id} and org ${org.id}`)

  // 2. Create Session and Account for User
  const sessionToken = `session-token-${Date.now()}`
  const session = await db.session.create({
    data: {
      userId: user.id,
      token: sessionToken,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      activeOrganizationId: org.id,
    },
  })

  const account = await db.account.create({
    data: {
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: "hashedpassword123",
    },
  })

  console.log(`Created session ${session.id} and account ${account.id}`)

  // 3. Create Member and Invitation for Organization
  const member = await db.member.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      role: "owner",
      jobTitle: "Founder",
    },
  })

  const inviteToken = `invite-token-${Date.now()}`
  const invitation = await db.invitation.create({
    data: {
      organizationId: org.id,
      email: `invitee-${Date.now()}@example.com`,
      role: "editor",
      token: inviteToken,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 48),
      inviterId: user.id,
    },
  })

  console.log(`Created member ${member.id} and invitation ${invitation.id}`)

  // 4. Test Unique Constraint on User email
  console.log("Verifying unique constraint on email...")
  let duplicateCaught = false
  try {
    await db.user.create({
      data: {
        name: "Duplicate User",
        email: testEmail,
      },
    })
  } catch (err: unknown) {
    duplicateCaught = true
    console.log("Duplicate email rejected as expected.")
  }

  if (!duplicateCaught) {
    throw new Error("Failed to enforce unique constraint on email")
  }

  // 5. Test Cascade Deletion on User (should cascade to Session and Account)
  console.log("Verifying cascade delete on user...")
  await db.user.delete({
    where: { id: user.id },
  })

  const remainingSession = await db.session.findUnique({
    where: { id: session.id },
  })
  const remainingAccount = await db.account.findUnique({
    where: { id: account.id },
  })

  if (remainingSession !== null || remainingAccount !== null) {
    throw new Error("Cascade delete failed for user relations")
  }
  console.log("Session and Account cascaded successfully on user deletion.")

  // 6. Test Cascade Deletion on Organization
  console.log("Verifying cascade delete on organization...")
  await db.organization.delete({
    where: { id: org.id },
  })

  const remainingInvitation = await db.invitation.findUnique({
    where: { id: invitation.id },
  })

  if (remainingInvitation !== null) {
    throw new Error("Cascade delete failed for organization relations")
  }
  console.log("Invitation cascaded successfully on organization deletion.")

  console.log("All database verification checks passed cleanly!")
}

runVerification()
  .catch((err) => {
    console.error("Verification failed:", err)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
