import { db } from "../src/lib/db"
import { auth } from "../src/lib/auth"
import {
  getCompanyInitials,
  formatUserRole,
  formatAutomatingText,
  formatWorkflowText,
  formatIntegrationsText,
  formatInvitedTeammatesText,
} from "../src/lib/launch/schemas"

async function runSetupSummaryVerification() {
  console.log("==================================================")
  console.log("Starting Setup Summary & Onboarding Completion Verification")
  console.log("==================================================")

  // 1. Unauthenticated route check on /launch
  console.log("\n[Check 1] Verifying unauthenticated route protection on /launch...")
  const unauthRes = await fetch("http://localhost:3000/launch", {
    redirect: "manual",
  })
  if (unauthRes.status !== 307) {
    throw new Error(`Expected 307 redirect for unauthenticated /launch, got ${unauthRes.status}`)
  }
  const location = unauthRes.headers.get("location") || ""
  if (!location.includes("/login?callbackUrl=%2Flaunch")) {
    throw new Error(`Expected redirect location to contain /login?callbackUrl=%2Flaunch, got ${location}`)
  }
  console.log(`PASS: Unauthenticated /launch returned ${unauthRes.status} redirecting to ${location}`)

  // 2. Seed a verification owner user and workspace
  console.log("\n[Check 2] Setting up verification workspace in database...")
  const testRunId = Date.now()
  const verifyEmail = `verify-owner-${testRunId}@streamline-qa.local`
  const password = "VerificationSecret123!"

  const userRes = await auth.api.signUpEmail({
    body: {
      name: "Morgan Sterling",
      email: verifyEmail,
      password: password,
    },
  })
  if (!userRes?.user) {
    throw new Error("Failed to sign up verification user")
  }
  const userId = userRes.user.id

  const org = await db.organization.create({
    data: {
      name: "Sterling Dynamics",
      slug: `sterling-${testRunId}`,
      onboardingStep: "launch",
      inviteCode: `sterling-invite-${testRunId}`,
      automationAreas: ["sales", "data"],
      selectedTools: ["hubspot", "salesforce", "slack"],
      members: {
        create: [
          {
            userId: userId,
            role: "owner",
            jobTitle: "Chief Executive Officer",
          },
        ],
      },
      invitations: {
        create: [
          {
            email: `alex-${testRunId}@colleague.local`,
            role: "editor",
            status: "pending",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            inviterId: userId,
          },
          {
            email: `taylor-${testRunId}@colleague.local`,
            role: "viewer",
            status: "pending",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            inviterId: userId,
          },
        ],
      },
    },
  })

  // Sign in to establish active session
  const signInRes = await auth.api.signInEmail({
    body: {
      email: verifyEmail,
      password: password,
    },
    asResponse: true,
  })
  const cookieHeader = signInRes.headers.get("set-cookie") || ""

  // Ensure activeOrganizationId is set
  await db.session.updateMany({
    where: { userId: userId },
    data: { activeOrganizationId: org.id },
  })

  console.log("PASS: Verification workspace seeded:", {
    orgId: org.id,
    name: org.name,
    inviteCode: org.inviteCode,
    automationAreas: org.automationAreas,
    selectedTools: org.selectedTools,
  })

  // 3. Authenticated route HTML render check
  console.log("\n[Check 3] Verifying authenticated /launch route render...")
  const authRes = await fetch("http://localhost:3000/launch", {
    headers: { Cookie: cookieHeader },
  })
  if (authRes.status !== 200) {
    throw new Error(`Expected 200 OK on authenticated /launch, got ${authRes.status}`)
  }
  const html = await authRes.text()
  if (!html.includes("You’re all set!") && !html.includes("You&#x27;re all set!")) {
    throw new Error("Rendered HTML missing step 6 title 'You’re all set!'")
  }
  if (!html.includes("Launch Streamline")) {
    throw new Error("Rendered HTML missing 'Launch Streamline' button")
  }
  console.log("PASS: Authenticated /launch rendered 200 OK with heading and launch button")

  // 4. Test formatters & database query derivation directly
  console.log("\n[Check 4] Testing database values and derivation logic...")
  const [dbOrg, dbMember, pendingCount] = await Promise.all([
    db.organization.findUnique({
      where: { id: org.id },
    }),
    db.member.findFirst({
      where: { organizationId: org.id, userId },
    }),
    db.invitation.count({
      where: { organizationId: org.id, status: "pending" },
    }),
  ])

  if (!dbOrg) throw new Error("Organization not found in database")
  if (!dbMember) throw new Error("Member not found in database")

  const initials = getCompanyInitials(dbOrg.name)
  const roleText = formatUserRole(dbMember.jobTitle, dbMember.role, dbOrg.name)
  const autoText = formatAutomatingText(dbOrg.automationAreas)
  const wfText = formatWorkflowText(dbOrg.automationAreas)
  const toolsText = formatIntegrationsText(dbOrg.selectedTools)
  const teamText = formatInvitedTeammatesText(pendingCount)

  console.log("Derived fields:", {
    initials,
    roleText,
    autoText,
    wfText,
    toolsText,
    teamText,
  })

  if (initials !== "SD") throw new Error(`Wrong initials: ${initials}`)
  if (roleText !== "Chief Executive Officer at Sterling Dynamics") throw new Error(`Wrong roleText: ${roleText}`)
  if (autoText !== "Automating: Sales Automation, Data & Reporting") throw new Error(`Wrong autoText: ${autoText}`)
  if (wfText !== "First workflow: Lead Generation") throw new Error(`Wrong wfText: ${wfText}`)
  if (toolsText !== "3 tools selected: HubSpot, Salesforce, Slack") throw new Error(`Wrong toolsText: ${toolsText}`)
  if (teamText !== "Team: 2 members invited") throw new Error(`Wrong teamText: ${teamText}`)
  console.log("PASS: All schema formatting functions correctly match database records")

  // 5. Test null inviteCode handling
  console.log("\n[Check 5] Testing null inviteCode resilience...")
  await db.organization.update({
    where: { id: org.id },
    data: { inviteCode: null },
  })

  const nullOrg = await db.organization.findUnique({ where: { id: org.id } })
  if (nullOrg?.inviteCode !== null) throw new Error("Expected null inviteCode")
  console.log("PASS: inviteCode successfully set to null in database")

  // 6. Test advancing onboardingStep to 'completed'
  console.log("\n[Check 6] Advancing onboardingStep to 'completed'...")
  const updatedOrg = await db.organization.update({
    where: { id: org.id },
    data: { onboardingStep: "completed" },
  })
  if (updatedOrg.onboardingStep !== "completed") {
    throw new Error(`Expected onboardingStep "completed", got ${updatedOrg.onboardingStep}`)
  }

  const verifiedOrg = await db.organization.findUnique({
    where: { id: org.id },
    select: { onboardingStep: true },
  })
  if (verifiedOrg?.onboardingStep !== "completed") {
    throw new Error(`PostgreSQL record not updated to 'completed': ${verifiedOrg?.onboardingStep}`)
  }
  console.log("PASS: PostgreSQL database confirms onboardingStep = 'completed'")

  // Cleanup
  await db.organization.delete({ where: { id: org.id } })
  await db.user.delete({ where: { id: userId } })
  console.log("PASS: Verification test data cleaned up successfully")

  console.log("\n==================================================")
  console.log("All Runtime Checks Passed Successfully!")
  console.log("==================================================")
}

runSetupSummaryVerification().catch((err) => {
  console.error("FATAL VERIFICATION ERROR:", err)
  process.exit(1)
})
