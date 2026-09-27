import { describe, it, expect, vi, afterAll, beforeAll } from "vitest"
import {
  teamInvitationsSchema,
  validateAndNormalizeInvites,
} from "@/lib/team-invitation/schemas"
import {
  getTeamInvitationsAction,
  createTeamInvitationsAction,
} from "@/actions/team-invitation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import * as nextHeaders from "next/headers"

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}))

describe("Team Invitations Persistence (Feature 7)", () => {
  const createdUserIds: string[] = []
  const createdOrgIds: string[] = []
  const testRunId = Date.now()
  const ownerEmail = `invite-owner-${testRunId}@example.com`
  const memberEmail = `existing-member-${testRunId}@example.com`
  const editorEmail = `colleague-editor-${testRunId}@example.com`
  const adminEmail = `colleague-admin-${testRunId}@example.com`
  const viewerEmail = `colleague-viewer-${testRunId}@example.com`
  const testPassword = "SecurePassword123!"

  let ownerSessionCookie = ""
  let memberSessionCookie = ""
  let ownerUserId = ""
  let memberUserId = ""
  let testOrgId = ""

  beforeAll(async () => {
    // 1. Create owner user via Better Auth
    const ownerRes = await auth.api.signUpEmail({
      body: {
        name: "Guinevere Pendragon",
        email: ownerEmail,
        password: testPassword,
      },
    })
    if (!ownerRes?.user) throw new Error("Failed to create test owner")
    ownerUserId = ownerRes.user.id
    createdUserIds.push(ownerUserId)

    // 2. Create second user to test existing member rejection
    const memberRes = await auth.api.signUpEmail({
      body: {
        name: "Arthur Pendragon",
        email: memberEmail,
        password: testPassword,
      },
    })
    if (!memberRes?.user) throw new Error("Failed to create test member")
    memberUserId = memberRes.user.id
    createdUserIds.push(memberUserId)

    // 3. Create organization with step "team-invitation"
    const org = await db.organization.create({
      data: {
        name: "Roundtable Workflows",
        slug: `roundtable-${testRunId}`,
        onboardingStep: "team-invitation",
        members: {
          create: [
            {
              userId: ownerUserId,
              role: "owner",
            },
            {
              userId: memberUserId,
              role: "editor", // regular editor (cannot invite)
            },
          ],
        },
      },
    })
    testOrgId = org.id
    createdOrgIds.push(testOrgId)

    // 4. Sign in owner to get cookie
    const ownerSignIn = await auth.api.signInEmail({
      body: {
        email: ownerEmail,
        password: testPassword,
      },
      asResponse: true,
    })
    ownerSessionCookie = ownerSignIn.headers.get("set-cookie") || ""

    // 5. Sign in editor to get cookie
    const memberSignIn = await auth.api.signInEmail({
      body: {
        email: memberEmail,
        password: testPassword,
      },
      asResponse: true,
    })
    memberSessionCookie = memberSignIn.headers.get("set-cookie") || ""
  }, 45000)

  afterAll(async () => {
    for (const orgId of createdOrgIds) {
      try {
        await db.organization.delete({ where: { id: orgId } })
      } catch {
        // Ignore cleanup
      }
    }
    for (const userId of createdUserIds) {
      try {
        await db.user.delete({ where: { id: userId } })
      } catch {
        // Ignore cleanup
      }
    }
  }, 30000)

  describe("Validation & Normalization (schemas.ts)", () => {
    it("skips blank email rows cleanly", () => {
      const { validInvites, errors } = validateAndNormalizeInvites([
        { email: "", role: "Editor" },
        { email: "   ", role: "Admin" },
      ])
      expect(errors).toBeUndefined()
      expect(validInvites).toEqual([])
    })

    it("normalizes email to lower case and trims whitespace", () => {
      const { validInvites } = validateAndNormalizeInvites([
        { email: "  TeAmMaTe@CoMpAnY.cOm  ", role: "Editor" },
      ])
      expect(validInvites).toHaveLength(1)
      expect(validInvites[0].email).toBe("teammate@company.com")
      expect(validInvites[0].role).toBe("editor")
    })

    it("normalizes UI role selections (Editor, Admin, Viewer) to lowercase enum", () => {
      const { validInvites } = validateAndNormalizeInvites([
        { email: "user1@company.com", role: "Editor" },
        { email: "user2@company.com", role: "Admin" },
        { email: "user3@company.com", role: "Viewer" },
      ])
      expect(validInvites[0].role).toBe("editor")
      expect(validInvites[1].role).toBe("admin")
      expect(validInvites[2].role).toBe("viewer")
    })

    it("rejects duplicate emails within submission with a validation error", () => {
      const { validInvites, errors } = validateAndNormalizeInvites([
        { email: "alex@company.com", role: "Editor" },
        { email: "alex@company.com", role: "Admin" },
      ])
      expect(validInvites).toHaveLength(0)
      expect(errors).toBeDefined()
      expect(errors?.["invite-1"]).toContain("Duplicate email")
      expect(errors?.["invite-1"]).toContain("alex@company.com")
    })

    it("rejects duplicate emails with whitespace and mixed casing within submission", () => {
      const { validInvites, errors } = validateAndNormalizeInvites([
        { email: "  Taylor@Example.COM  ", role: "Editor" },
        { email: "taylor@example.com", role: "Viewer" },
      ])
      expect(validInvites).toHaveLength(0)
      expect(errors).toBeDefined()
      expect(errors?.["invite-1"]).toContain("Duplicate email")
      expect(errors?.["invite-1"]).toContain("taylor@example.com")
    })

    it("flags invalid email format with error", () => {
      const { validInvites, errors } = validateAndNormalizeInvites([
        { email: "not-an-email", role: "Editor" },
      ])
      expect(validInvites).toHaveLength(0)
      expect(errors).toBeDefined()
      expect(errors?.["invite-0"]).toContain("valid email")
    })

    it("flags invalid role with error", () => {
      const { validInvites, errors } = validateAndNormalizeInvites([
        { email: "valid@company.com", role: "Superuser" },
      ])
      expect(validInvites).toHaveLength(0)
      expect(errors).toBeDefined()
      expect(errors?.["invite-0"]).toContain("Role must be")
    })
  })

  describe("getTeamInvitationsAction", () => {
    it("rejects unauthenticated requests", async () => {
      vi.mocked(nextHeaders.headers).mockResolvedValueOnce(new Headers())
      const result = await getTeamInvitationsAction()
      expect(result.success).toBe(false)
      expect(result.error).toContain("Unauthorized")
    })

    it("generates inviteCode lazily and returns shareable invite link for authenticated owner", async () => {
      const headersMap = new Headers()
      headersMap.set("cookie", ownerSessionCookie)
      headersMap.set("host", "streamline.local")
      vi.mocked(nextHeaders.headers).mockResolvedValueOnce(headersMap)

      const result = await getTeamInvitationsAction()
      expect(result.success).toBe(true)
      expect(result.inviteCode).toBeDefined()
      expect(result.inviteLink).toContain("/join/")
      expect(result.inviteLink).toContain(result.inviteCode)
      expect(result.invitations).toEqual([])

      // Confirm in database that inviteCode was persisted to Organization
      const orgInDb = await db.organization.findUnique({
        where: { id: testOrgId },
        select: { inviteCode: true },
      })
      expect(orgInDb?.inviteCode).toBe(result.inviteCode)
    })

    it("respects x-forwarded-host header over host header when generating invite link", async () => {
      const headersMap = new Headers()
      headersMap.set("cookie", ownerSessionCookie)
      headersMap.set("host", "internal-cluster.local:3000")
      headersMap.set("x-forwarded-host", "app.streamline.io")
      headersMap.set("x-forwarded-proto", "https")
      vi.mocked(nextHeaders.headers).mockResolvedValueOnce(headersMap)

      const result = await getTeamInvitationsAction()
      expect(result.success).toBe(true)
      expect(result.inviteLink).toContain("https://app.streamline.io/join/")
    })
  })

  describe("createTeamInvitationsAction", () => {
    it("rejects unauthenticated requests", async () => {
      vi.mocked(nextHeaders.headers).mockResolvedValueOnce(new Headers())
      const result = await createTeamInvitationsAction({
        invites: [{ email: "test@example.com", role: "Editor" }],
      })
      expect(result.success).toBe(false)
      expect(result.error).toContain("Unauthorized")
    })

    it("rejects non-admin/non-owner members (editor cannot invite)", async () => {
      const headersMap = new Headers()
      headersMap.set("cookie", memberSessionCookie)
      vi.mocked(nextHeaders.headers).mockResolvedValueOnce(headersMap)

      const result = await createTeamInvitationsAction({
        invites: [{ email: "teammate@example.com", role: "Editor" }],
      })
      expect(result.success).toBe(false)
      expect(result.error).toContain("Forbidden")
    })

    it("supports Skip for now: empty invites list advances step to launch without creating rows", async () => {
      const headersMap = new Headers()
      headersMap.set("cookie", ownerSessionCookie)
      vi.mocked(nextHeaders.headers).mockResolvedValueOnce(headersMap)

      const result = await createTeamInvitationsAction({
        invites: [
          { email: "", role: "Editor" },
          { email: "   ", role: "Admin" },
        ],
      })

      expect(result.success).toBe(true)
      expect(result.count).toBe(0)
      expect(result.onboardingStep).toBe("launch")

      // Verify organization in database has onboardingStep = "launch"
      const orgInDb = await db.organization.findUnique({
        where: { id: testOrgId },
        select: { onboardingStep: true },
      })
      expect(orgInDb?.onboardingStep).toBe("launch")

      // Verify no invitations created
      const count = await db.invitation.count({
        where: { organizationId: testOrgId },
      })
      expect(count).toBe(0)
    })

    it("rejects inviting an existing member of the workspace with a clear error", async () => {
      const headersMap = new Headers()
      headersMap.set("cookie", ownerSessionCookie)
      vi.mocked(nextHeaders.headers).mockResolvedValueOnce(headersMap)

      const result = await createTeamInvitationsAction({
        invites: [{ email: memberEmail, role: "Editor" }],
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain(memberEmail)
      expect(result.error).toContain("already a member")
    })

    it("rejects inviting an existing member case-insensitively with uppercase email input", async () => {
      const headersMap = new Headers()
      headersMap.set("cookie", ownerSessionCookie)
      vi.mocked(nextHeaders.headers).mockResolvedValueOnce(headersMap)

      const result = await createTeamInvitationsAction({
        invites: [{ email: memberEmail.toUpperCase(), role: "Viewer" }],
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("already a member")
    })

    it("creates pending invitations with SHA-256 hashed tokens and advances step to launch", async () => {
      const headersMap = new Headers()
      headersMap.set("cookie", ownerSessionCookie)
      vi.mocked(nextHeaders.headers).mockResolvedValueOnce(headersMap)

      const result = await createTeamInvitationsAction({
        invites: [
          { email: editorEmail, role: "Editor" },
          { email: adminEmail, role: "Admin" },
          { email: viewerEmail, role: "Viewer" },
        ],
      })

      expect(result.success).toBe(true)
      expect(result.count).toBe(3)
      expect(result.onboardingStep).toBe("launch")

      // Verify database records
      const savedInvites = await db.invitation.findMany({
        where: { organizationId: testOrgId },
        orderBy: { email: "asc" },
      })

      expect(savedInvites).toHaveLength(3)

      for (const inv of savedInvites) {
        expect(inv.status).toBe("pending")
        expect(inv.inviterId).toBe(ownerUserId)
        expect(inv.token).toHaveLength(64) // 64 hex characters = SHA-256 hash!
        expect(inv.expiresAt.getTime()).toBeGreaterThan(Date.now() + 6 * 24 * 60 * 60 * 1000)
      }

      // Check role mapping
      const editorInv = savedInvites.find((i) => i.email === editorEmail.toLowerCase())
      expect(editorInv?.role).toBe("editor")

      const adminInv = savedInvites.find((i) => i.email === adminEmail.toLowerCase())
      expect(adminInv?.role).toBe("admin")

      const viewerInv = savedInvites.find((i) => i.email === viewerEmail.toLowerCase())
      expect(viewerInv?.role).toBe("viewer")
    })

    it("re-inviting an existing pending email updates the role and refreshes token", async () => {
      // Get previous token hash
      const prevInv = await db.invitation.findFirst({
        where: { organizationId: testOrgId, email: editorEmail.toLowerCase() },
      })
      expect(prevInv?.role).toBe("editor")
      const prevTokenHash = prevInv?.token

      const headersMap = new Headers()
      headersMap.set("cookie", ownerSessionCookie)
      vi.mocked(nextHeaders.headers).mockResolvedValueOnce(headersMap)

      // Update editorEmail to Admin
      const result = await createTeamInvitationsAction({
        invites: [{ email: editorEmail, role: "Admin" }],
      })

      expect(result.success).toBe(true)
      expect(result.count).toBe(1)

      const updatedInv = await db.invitation.findFirst({
        where: { organizationId: testOrgId, email: editorEmail.toLowerCase() },
      })

      expect(updatedInv?.role).toBe("admin")
      expect(updatedInv?.token).not.toBe(prevTokenHash)
      expect(updatedInv?.token).toHaveLength(64)
    })

    it("subsequent getTeamInvitationsAction returns all pending invitations", async () => {
      const headersMap = new Headers()
      headersMap.set("cookie", ownerSessionCookie)
      vi.mocked(nextHeaders.headers).mockResolvedValueOnce(headersMap)

      const result = await getTeamInvitationsAction()
      expect(result.success).toBe(true)
      expect(result.invitations).toBeDefined()
      expect(result.invitations!.length).toBeGreaterThanOrEqual(3)

      const emails = result.invitations!.map((i) => i.email)
      expect(emails).toContain(editorEmail.toLowerCase())
      expect(emails).toContain(adminEmail.toLowerCase())
      expect(emails).toContain(viewerEmail.toLowerCase())
    })

    it("rejects a submission containing duplicate emails with conflicting roles (regression test)", async () => {
      const headersMap = new Headers()
      headersMap.set("cookie", ownerSessionCookie)
      vi.mocked(nextHeaders.headers).mockResolvedValueOnce(headersMap)

      const result = await createTeamInvitationsAction({
        invites: [
          { email: "alex@company.com", role: "Editor" },
          { email: "alex@company.com", role: "Admin" },
        ],
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("Duplicate email")
      expect(result.error).toContain("alex@company.com")
      expect(result.fieldErrors?.["invite-1"]).toBeDefined()

      // Confirm no invitation was created for alex@company.com in database
      const dbInvites = await db.invitation.findMany({
        where: { organizationId: testOrgId, email: "alex@company.com" },
      })
      expect(dbInvites).toHaveLength(0)
    })

    it("skips blank rows mixed with valid rows and persists only valid invites", async () => {
      const mixedEmail = `mixed-valid-${Date.now()}@example.com`
      const headersMap = new Headers()
      headersMap.set("cookie", ownerSessionCookie)
      vi.mocked(nextHeaders.headers).mockResolvedValueOnce(headersMap)

      const result = await createTeamInvitationsAction({
        invites: [
          { email: "   ", role: "Editor" },
          { email: mixedEmail, role: "Viewer" },
          { email: "", role: "Admin" },
        ],
      })

      expect(result.success).toBe(true)
      expect(result.count).toBe(1)
      expect(result.onboardingStep).toBe("launch")

      const mixedInv = await db.invitation.findFirst({
        where: { organizationId: testOrgId, email: mixedEmail.toLowerCase() },
      })
      expect(mixedInv).toBeDefined()
      expect(mixedInv?.role).toBe("viewer")
    })

    it("rejects duplicate emails with different casing in createTeamInvitationsAction", async () => {
      const headersMap = new Headers()
      headersMap.set("cookie", ownerSessionCookie)
      vi.mocked(nextHeaders.headers).mockResolvedValueOnce(headersMap)

      const result = await createTeamInvitationsAction({
        invites: [
          { email: "morgan@company.com", role: "Editor" },
          { email: "  MORGAN@COMPANY.COM  ", role: "Admin" },
        ],
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("Duplicate email")
      expect(result.error).toContain("morgan@company.com")
    })
  })
})
