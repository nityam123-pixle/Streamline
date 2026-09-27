import { describe, it, expect, vi, afterAll, beforeAll } from "vitest"
import { automationPreferencesSchema } from "@/lib/automation/schemas"
import {
  updateAutomationPreferencesAction,
  getAutomationPreferencesAction,
} from "@/actions/automation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import * as nextHeaders from "next/headers"

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}))

describe("Automation Preferences Persistence (Feature 5)", () => {
  const createdUserIds: string[] = []
  const createdOrgIds: string[] = []
  const testRunId = Date.now()
  const testEmail = `automation-owner-${testRunId}@example.com`
  const testPassword = "SecurePassword123!"

  let sessionCookie = ""
  let testUserId = ""
  let testOrgId = ""

  beforeAll(async () => {
    // 1. Create a user via Better Auth
    const signUpRes = await auth.api.signUpEmail({
      body: {
        name: "Guinevere Pendragon",
        email: testEmail,
        password: testPassword,
      },
    })

    if (!signUpRes?.user) {
      throw new Error("Failed to create test user for automation persistence test")
    }

    testUserId = signUpRes.user.id
    createdUserIds.push(testUserId)

    // 2. Create organization and member with step "automation"
    const org = await db.organization.create({
      data: {
        name: "Camelot Automations",
        slug: `guinevere-${testRunId}`,
        onboardingStep: "automation",
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

  describe("automationPreferencesSchema validation", () => {
    it("validates single automation area selection", () => {
      const valid = {
        automationAreas: ["sales"],
      }
      const result = automationPreferencesSchema.safeParse(valid)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.automationAreas).toEqual(["sales"])
      }
    })

    it("validates multiple automation area selections", () => {
      const valid = {
        automationAreas: ["sales", "marketing", "data"],
      }
      const result = automationPreferencesSchema.safeParse(valid)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.automationAreas).toEqual(["sales", "marketing", "data"])
      }
    })

    it("rejects empty automation areas array", () => {
      const invalid = {
        automationAreas: [],
      }
      const result = automationPreferencesSchema.safeParse(invalid)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Please select at least one automation area")
      }
    })

    it("rejects invalid automation area identifiers", () => {
      const invalid = {
        automationAreas: ["sales", "invalid_area_id"],
      }
      const result = automationPreferencesSchema.safeParse(invalid)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("One or more selected automation areas are invalid")
      }
    })

    it("trims whitespace from area strings", () => {
      const input = {
        automationAreas: ["  support  ", " finance "],
      }
      const result = automationPreferencesSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.automationAreas).toEqual(["support", "finance"])
      }
    })
  })

  describe("getAutomationPreferencesAction", () => {
    it("rejects unauthenticated request", async () => {
      vi.mocked(nextHeaders.headers).mockResolvedValue(new Headers())
      const res = await getAutomationPreferencesAction()
      expect(res.success).toBe(false)
      expect(res.error).toContain("Unauthorized")
    })

    it("preloads empty list when no preferences have been saved yet", async () => {
      const headers = new Headers()
      headers.set("cookie", sessionCookie)
      vi.mocked(nextHeaders.headers).mockResolvedValue(headers)

      const res = await getAutomationPreferencesAction()
      expect(res.success).toBe(true)
      expect(res.automationAreas).toEqual([])
    })
  })

  describe("updateAutomationPreferencesAction", () => {
    it("rejects unauthenticated caller", async () => {
      vi.mocked(nextHeaders.headers).mockResolvedValue(new Headers())
      const res = await updateAutomationPreferencesAction({
        automationAreas: ["sales"],
      })
      expect(res.success).toBe(false)
      expect(res.error).toContain("Unauthorized")
    })

    it("returns validation failure for invalid payload", async () => {
      const headers = new Headers()
      headers.set("cookie", sessionCookie)
      vi.mocked(nextHeaders.headers).mockResolvedValue(headers)

      const res = await updateAutomationPreferencesAction({
        automationAreas: [],
      })
      expect(res.success).toBe(false)
      expect(res.error).toBe("Please select at least one automation area")
      expect(res.fieldErrors?.automationAreas).toBeDefined()
    })

    it("persists automation areas, advances step to tools, and returns updated organization", async () => {
      const headers = new Headers()
      headers.set("cookie", sessionCookie)
      vi.mocked(nextHeaders.headers).mockResolvedValue(headers)

      const res = await updateAutomationPreferencesAction({
        automationAreas: ["sales", "marketing", "finance"],
      })

      expect(res.success).toBe(true)
      expect(res.organization).toBeDefined()
      expect(res.organization?.automationAreas).toEqual(["sales", "marketing", "finance"])
      expect(res.organization?.onboardingStep).toBe("tools")

      // Verify in live database
      const dbOrg = await db.organization.findUnique({
        where: { id: testOrgId },
      })
      expect(dbOrg?.onboardingStep).toBe("tools")
      expect(dbOrg?.automationAreas).toEqual(["sales", "marketing", "finance"])
    })

    it("subsequent getAutomationPreferencesAction returns the persisted areas", async () => {
      const headers = new Headers()
      headers.set("cookie", sessionCookie)
      vi.mocked(nextHeaders.headers).mockResolvedValue(headers)

      const res = await getAutomationPreferencesAction()
      expect(res.success).toBe(true)
      expect(res.automationAreas).toEqual(["sales", "marketing", "finance"])
    })
  })
})
