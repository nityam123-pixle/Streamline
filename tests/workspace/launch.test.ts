import { describe, it, expect, vi, afterAll, beforeAll, beforeEach } from "vitest"
import {
  getCompanyInitials,
  formatUserRole,
  formatAutomatingText,
  formatWorkflowText,
  formatIntegrationsText,
  formatInvitedTeammatesText,
} from "@/lib/launch/schemas"
import {
  getLaunchSummaryAction,
  completeOnboardingAction,
} from "@/actions/launch"
import { MEMBER_AVATAR_THEMES } from "@/components/launch/MemberCard"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import * as nextHeaders from "next/headers"

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}))

describe("Setup Summary and Onboarding Completion (Feature 8)", () => {
  const createdUserIds: string[] = []
  const createdOrgIds: string[] = []
  const testRunId = Date.now()
  const ownerEmail = `launch-owner-${testRunId}@example.com`
  const editorEmail = `launch-editor-${testRunId}@example.com`
  const testPassword = "SecurePassword123!"

  let ownerSessionCookie = ""
  let editorSessionCookie = ""
  let ownerUserId = ""
  let editorUserId = ""
  let testOrgId = ""
  let nullInviteOrgId = ""

  beforeAll(async () => {
    // 1. Create owner user via Better Auth
    const ownerRes = await auth.api.signUpEmail({
      body: {
        name: "Eleanor Vance",
        email: ownerEmail,
        password: testPassword,
      },
    })
    if (!ownerRes?.user) throw new Error("Failed to create test owner")
    ownerUserId = ownerRes.user.id
    createdUserIds.push(ownerUserId)

    // 2. Create editor user to test non-admin rejection
    const editorRes = await auth.api.signUpEmail({
      body: {
        name: "Luke Sanderson",
        email: editorEmail,
        password: testPassword,
      },
    })
    if (!editorRes?.user) throw new Error("Failed to create test editor")
    editorUserId = editorRes.user.id
    createdUserIds.push(editorUserId)

    // 3. Create primary organization with step "launch", automationAreas, selectedTools, and an inviteCode
    const org = await db.organization.create({
      data: {
        name: "Vance Media Corp",
        slug: `vance-media-${testRunId}`,
        onboardingStep: "launch",
        inviteCode: `vance-${testRunId}`,
        automationAreas: ["hr", "support"],
        selectedTools: ["hubspot", "slack"],
        members: {
          create: [
            {
              userId: ownerUserId,
              role: "owner",
              jobTitle: "Founder / CEO",
            },
            {
              userId: editorUserId,
              role: "editor",
              jobTitle: "Content Strategist",
            },
          ],
        },
        invitations: {
          create: [
            {
              email: `invited1-${testRunId}@example.com`,
              role: "editor",
              status: "pending",
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              inviterId: ownerUserId,
            },
            {
              email: `invited2-${testRunId}@example.com`,
              role: "viewer",
              status: "pending",
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              inviterId: ownerUserId,
            },
          ],
        },
      },
    })
    testOrgId = org.id
    createdOrgIds.push(testOrgId)

    // 4. Create an organization with NULL inviteCode to test null inviteCode handling
    const nullOrg = await db.organization.create({
      data: {
        name: "Legacy Workspace",
        slug: `legacy-${testRunId}`,
        onboardingStep: "launch",
        inviteCode: null, // explicitly null
        automationAreas: [],
        selectedTools: [],
        members: {
          create: [
            {
              userId: ownerUserId,
              role: "owner",
            },
          ],
        },
      },
    })
    nullInviteOrgId = nullOrg.id
    createdOrgIds.push(nullInviteOrgId)

    // 5. Sign in owner to obtain session cookie
    const ownerSignIn = await auth.api.signInEmail({
      body: {
        email: ownerEmail,
        password: testPassword,
      },
      asResponse: true,
    })
    ownerSessionCookie = ownerSignIn.headers.get("set-cookie") || ""

    // 6. Sign in editor to obtain session cookie
    const editorSignIn = await auth.api.signInEmail({
      body: {
        email: editorEmail,
        password: testPassword,
      },
      asResponse: true,
    })
    editorSessionCookie = editorSignIn.headers.get("set-cookie") || ""
  }, 45000)

  afterAll(async () => {
    for (const orgId of createdOrgIds) {
      try {
        await db.organization.delete({ where: { id: orgId } })
      } catch {
        // Ignore cleanup error
      }
    }
    for (const userId of createdUserIds) {
      try {
        await db.user.delete({ where: { id: userId } })
      } catch {
        // Ignore cleanup error
      }
    }
  }, 30000)

  beforeEach(async () => {
    if (ownerUserId && testOrgId) {
      await db.session.updateMany({
        where: { userId: ownerUserId },
        data: { activeOrganizationId: testOrgId },
      })
    }
  })

  describe("Validation & Formatting (schemas.ts)", () => {
    it("computes company initials correctly", () => {
      expect(getCompanyInitials("")).toBe("WS")
      expect(getCompanyInitials(null)).toBe("WS")
      expect(getCompanyInitials("   ")).toBe("WS")
      expect(getCompanyInitials("Streamline")).toBe("ST")
      expect(getCompanyInitials("Vance Media Corp")).toBe("VM")
      expect(getCompanyInitials("Acme")).toBe("AC")
      expect(getCompanyInitials("A")).toBe("A")
    })

    it("formats user role with job title and company", () => {
      expect(formatUserRole("Founder / CEO", "owner", "Vance Media")).toBe(
        "Founder / CEO at Vance Media"
      )
      expect(formatUserRole("", "owner", "Vance Media")).toBe("Owner at Vance Media")
      expect(formatUserRole(null, "editor", "Acme")).toBe("Editor at Acme")
      expect(formatUserRole("Designer", null, null)).toBe("Designer")
      expect(formatUserRole("", "", "")).toBe("Member")
    })

    it("formats automating text properly", () => {
      expect(formatAutomatingText(["hr", "support"])).toBe(
        "Automating: HR & Recruiting, Customer Support"
      )
      expect(formatAutomatingText(["sales"])).toBe("Automating: Sales Automation")
      expect(formatAutomatingText([])).toBe("Automating: None selected")
      expect(formatAutomatingText(null)).toBe("Automating: None selected")
    })

    it("formats workflow text derived from primary automation area", () => {
      expect(formatWorkflowText(["sales", "marketing"])).toBe(
        "First workflow: Lead Generation"
      )
      expect(formatWorkflowText(["hr"])).toBe("First workflow: Candidate Screening")
      expect(formatWorkflowText([])).toBe("First workflow: Workspace Automation")
      expect(formatWorkflowText(null)).toBe("First workflow: Workspace Automation")
    })

    it("formats integrations text with tool names", () => {
      expect(formatIntegrationsText(["hubspot", "slack"])).toBe(
        "2 tools selected: HubSpot, Slack"
      )
      expect(formatIntegrationsText(["notion"])).toBe("1 tool selected: Notion")
      expect(formatIntegrationsText([])).toBe("No tools selected")
      expect(formatIntegrationsText(null)).toBe("No tools selected")
    })

    it("formats invited teammates text based on count", () => {
      expect(formatInvitedTeammatesText(0)).toBe("Team: No teammates invited yet")
      expect(formatInvitedTeammatesText(1)).toBe("Team: 1 member invited")
      expect(formatInvitedTeammatesText(3)).toBe("Team: 3 members invited")
    })

    it("defines 6 Figma palette themes for member avatars with matching SA geometry tokens", () => {
      expect(MEMBER_AVATAR_THEMES).toHaveLength(6)
      // Blue theme (exact SA styling)
      expect(MEMBER_AVATAR_THEMES[0].bg).toBe("#A9C7FF")
      expect(MEMBER_AVATAR_THEMES[0].border).toBe("#82AEFF")
      expect(MEMBER_AVATAR_THEMES[0].text).toBe("#2086FF")
      // Green theme
      expect(MEMBER_AVATAR_THEMES[1].bg).toBe("#89EBBA")
      expect(MEMBER_AVATAR_THEMES[1].border).toBe("#58C16C")
      expect(MEMBER_AVATAR_THEMES[1].text).toBe("#15803D")
      // Purple theme
      expect(MEMBER_AVATAR_THEMES[2].bg).toBe("#D7C2FE")
      expect(MEMBER_AVATAR_THEMES[2].border).toBe("#AF76FF")
      expect(MEMBER_AVATAR_THEMES[2].text).toBe("#7F6EFF")
    })
  })

  describe("getLaunchSummaryAction", () => {
    it("rejects unauthenticated requests", async () => {
      vi.mocked(nextHeaders.headers).mockResolvedValue(new Headers())
      const res = await getLaunchSummaryAction()
      expect(res.success).toBe(false)
      expect(res.error).toMatch(/unauthorized/i)
    })

    it("returns complete launch summary matching workspace database records", async () => {
      const headers = new Headers()
      headers.set("cookie", ownerSessionCookie)
      headers.set("host", "localhost:3000")
      vi.mocked(nextHeaders.headers).mockResolvedValue(headers)

      const res = await getLaunchSummaryAction()
      expect(res.success).toBe(true)
      expect(res.summary).toBeDefined()

      const summary = res.summary!
      expect(summary.companyName).toBe("Vance Media Corp")
      expect(summary.companyInitials).toBe("VM")
      expect(summary.userRole).toBe("Founder / CEO at Vance Media Corp")
      expect(summary.automatingText).toBe("Automating: HR & Recruiting, Customer Support")
      expect(summary.workflowText).toBe("First workflow: Candidate Screening")
      expect(summary.integrationsText).toBe("2 tools selected: HubSpot, Slack")
      expect(summary.invitedCount).toBe(2)
      expect(summary.invitedTeammatesText).toBe("Team: 2 members invited")
      expect(summary.inviteCode).toBe(`vance-${testRunId}`)
      expect(summary.shareableInviteLink).toBe(`http://localhost:3000/join/vance-${testRunId}`)
      expect(summary.onboardingStep).toBe("launch")
      expect(summary.membersCount).toBe(2)
      expect(summary.members).toBeDefined()
      expect(summary.members).toHaveLength(2)
      expect(summary.members![0].role).toBe("owner")
      expect(summary.members![0].name).toBe("Eleanor Vance")
      expect(summary.members![0].email).toBe(ownerEmail)
      expect(summary.members![1].role).toBe("editor")
      expect(summary.members![1].name).toBe("Luke Sanderson")
      expect(summary.members![1].email).toBe(editorEmail)
    })

    it("restricts shareableInviteLink and inviteCode to owner/admin, hiding from editor/viewer", async () => {
      await db.session.updateMany({
        where: { userId: editorUserId },
        data: { activeOrganizationId: testOrgId },
      })

      const headers = new Headers()
      headers.set("cookie", editorSessionCookie)
      headers.set("host", "localhost:3000")
      vi.mocked(nextHeaders.headers).mockResolvedValue(headers)

      const res = await getLaunchSummaryAction()
      expect(res.success).toBe(true)
      expect(res.summary).toBeDefined()
      expect(res.summary?.memberRole).toBe("editor")
      expect(res.summary?.shareableInviteLink).toBeNull()
      expect(res.summary?.inviteCode).toBeNull()
    })

    it("handles Organization.inviteCode being null gracefully without throwing", async () => {
      // Temporarily switch active organization to the null-inviteCode workspace
      await db.session.updateMany({
        where: { userId: ownerUserId },
        data: { activeOrganizationId: nullInviteOrgId },
      })

      const headers = new Headers()
      headers.set("cookie", ownerSessionCookie)
      headers.set("host", "streamline.app")
      vi.mocked(nextHeaders.headers).mockResolvedValue(headers)

      const res = await getLaunchSummaryAction()
      expect(res.success).toBe(true)
      expect(res.summary).toBeDefined()

      const summary = res.summary!
      expect(summary.companyName).toBe("Legacy Workspace")
      expect(summary.companyInitials).toBe("LW")
      expect(summary.inviteCode).toBeNull()
      expect(summary.shareableInviteLink).toBeNull() // safely null, didn't throw
      expect(summary.automatingText).toBe("Automating: None selected")
      expect(summary.integrationsText).toBe("No tools selected")
      expect(summary.invitedCount).toBe(0)
      expect(summary.invitedTeammatesText).toBe("Team: No teammates invited yet")

      // Reset active organization back to testOrgId
      await db.session.updateMany({
        where: { userId: ownerUserId },
        data: { activeOrganizationId: testOrgId },
      })
    })

    it("respects x-forwarded-host header over host when generating invite link", async () => {
      const headers = new Headers()
      headers.set("cookie", ownerSessionCookie)
      headers.set("host", "internal-cluster.local:8080")
      headers.set("x-forwarded-host", "app.streamline.io")
      headers.set("x-forwarded-proto", "https")
      vi.mocked(nextHeaders.headers).mockResolvedValue(headers)

      const res = await getLaunchSummaryAction()
      expect(res.success).toBe(true)
      expect(res.summary?.shareableInviteLink).toBe(
        `https://app.streamline.io/join/vance-${testRunId}`
      )
    })
  })

  describe("completeOnboardingAction", () => {
    it("rejects unauthenticated requests", async () => {
      vi.mocked(nextHeaders.headers).mockResolvedValue(new Headers())
      const res = await completeOnboardingAction()
      expect(res.success).toBe(false)
      expect(res.error).toMatch(/unauthorized/i)
    })

    it("rejects non-owner/non-admin members (editor cannot complete onboarding)", async () => {
      // Ensure editor's session has activeOrganizationId set to testOrgId
      await db.session.updateMany({
        where: { userId: editorUserId },
        data: { activeOrganizationId: testOrgId },
      })

      const headers = new Headers()
      headers.set("cookie", editorSessionCookie)
      vi.mocked(nextHeaders.headers).mockResolvedValue(headers)

      const res = await completeOnboardingAction()
      expect(res.success).toBe(false)
      expect(res.error).toMatch(/forbidden|owner|admin/i)
    })

    it("advances organization onboardingStep to 'completed' for authenticated owner", async () => {
      // Verify initial step is "launch"
      const orgBefore = await db.organization.findUnique({
        where: { id: testOrgId },
        select: { onboardingStep: true },
      })
      expect(orgBefore?.onboardingStep).toBe("launch")

      const headers = new Headers()
      headers.set("cookie", ownerSessionCookie)
      vi.mocked(nextHeaders.headers).mockResolvedValue(headers)

      const res = await completeOnboardingAction()
      expect(res.success).toBe(true)
      expect(res.onboardingStep).toBe("completed")

      // Verify directly in the database
      const orgAfter = await db.organization.findUnique({
        where: { id: testOrgId },
        select: { onboardingStep: true },
      })
      expect(orgAfter?.onboardingStep).toBe("completed")
    })
  })
})
