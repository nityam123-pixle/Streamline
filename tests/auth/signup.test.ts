import { describe, it, expect, afterAll } from "vitest"
import { signUpAction } from "@/actions/auth"
import { signUpSchema } from "@/lib/auth/schemas"
import { db } from "@/lib/db"

describe("Owner Signup and Workspace Creation (Feature 3)", () => {
  const createdUserIds: string[] = []
  const createdOrgIds: string[] = []
  const testRunId = Date.now()

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

  describe("signUpSchema validation rules", () => {
    it("validates correct registration inputs", () => {
      const validData = {
        fullName: "Jane Doe",
        email: "jane@company.com",
        password: "securePassword123",
        confirmPassword: "securePassword123",
        agreeTerms: true,
      }
      const result = signUpSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("rejects missing or empty full name", () => {
      const invalidData = {
        fullName: "   ",
        email: "jane@company.com",
        password: "securePassword123",
        confirmPassword: "securePassword123",
        agreeTerms: true,
      }
      const result = signUpSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("fullName"))).toBe(true)
      }
    })

    it("rejects invalid email formats", () => {
      const invalidData = {
        fullName: "Jane Doe",
        email: "not-an-email",
        password: "securePassword123",
        confirmPassword: "securePassword123",
        agreeTerms: true,
      }
      const result = signUpSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("email"))).toBe(true)
      }
    })

    it("rejects password shorter than 8 characters", () => {
      const invalidData = {
        fullName: "Jane Doe",
        email: "jane@company.com",
        password: "short",
        confirmPassword: "short",
        agreeTerms: true,
      }
      const result = signUpSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("password"))).toBe(true)
      }
    })

    it("rejects mismatched confirm password", () => {
      const invalidData = {
        fullName: "Jane Doe",
        email: "jane@company.com",
        password: "securePassword123",
        confirmPassword: "differentPassword123",
        agreeTerms: true,
      }
      const result = signUpSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("confirmPassword"))).toBe(true)
      }
    })

    it("rejects when terms of service are not agreed to", () => {
      const invalidData = {
        fullName: "Jane Doe",
        email: "jane@company.com",
        password: "securePassword123",
        confirmPassword: "securePassword123",
        agreeTerms: false,
      }
      const result = signUpSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("agreeTerms"))).toBe(true)
      }
    })

    it("rejects full name exceeding 100 characters", () => {
      const invalidData = {
        fullName: "A".repeat(101),
        email: "jane@company.com",
        password: "securePassword123",
        confirmPassword: "securePassword123",
        agreeTerms: true,
      }
      const result = signUpSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("fullName"))).toBe(true)
      }
    })

    it("trims whitespace from full name and email", () => {
      const validData = {
        fullName: "   Jane Doe   ",
        email: "   jane@company.com   ",
        password: "securePassword123",
        confirmPassword: "securePassword123",
        agreeTerms: true,
      }
      const result = signUpSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.fullName).toBe("Jane Doe")
        expect(result.data.email).toBe("jane@company.com")
      }
    })
  })

  describe("signUpAction server mutation", () => {
    const signupEmail = `owner-${testRunId}@example.com`
    const signupPassword = "SecureOwnerPass123!"

    it("returns validation failure for invalid payload without querying database", async () => {
      const result = await signUpAction({
        fullName: "",
        email: "bad-email",
        password: "123",
        confirmPassword: "456",
        agreeTerms: false,
      })

      expect(result.success).toBe(false)
      expect(result.fieldErrors).toBeDefined()
      expect(result.fieldErrors?.fullName).toBeDefined()
    })

    it("creates owner account, initial workspace, and owner role membership", async () => {
      const result = await signUpAction({
        fullName: "Sarah Connor",
        email: signupEmail,
        password: signupPassword,
        confirmPassword: signupPassword,
        agreeTerms: true,
      })

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user?.email).toBe(signupEmail)
      expect(result.user?.fullName).toBe("Sarah Connor")
      expect(result.user?.firstName).toBe("Sarah")
      expect(result.user?.lastName).toBe("Connor")

      expect(result.organization).toBeDefined()
      expect(result.organization?.name).toBe("Sarah Connor's Workspace")
      expect(result.organization?.slug).toBeDefined()

      if (result.user) createdUserIds.push(result.user.id)
      if (result.organization) createdOrgIds.push(result.organization.id)

      // Verify in database: user record and first/last name
      const dbUser = await db.user.findUnique({
        where: { id: result.user?.id },
      })
      expect(dbUser).not.toBeNull()
      expect(dbUser?.firstName).toBe("Sarah")
      expect(dbUser?.lastName).toBe("Connor")

      // Verify in database: organization record
      const dbOrg = await db.organization.findUnique({
        where: { id: result.organization?.id },
        include: { members: true },
      })
      expect(dbOrg).not.toBeNull()
      expect(dbOrg?.onboardingStep).toBe("welcome")

      // Verify in database: owner membership
      expect(dbOrg?.members.length).toBe(1)
      expect(dbOrg?.members[0].userId).toBe(result.user?.id)
      expect(dbOrg?.members[0].role).toBe("owner")
    })

    it("rejects duplicate registration with the same email", async () => {
      const result = await signUpAction({
        fullName: "Duplicate User",
        email: signupEmail,
        password: "AnotherPassword123!",
        confirmPassword: "AnotherPassword123!",
        agreeTerms: true,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("already exists")
    })

    it("handles identical user names without slug collision", async () => {
      const email1 = `john-a-${testRunId}@example.com`
      const email2 = `john-b-${testRunId}@example.com`
      const password = "ValidPassword123!"

      const res1 = await signUpAction({
        fullName: "John Doe",
        email: email1,
        password,
        confirmPassword: password,
        agreeTerms: true,
      })

      const res2 = await signUpAction({
        fullName: "John Doe",
        email: email2,
        password,
        confirmPassword: password,
        agreeTerms: true,
      })

      expect(res1.success).toBe(true)
      expect(res2.success).toBe(true)
      expect(res1.organization?.slug).toBeDefined()
      expect(res2.organization?.slug).toBeDefined()
      expect(res1.organization?.slug).not.toBe(res2.organization?.slug)

      if (res1.user) createdUserIds.push(res1.user.id)
      if (res2.user) createdUserIds.push(res2.user.id)
      if (res1.organization) createdOrgIds.push(res1.organization.id)
      if (res2.organization) createdOrgIds.push(res2.organization.id)
    })

    it("derives first and last name correctly for single word names", async () => {
      const singleWordEmail = `single-${testRunId}@example.com`
      const password = "ValidPassword123!"

      const res = await signUpAction({
        fullName: "Madonna",
        email: singleWordEmail,
        password,
        confirmPassword: password,
        agreeTerms: true,
      })

      expect(res.success).toBe(true)
      expect(res.user?.firstName).toBe("Madonna")
      expect(res.user?.lastName).toBe("")
      expect(res.organization?.name).toBe("Madonna's Workspace")

      if (res.user) createdUserIds.push(res.user.id)
      if (res.organization) createdOrgIds.push(res.organization.id)

      const dbUser = await db.user.findUnique({
        where: { id: res.user?.id },
      })
      expect(dbUser?.firstName).toBe("Madonna")
      expect(dbUser?.lastName).toBeNull()
    })
  })
})
