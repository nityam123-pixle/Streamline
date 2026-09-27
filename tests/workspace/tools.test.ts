import { describe, it, expect, vi, afterAll, beforeAll } from "vitest"
import { selectedToolsSchema } from "@/lib/tools/schemas"
import { getToolsAction, updateToolsAction } from "@/actions/tools"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import * as nextHeaders from "next/headers"

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}))

describe("Selected Tools Persistence (Feature 6)", () => {
  const createdUserIds: string[] = []
  const createdOrgIds: string[] = []
  const testRunId = Date.now()
  const testEmail = `tools-owner-${testRunId}@example.com`
  const testPassword = "SecurePassword123!"

  let sessionCookie = ""
  let testUserId = ""
  let testOrgId = ""

  beforeAll(async () => {
    // 1. Create a user via Better Auth
    const signUpRes = await auth.api.signUpEmail({
      body: {
        name: "Lancelot Du Lac",
        email: testEmail,
        password: testPassword,
      },
    })

    if (!signUpRes?.user) {
      throw new Error("Failed to create test user for tools persistence test")
    }

    testUserId = signUpRes.user.id
    createdUserIds.push(testUserId)

    // 2. Create organization and member with step "tools"
    const org = await db.organization.create({
      data: {
        name: "Camelot Automations & Tools",
        slug: `lancelot-${testRunId}`,
        onboardingStep: "tools",
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

  describe("selectedToolsSchema validation", () => {
    it("validates empty tools array (Skip for now flow)", () => {
      const valid = {
        selectedTools: [],
      }
      const result = selectedToolsSchema.safeParse(valid)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.selectedTools).toEqual([])
      }
    })

    it("validates single tool selection", () => {
      const valid = {
        selectedTools: ["slack"],
      }
      const result = selectedToolsSchema.safeParse(valid)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.selectedTools).toEqual(["slack"])
      }
    })

    it("validates multiple tool selections", () => {
      const valid = {
        selectedTools: ["hubspot", "slack", "stripe"],
      }
      const result = selectedToolsSchema.safeParse(valid)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.selectedTools).toEqual(["hubspot", "slack", "stripe"])
      }
    })

    it("rejects invalid tool identifiers", () => {
      const invalid = {
        selectedTools: ["slack", "unknown_tool"],
      }
      const result = selectedToolsSchema.safeParse(invalid)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "One or more selected tools are invalid"
        )
      }
    })

    it("trims whitespace from tool identifiers", () => {
      const input = {
        selectedTools: ["  slack  ", " notion "],
      }
      const result = selectedToolsSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.selectedTools).toEqual(["slack", "notion"])
      }
    })
  })

  describe("getToolsAction", () => {
    it("rejects unauthenticated request", async () => {
      vi.mocked(nextHeaders.headers).mockResolvedValue(new Headers())
      const res = await getToolsAction()
      expect(res.success).toBe(false)
      expect(res.error).toContain("Unauthorized")
    })

    it("preloads empty list when no tools have been saved yet", async () => {
      const headers = new Headers()
      headers.set("cookie", sessionCookie)
      vi.mocked(nextHeaders.headers).mockResolvedValue(headers)

      const res = await getToolsAction()
      expect(res.success).toBe(true)
      expect(res.selectedTools).toEqual([])
    })
  })

  describe("updateToolsAction", () => {
    it("rejects unauthenticated caller", async () => {
      vi.mocked(nextHeaders.headers).mockResolvedValue(new Headers())
      const res = await updateToolsAction({
        selectedTools: ["slack"],
      })
      expect(res.success).toBe(false)
      expect(res.error).toContain("Unauthorized")
    })

    it("returns validation failure for invalid payload", async () => {
      const headers = new Headers()
      headers.set("cookie", sessionCookie)
      vi.mocked(nextHeaders.headers).mockResolvedValue(headers)

      const res = await updateToolsAction({
        selectedTools: ["non_existent_tool"],
      })
      expect(res.success).toBe(false)
      expect(res.error).toBe("One or more selected tools are invalid")
      expect(res.fieldErrors?.selectedTools).toBeDefined()
    })

    it("persists selected tools, advances step to team-invitation, and returns updated organization", async () => {
      const headers = new Headers()
      headers.set("cookie", sessionCookie)
      vi.mocked(nextHeaders.headers).mockResolvedValue(headers)

      const res = await updateToolsAction({
        selectedTools: ["slack", "notion", "stripe"],
      })

      expect(res.success).toBe(true)
      expect(res.organization).toBeDefined()
      expect(res.organization?.selectedTools).toEqual(["slack", "notion", "stripe"])
      expect(res.organization?.onboardingStep).toBe("team-invitation")

      // Verify in live database
      const dbOrg = await db.organization.findUnique({
        where: { id: testOrgId },
      })
      expect(dbOrg?.onboardingStep).toBe("team-invitation")
      expect(dbOrg?.selectedTools).toEqual(["slack", "notion", "stripe"])
    })

    it("supports empty selected tools array for Skip for now", async () => {
      const headers = new Headers()
      headers.set("cookie", sessionCookie)
      vi.mocked(nextHeaders.headers).mockResolvedValue(headers)

      const res = await updateToolsAction({
        selectedTools: [],
      })

      expect(res.success).toBe(true)
      expect(res.organization?.selectedTools).toEqual([])
      expect(res.organization?.onboardingStep).toBe("team-invitation")

      const dbOrg = await db.organization.findUnique({
        where: { id: testOrgId },
      })
      expect(dbOrg?.selectedTools).toEqual([])
      expect(dbOrg?.onboardingStep).toBe("team-invitation")
    })

    it("subsequent getToolsAction returns the persisted tools", async () => {
      const headers = new Headers()
      headers.set("cookie", sessionCookie)
      vi.mocked(nextHeaders.headers).mockResolvedValue(headers)

      // Set tools again
      await updateToolsAction({
        selectedTools: ["hubspot", "salesforce"],
      })

      const res = await getToolsAction()
      expect(res.success).toBe(true)
      expect(res.selectedTools).toEqual(["hubspot", "salesforce"])
    })
  })
})
