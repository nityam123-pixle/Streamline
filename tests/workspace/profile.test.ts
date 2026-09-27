import { describe, it, expect, vi, afterAll, beforeAll } from "vitest"
import { workspaceProfileSchema } from "@/lib/workspace/schemas"
import {
  updateWorkspaceProfileAction,
  getWorkspaceProfileAction,
} from "@/actions/workspace"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import * as nextHeaders from "next/headers"

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}))

describe("Workspace Profile Persistence (Feature 4)", () => {
  const createdUserIds: string[] = []
  const createdOrgIds: string[] = []
  const testRunId = Date.now()
  const testEmail = `workspace-owner-${testRunId}@example.com`
  const testPassword = "SecurePassword123!"

  let sessionCookie = ""
  let testUserId = ""
  let testOrgId = ""

  beforeAll(async () => {
    // 1. Create a user via Better Auth
    const signUpRes = await auth.api.signUpEmail({
      body: {
        name: "Arthur Pendragon",
        email: testEmail,
        password: testPassword,
      },
    })

    if (!signUpRes?.user) {
      throw new Error("Failed to create test user for profile persistence test")
    }

    testUserId = signUpRes.user.id
    createdUserIds.push(testUserId)

    // 2. Create organization and member
    const org = await db.organization.create({
      data: {
        name: "Arthur Pendragon's Workspace",
        slug: `arthur-${testRunId}`,
        onboardingStep: "welcome",
        members: {
          create: {
            userId: testUserId,
            role: "owner",
          },
        },
      },
    })

    testOrgId = org.id
    createdOrgIds.push(testOrgId)

    // 3. Sign in to obtain session cookie
    const signInRes = await auth.api.signInEmail({
      body: {
        email: testEmail,
        password: testPassword,
      },
      asResponse: true,
    })

    const cookieHeader = signInRes.headers.get("set-cookie") || ""
    sessionCookie = cookieHeader
  })

  afterAll(async () => {
    for (const orgId of createdOrgIds) {
      try {
        await db.organization.delete({ where: { id: orgId } })
      } catch {
        // Ignore cleanup errors
      }
    }
    for (const userId of createdUserIds) {
      try {
        await db.user.delete({ where: { id: userId } })
      } catch {
        // Ignore cleanup errors
      }
    }
  })

  describe("workspaceProfileSchema validation", () => {
    it("validates valid workspace profile payload", () => {
      const valid = {
        firstName: "Arthur",
        lastName: "Pendragon",
        companyName: "Camelot Technologies",
        role: "Founder / CEO",
        teamSize: "11-50 people",
      }
      const result = workspaceProfileSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it("rejects missing or empty first name", () => {
      const invalid = {
        firstName: "  ",
        lastName: "Pendragon",
        companyName: "Camelot Technologies",
        role: "Founder / CEO",
        teamSize: "11-50 people",
      }
      const result = workspaceProfileSchema.safeParse(invalid)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("firstName"))).toBe(true)
      }
    })

    it("rejects missing or empty company name", () => {
      const invalid = {
        firstName: "Arthur",
        lastName: "Pendragon",
        companyName: "",
        role: "Founder / CEO",
        teamSize: "11-50 people",
      }
      const result = workspaceProfileSchema.safeParse(invalid)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("companyName"))).toBe(true)
      }
    })

    it("rejects missing role selection", () => {
      const invalid = {
        firstName: "Arthur",
        lastName: "Pendragon",
        companyName: "Camelot Technologies",
        role: "",
        teamSize: "11-50 people",
      }
      const result = workspaceProfileSchema.safeParse(invalid)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("role"))).toBe(true)
      }
    })

    it("rejects missing team size selection", () => {
      const invalid = {
        firstName: "Arthur",
        lastName: "Pendragon",
        companyName: "Camelot Technologies",
        role: "Founder / CEO",
        teamSize: "",
      }
      const result = workspaceProfileSchema.safeParse(invalid)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("teamSize"))).toBe(true)
      }
    })

    it("trims whitespace from text inputs", () => {
      const input = {
        firstName: "  Arthur  ",
        lastName: "  Pendragon  ",
        companyName: "  Camelot Technologies  ",
        role: "  Founder / CEO  ",
        teamSize: "  11-50 people  ",
      }
      const result = workspaceProfileSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.firstName).toBe("Arthur")
        expect(result.data.lastName).toBe("Pendragon")
        expect(result.data.companyName).toBe("Camelot Technologies")
      }
    })
  })

  describe("getWorkspaceProfileAction", () => {
    it("rejects unauthenticated request", async () => {
      vi.mocked(nextHeaders.headers).mockResolvedValue(new Headers() as any)

      const result = await getWorkspaceProfileAction()
      expect(result.success).toBe(false)
      expect(result.error).toContain("Unauthorized")
    })

    it("preloads profile with first and last name from session for authenticated owner", async () => {
      vi.mocked(nextHeaders.headers).mockResolvedValue(
        new Headers({ cookie: sessionCookie }) as any
      )

      const result = await getWorkspaceProfileAction()
      expect(result.success).toBe(true)
      expect(result.profile).toBeDefined()
      expect(result.profile?.firstName).toBe("Arthur")
      expect(result.profile?.lastName).toBe("Pendragon")
      // Default generated name "Arthur Pendragon's Workspace" is treated as empty for company placeholder
      expect(result.profile?.companyName).toBe("")
    })
  })

  describe("updateWorkspaceProfileAction", () => {
    it("rejects unauthenticated caller", async () => {
      vi.mocked(nextHeaders.headers).mockResolvedValue(new Headers() as any)

      const result = await updateWorkspaceProfileAction({
        firstName: "Arthur",
        lastName: "Pendragon",
        companyName: "Camelot",
        role: "Founder / CEO",
        teamSize: "11-50 people",
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("Unauthorized")
    })

    it("returns validation failure for invalid payload", async () => {
      vi.mocked(nextHeaders.headers).mockResolvedValue(
        new Headers({ cookie: sessionCookie }) as any
      )

      const result = await updateWorkspaceProfileAction({
        firstName: "",
        lastName: "",
        companyName: "",
        role: "",
        teamSize: "",
      })

      expect(result.success).toBe(false)
      expect(result.fieldErrors).toBeDefined()
      expect(result.fieldErrors?.firstName).toBeDefined()
      expect(result.fieldErrors?.companyName).toBeDefined()
    })

    it("persists user name, company name, team size, jobTitle, and advances step to automation", async () => {
      vi.mocked(nextHeaders.headers).mockResolvedValue(
        new Headers({ cookie: sessionCookie }) as any
      )

      const updatePayload = {
        firstName: "King",
        lastName: "Arthur",
        companyName: "Round Table Inc.",
        role: "Founder / CEO",
        teamSize: "11-50 people",
      }

      const result = await updateWorkspaceProfileAction(updatePayload)
      expect(result.success).toBe(true)
      expect(result.user?.firstName).toBe("King")
      expect(result.user?.lastName).toBe("Arthur")
      expect(result.user?.fullName).toBe("King Arthur")
      expect(result.organization?.name).toBe("Round Table Inc.")
      expect(result.organization?.teamSize).toBe("11-50 people")
      expect(result.organization?.onboardingStep).toBe("automation")

      // Verify in Neon PostgreSQL database
      const dbUser = await db.user.findUnique({
        where: { id: testUserId },
      })
      expect(dbUser?.firstName).toBe("King")
      expect(dbUser?.lastName).toBe("Arthur")
      expect(dbUser?.name).toBe("King Arthur")

      const dbOrg = await db.organization.findUnique({
        where: { id: testOrgId },
      })
      expect(dbOrg?.name).toBe("Round Table Inc.")
      expect(dbOrg?.teamSize).toBe("11-50 people")
      expect(dbOrg?.onboardingStep).toBe("automation")

      const dbMember = await db.member.findFirst({
        where: { organizationId: testOrgId, userId: testUserId },
      })
      expect(dbMember?.jobTitle).toBe("Founder / CEO")
      expect(dbMember?.role).toBe("owner")
    })

    it("subsequent getWorkspaceProfileAction returns the persisted profile", async () => {
      vi.mocked(nextHeaders.headers).mockResolvedValue(
        new Headers({ cookie: sessionCookie }) as any
      )

      const result = await getWorkspaceProfileAction()
      expect(result.success).toBe(true)
      expect(result.profile?.firstName).toBe("King")
      expect(result.profile?.lastName).toBe("Arthur")
      expect(result.profile?.companyName).toBe("Round Table Inc.")
      expect(result.profile?.role).toBe("Founder / CEO")
      expect(result.profile?.teamSize).toBe("11-50 people")
    })
  })
})
