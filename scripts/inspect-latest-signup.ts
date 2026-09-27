import { db } from "../src/lib/db/index"

async function inspectLatest() {
  console.log("Fetching latest registered user from database...")
  const latestUser = await db.user.findFirst({
    orderBy: { createdAt: "desc" },
    include: {
      sessions: true,
      accounts: true,
      members: {
        include: {
          organization: true,
        },
      },
    },
  })

  if (!latestUser) {
    console.log("No users found in database.")
    return
  }

  console.log("--- Latest User Record ---")
  console.log("ID:", latestUser.id)
  console.log("Name:", latestUser.name)
  console.log("First Name:", latestUser.firstName)
  console.log("Last Name:", latestUser.lastName)
  console.log("Email:", latestUser.email)
  console.log("Created At:", latestUser.createdAt.toISOString())

  console.log("--- Organization & Membership ---")
  if (latestUser.members.length === 0) {
    console.log("No organization memberships found for this user.")
  } else {
    for (const member of latestUser.members) {
      console.log("Member Role:", member.role)
      console.log("Organization ID:", member.organization.id)
      console.log("Organization Name:", member.organization.name)
      console.log("Organization Slug:", member.organization.slug)
      console.log("Onboarding Step:", member.organization.onboardingStep)
    }
  }

  console.log("--- Active Sessions ---")
  console.log("Session Count:", latestUser.sessions.length)
  for (const session of latestUser.sessions) {
    console.log("Session ID:", session.id)
    console.log("Active Organization ID:", session.activeOrganizationId)
    console.log("Expires At:", session.expiresAt.toISOString())
  }
}

inspectLatest()
  .catch((err) => {
    console.error("Error inspecting database:", err)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
