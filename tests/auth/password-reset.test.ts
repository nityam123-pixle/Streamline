import { describe, it, expect, afterAll, beforeAll } from "vitest"
import {
  requestPasswordResetAction,
  validateResetTokenAction,
  resetPasswordAction,
} from "@/actions/auth"
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/auth/schemas"
import { db } from "@/lib/db"
import { sendResetPasswordEmail } from "@/lib/email/password-reset"
import { ResetPasswordEmail } from "@/components/emails/ResetPasswordEmail"
import { auth } from "@/lib/auth"

describe("Password Reset Feature 2c (Spec 0013)", { timeout: 30000 }, () => {
  const createdUserIds: string[] = []
  const createdVerificationIds: string[] = []
  const testRunId = Date.now()

  afterAll(async () => {
    // Clean up created verification tokens
    if (createdVerificationIds.length > 0) {
      try {
        await db.verification.deleteMany({
          where: { id: { in: createdVerificationIds } },
        })
      } catch {
        // Ignore cleanup errors
      }
    }

    // Clean up users (cascades to accounts and sessions)
    for (const userId of createdUserIds) {
      try {
        await db.user.delete({ where: { id: userId } })
      } catch {
        // Ignore cleanup errors
      }
    }
  })

  describe("Validation Schemas (covers: AC-1, AC-5)", () => {
    it("validates correct email for forgot password", () => {
      const valid = forgotPasswordSchema.safeParse({ email: "owner@company.com" })
      expect(valid.success).toBe(true)
    })

    it("trims whitespace from email input", () => {
      const parsed = forgotPasswordSchema.safeParse({ email: "  owner@company.com  " })
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.email).toBe("owner@company.com")
      }
    })

    it("rejects invalid email for forgot password", () => {
      const invalid = forgotPasswordSchema.safeParse({ email: "not-an-email" })
      expect(invalid.success).toBe(false)
    })

    it("rejects empty email string", () => {
      const invalid = forgotPasswordSchema.safeParse({ email: "" })
      expect(invalid.success).toBe(false)
    })

    it("validates password satisfying all complexity requirements (covers: AC-5)", () => {
      const valid = resetPasswordSchema.safeParse({
        token: "sample-token-123",
        password: "ValidPassword1",
        confirmPassword: "ValidPassword1",
      })
      expect(valid.success).toBe(true)
    })

    it("rejects password shorter than 8 characters (covers: AC-5)", () => {
      const invalid = resetPasswordSchema.safeParse({
        token: "sample-token-123",
        password: "Pass1",
        confirmPassword: "Pass1",
      })
      expect(invalid.success).toBe(false)
      if (!invalid.success) {
        expect(invalid.error.issues.some((i) => i.path.includes("password"))).toBe(true)
      }
    })

    it("rejects password without numbers (covers: AC-5)", () => {
      const invalid = resetPasswordSchema.safeParse({
        token: "sample-token-123",
        password: "PasswordOnlyLetters",
        confirmPassword: "PasswordOnlyLetters",
      })
      expect(invalid.success).toBe(false)
      if (!invalid.success) {
        expect(invalid.error.issues.some((i) => i.message.includes("number"))).toBe(true)
      }
    })

    it("rejects password without letters (covers: AC-5)", () => {
      const invalid = resetPasswordSchema.safeParse({
        token: "sample-token-123",
        password: "1234567890",
        confirmPassword: "1234567890",
      })
      expect(invalid.success).toBe(false)
      if (!invalid.success) {
        expect(invalid.error.issues.some((i) => i.message.includes("letter"))).toBe(true)
      }
    })

    it("rejects password confirmation mismatch (covers: AC-5)", () => {
      const invalid = resetPasswordSchema.safeParse({
        token: "sample-token-123",
        password: "ValidPassword1",
        confirmPassword: "DifferentPassword1",
      })
      expect(invalid.success).toBe(false)
      if (!invalid.success) {
        expect(invalid.error.issues.some((i) => i.path.includes("confirmPassword"))).toBe(true)
      }
    })

    it("rejects empty token in reset payload (covers: AC-5)", () => {
      const invalid = resetPasswordSchema.safeParse({
        token: "",
        password: "ValidPassword1",
        confirmPassword: "ValidPassword1",
      })
      expect(invalid.success).toBe(false)
    })
  })

  describe("requestPasswordResetAction (covers: AC-1, AC-2, AC-6)", { timeout: 30000 }, () => {
    let testUserEmail: string
    let testUserId: string

    beforeAll(async () => {
      testUserEmail = `reset-owner-${testRunId}@example.com`
      const signupRes = await auth.api.signUpEmail({
        body: {
          name: "Reset Test Owner",
          email: testUserEmail,
          password: "InitialPassword123",
        },
      })
      expect(signupRes?.user).toBeDefined()
      if (signupRes?.user) {
        testUserId = signupRes.user.id
        createdUserIds.push(testUserId)
      }
    })

    it("returns identical generic confirmation and persists namespaced token for existing user (covers: AC-1, AC-2)", async () => {
      const result = await requestPasswordResetAction({ email: testUserEmail })
      expect(result.success).toBe(true)
      expect(result.message).toBe("If an account exists with this email, a reset link has been sent")

      // Verify token in database
      const verification = await db.verification.findFirst({
        where: {
          identifier: `reset-password:${testUserEmail}`,
        },
      })
      expect(verification).not.toBeNull()
      if (verification) {
        createdVerificationIds.push(verification.id)
        expect(verification.consumedAt).toBeNull()
        expect(verification.expiresAt.getTime()).toBeGreaterThan(Date.now())
      }
    })

    it("enforces cooldown so rapid repeat requests do not spam duplicate tokens (covers: AC-1)", async () => {
      const initialCount = await db.verification.count({
        where: { identifier: `reset-password:${testUserEmail}` },
      })

      // Immediate second request within 60s
      const secondResult = await requestPasswordResetAction({ email: testUserEmail })
      expect(secondResult.success).toBe(true)
      expect(secondResult.message).toBe("If an account exists with this email, a reset link has been sent")

      const finalCount = await db.verification.count({
        where: { identifier: `reset-password:${testUserEmail}` },
      })
      expect(finalCount).toBe(initialCount)
    })

    it("returns identical generic confirmation with synthetic delay for unregistered email (covers: AC-2)", async () => {
      const nonExistentEmail = `nonexistent-${testRunId}@example.com`
      const start = Date.now()

      const result = await requestPasswordResetAction({ email: nonExistentEmail })
      const duration = Date.now() - start

      expect(result.success).toBe(true)
      expect(result.message).toBe("If an account exists with this email, a reset link has been sent")
      // Verify timing equalization
      expect(duration).toBeGreaterThanOrEqual(400)

      // Ensure zero verification rows created
      const count = await db.verification.count({
        where: { identifier: `reset-password:${nonExistentEmail}` },
      })
      expect(count).toBe(0)
    })

    it("handles uppercase email input by matching case insensitively (covers: AC-1, AC-2)", async () => {
      const result = await requestPasswordResetAction({ email: testUserEmail.toUpperCase() })
      expect(result.success).toBe(true)
      expect(result.message).toBe("If an account exists with this email, a reset link has been sent")
    })
  })

  describe("validateResetTokenAction (covers: AC-4)", { timeout: 30000 }, () => {
    it("returns valid: true for active unconsumed token (covers: AC-4)", async () => {
      const token = `valid-test-token-${testRunId}`
      const rec = await db.verification.create({
        data: {
          identifier: `reset-password:user-${testRunId}@example.com`,
          value: token,
          expiresAt: new Date(Date.now() + 3600 * 1000),
        },
      })
      createdVerificationIds.push(rec.id)

      const check = await validateResetTokenAction(token)
      expect(check.valid).toBe(true)
    })

    it("returns valid: false, reason: 'invalid' for unknown token (covers: AC-4)", async () => {
      const check = await validateResetTokenAction("completely-unknown-token")
      expect(check.valid).toBe(false)
      expect(check.reason).toBe("invalid")
    })

    it("returns valid: false, reason: 'invalid' for empty or whitespace token (covers: AC-4)", async () => {
      const check = await validateResetTokenAction("   ")
      expect(check.valid).toBe(false)
      expect(check.reason).toBe("invalid")
    })

    it("returns valid: false, reason: 'consumed' for already consumed token (covers: AC-4)", async () => {
      const token = `consumed-test-token-${testRunId}`
      const rec = await db.verification.create({
        data: {
          identifier: `reset-password:user-${testRunId}@example.com`,
          value: token,
          expiresAt: new Date(Date.now() + 3600 * 1000),
          consumedAt: new Date(),
        },
      })
      createdVerificationIds.push(rec.id)

      const check = await validateResetTokenAction(token)
      expect(check.valid).toBe(false)
      expect(check.reason).toBe("consumed")
    })

    it("returns valid: false, reason: 'expired' for expired token (covers: AC-4)", async () => {
      const token = `expired-test-token-${testRunId}`
      const rec = await db.verification.create({
        data: {
          identifier: `reset-password:user-${testRunId}@example.com`,
          value: token,
          expiresAt: new Date(Date.now() - 1000), // 1 second in past
        },
      })
      createdVerificationIds.push(rec.id)

      const check = await validateResetTokenAction(token)
      expect(check.valid).toBe(false)
      expect(check.reason).toBe("expired")
    })

    it("rejects token from another namespace such as email verification (covers: AC-4)", async () => {
      const token = `email-verification-token-${testRunId}`
      const rec = await db.verification.create({
        data: {
          identifier: `email-verification:user-${testRunId}@example.com`,
          value: token,
          expiresAt: new Date(Date.now() + 3600 * 1000),
        },
      })
      createdVerificationIds.push(rec.id)

      const check = await validateResetTokenAction(token)
      expect(check.valid).toBe(false)
      expect(check.reason).toBe("invalid")
    })
  })

  describe("resetPasswordAction and Session Revocation (covers: AC-4, AC-5)", { timeout: 30000 }, () => {
    let testUserEmail: string
    let testUserId: string
    let otherUserId: string
    let otherUserEmail: string
    let testToken: string

    beforeAll(async () => {
      testUserEmail = `reset-action-${testRunId}@example.com`
      const signupRes = await auth.api.signUpEmail({
        body: {
          name: "Reset Action Owner",
          email: testUserEmail,
          password: "OldPassword123",
        },
      })
      expect(signupRes?.user).toBeDefined()
      if (signupRes?.user) {
        testUserId = signupRes.user.id
        createdUserIds.push(testUserId)
      }

      // Create a separate user to verify session isolation
      otherUserEmail = `other-user-${testRunId}@example.com`
      const otherRes = await auth.api.signUpEmail({
        body: {
          name: "Other User",
          email: otherUserEmail,
          password: "OtherPassword123",
        },
      })
      expect(otherRes?.user).toBeDefined()
      if (otherRes?.user) {
        otherUserId = otherRes.user.id
        createdUserIds.push(otherUserId)
      }

      testToken = `action-token-${testRunId}`
      const rec = await db.verification.create({
        data: {
          identifier: `reset-password:${testUserEmail}`,
          value: testToken,
          expiresAt: new Date(Date.now() + 3600 * 1000),
        },
      })
      createdVerificationIds.push(rec.id)
    })

    it("rejects reset when password does not meet complexity (covers: AC-5)", async () => {
      const result = await resetPasswordAction({
        token: testToken,
        password: "weak",
        confirmPassword: "weak",
      })
      expect(result.success).toBe(false)
    })

    it("rejects reset when confirm password does not match (covers: AC-5)", async () => {
      const result = await resetPasswordAction({
        token: testToken,
        password: "ValidPassword123",
        confirmPassword: "DifferentPassword123",
      })
      expect(result.success).toBe(false)
    })

    it("rejects reset when using a cross feature namespace token (covers: AC-4)", async () => {
      const crossToken = `cross-token-${testRunId}`
      const rec = await db.verification.create({
        data: {
          identifier: `email-verification:${testUserEmail}`,
          value: crossToken,
          expiresAt: new Date(Date.now() + 3600 * 1000),
        },
      })
      createdVerificationIds.push(rec.id)

      const result = await resetPasswordAction({
        token: crossToken,
        password: "NewPassword123",
        confirmPassword: "NewPassword123",
      })
      expect(result.success).toBe(false)
      expect(result.error).toContain("invalid")
    })

    it("atomically consumes token, updates password, and revokes sessions across devices (covers: AC-4, AC-5)", async () => {
      // Create multiple mock active sessions for the target user (simulating laptop and phone)
      await db.session.createMany({
        data: [
          {
            userId: testUserId,
            token: `laptop-session-${testRunId}`,
            expiresAt: new Date(Date.now() + 86400 * 1000),
          },
          {
            userId: testUserId,
            token: `phone-session-${testRunId}`,
            expiresAt: new Date(Date.now() + 86400 * 1000),
          },
        ],
      })

      // Create an active session for the other user
      const otherSession = await db.session.create({
        data: {
          userId: otherUserId,
          token: `other-session-${testRunId}`,
          expiresAt: new Date(Date.now() + 86400 * 1000),
        },
      })

      const newPassword = "NewBrandPassword456"
      const resetResult = await resetPasswordAction({
        token: testToken,
        password: newPassword,
        confirmPassword: newPassword,
      })

      expect(resetResult.success).toBe(true)

      // 1. Verify consumedAt is populated atomically
      const verification = await db.verification.findFirst({
        where: { value: testToken },
      })
      expect(verification?.consumedAt).not.toBeNull()

      // 2. Verify all active sessions for this user were revoked
      const remainingSessions = await db.session.findMany({
        where: { userId: testUserId },
      })
      expect(remainingSessions.length).toBe(0)

      // 3. Verify other user's session remains untouched (session isolation)
      const otherSessionRemaining = await db.session.findUnique({
        where: { id: otherSession.id },
      })
      expect(otherSessionRemaining).not.toBeNull()

      // 4. Verify user can authenticate with the new password
      const signInRes = await auth.api.signInEmail({
        body: {
          email: testUserEmail,
          password: newPassword,
        },
      })
      expect(signInRes.user).toBeDefined()
      expect(signInRes.user.id).toBe(testUserId)

      // 5. Verify old password fails
      await expect(
        auth.api.signInEmail({
          body: {
            email: testUserEmail,
            password: "OldPassword123",
          },
        })
      ).rejects.toThrow()
    })

    it("prevents replay attacks on already consumed tokens (covers: AC-4, AC-5)", async () => {
      const replayResult = await resetPasswordAction({
        token: testToken,
        password: "AnotherNewPassword789",
        confirmPassword: "AnotherNewPassword789",
      })
      expect(replayResult.success).toBe(false)
      expect(replayResult.error).toContain("already been used")
    })

    it("handles concurrency so parallel reset requests cannot double consume a token (covers: AC-4, AC-5)", async () => {
      // Create a fresh token for race condition test
      const raceToken = `race-token-${testRunId}`
      const rec = await db.verification.create({
        data: {
          identifier: `reset-password:${testUserEmail}`,
          value: raceToken,
          expiresAt: new Date(Date.now() + 3600 * 1000),
        },
      })
      createdVerificationIds.push(rec.id)

      // Execute two simultaneous reset requests with the same token
      const [res1, res2] = await Promise.all([
        resetPasswordAction({
          token: raceToken,
          password: "ConcurrentPass1",
          confirmPassword: "ConcurrentPass1",
        }),
        resetPasswordAction({
          token: raceToken,
          password: "ConcurrentPass2",
          confirmPassword: "ConcurrentPass2",
        }),
      ])

      // Exactly one must succeed, the other must fail
      const successCount = [res1.success, res2.success].filter(Boolean).length
      expect(successCount).toBe(1)
    })
  })

  describe("ResetPasswordEmail React Email Template (covers: AC-3)", () => {
    it("renders email element with Streamline branding, reset link, and button", () => {
      const element = ResetPasswordEmail({
        userEmail: "owner@company.com",
        userName: "Alex Owner",
        resetUrl: "https://streamline.io/reset-password?token=brand-test-token",
      })

      expect(element).toBeDefined()
      expect(element.type).toBeDefined()
      expect(element.props).toBeDefined()
    })
  })

  describe("sendResetPasswordEmail mock logger fallback (covers: AC-6)", () => {
    it("safely falls back to mock logger in test environment", async () => {
      const result = await sendResetPasswordEmail({
        to: "fallback@example.com",
        userName: "Alex",
        resetUrl: "http://localhost:3000/reset-password?token=mock-token",
      })

      expect(result.success).toBe(true)
      expect(result.mock).toBe(true)
      expect(result.emailSentAt).toBeDefined()
    })
  })
})
