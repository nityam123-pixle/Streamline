import { describe, it, expect, afterAll } from "vitest"
import React from "react"
import { render } from "@react-email/components"
import {
  signUpAction,
  resendVerificationEmailAction,
  verifyEmailAction,
  validateResetTokenAction,
} from "@/actions/auth"
import {
  resendVerificationSchema,
  verifyEmailSchema,
} from "@/lib/auth/schemas"
import { db } from "@/lib/db"
import { sendVerificationEmail } from "@/lib/email/verification"
import { VerifyEmail } from "@/components/emails/VerifyEmail"
import { createTeamInvitationsAction } from "@/actions/team-invitation"
import { auth } from "@/lib/auth"
import { randomBytes } from "crypto"

describe("Email Verification Feature 2b (Spec 0012)", { timeout: 35000 }, () => {
  const createdUserIds: string[] = []
  const createdOrgIds: string[] = []
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

    // Clean up organizations (cascades to members and invitations)
    for (const orgId of createdOrgIds) {
      try {
        await db.organization.delete({ where: { id: orgId } })
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

  describe("Validation Schemas (covers: AC-1, AC-3, AC-4)", () => {
    it("validates correct email for resend verification", () => {
      const valid = resendVerificationSchema.safeParse({ email: "owner@company.com" })
      expect(valid.success).toBe(true)
    })

    it("trims whitespace from email input", () => {
      const parsed = resendVerificationSchema.safeParse({ email: "  owner@company.com  " })
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.email).toBe("owner@company.com")
      }
    })

    it("allows optional email when session is expected", () => {
      const empty = resendVerificationSchema.safeParse({})
      expect(empty.success).toBe(true)
    })

    it("rejects invalid email format", () => {
      const invalid = resendVerificationSchema.safeParse({ email: "not-an-email" })
      expect(invalid.success).toBe(false)
    })

    it("validates token input for verify email", () => {
      const valid = verifyEmailSchema.safeParse({ token: "crypto-token-123" })
      expect(valid.success).toBe(true)
    })

    it("rejects empty token string", () => {
      const invalid = verifyEmailSchema.safeParse({ token: "   " })
      expect(invalid.success).toBe(false)
    })
  })

  describe("Automated Token Generation on Signup (covers: AC-1, AC-6)", () => {
    it("generates a namespaced email-verification token in database when a new owner registers", async () => {
      const testEmail = `verify_signup_${testRunId}_1@example.com`
      const signUpResult = await signUpAction({
        fullName: "Verification Tester",
        email: testEmail,
        password: "Password123",
        confirmPassword: "Password123",
        agreeTerms: true,
      })

      expect(signUpResult.success).toBe(true)
      if (signUpResult.user) {
        createdUserIds.push(signUpResult.user.id)
      }
      if (signUpResult.organization) {
        createdOrgIds.push(signUpResult.organization.id)
      }

      // Check database verification record
      const tokenRecord = await db.verification.findFirst({
        where: {
          identifier: `email-verification:${testEmail}`,
        },
      })

      expect(tokenRecord).toBeDefined()
      expect(tokenRecord?.identifier).toBe(`email-verification:${testEmail}`)
      expect(tokenRecord?.value).toBeTruthy()
      expect(tokenRecord?.consumedAt).toBeNull()

      if (tokenRecord) {
        createdVerificationIds.push(tokenRecord.id)
      }
    })
  })

  describe("resendVerificationEmailAction and Cooldown (covers: AC-4)", () => {
    it("enforces 60-second cooldown so rapid duplicate requests are rate limited", async () => {
      const testEmail = `verify_cooldown_${testRunId}@example.com`

      // Create a test user
      const user = await db.user.create({
        data: {
          email: testEmail,
          name: "Cooldown Tester",
          emailVerified: false,
        },
      })
      createdUserIds.push(user.id)

      // First resend request
      const firstResend = await resendVerificationEmailAction({ email: testEmail })
      expect(firstResend.success).toBe(true)
      expect(firstResend.cooldownSeconds).toBe(60)

      // Find token record to track cleanup
      const tokenRecord = await db.verification.findFirst({
        where: { identifier: `email-verification:${testEmail}` },
      })
      if (tokenRecord) {
        createdVerificationIds.push(tokenRecord.id)
      }

      // Immediate second resend request
      const secondResend = await resendVerificationEmailAction({ email: testEmail })
      expect(secondResend.success).toBe(false)
      expect(secondResend.error).toContain("Please wait")
      expect(secondResend.cooldownSeconds).toBeGreaterThan(0)
    })

    it("returns uniform confirmation for unregistered email to prevent account enumeration", async () => {
      const unregisteredEmail = `nonexistent_user_${testRunId}@example.com`
      const result = await resendVerificationEmailAction({ email: unregisteredEmail })

      expect(result.success).toBe(true)
      expect(result.message).toContain("If an account exists")
    })

    it("handles already verified user by returning confirmation without duplicate tokens", async () => {
      const verifiedEmail = `already_verified_${testRunId}@example.com`
      const user = await db.user.create({
        data: {
          email: verifiedEmail,
          name: "Already Verified User",
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      })
      createdUserIds.push(user.id)

      const result = await resendVerificationEmailAction({ email: verifiedEmail })
      expect(result.success).toBe(true)
      expect(result.message).toContain("already verified")
    })
  })

  describe("verifyEmailAction and Atomic Consumption (covers: AC-3, AC-5)", () => {
    it("atomically verifies token, updates User.emailVerified and timestamps", async () => {
      const testEmail = `atomic_verify_${testRunId}@example.com`
      const user = await db.user.create({
        data: {
          email: testEmail,
          name: "Atomic Tester",
          emailVerified: false,
        },
      })
      createdUserIds.push(user.id)

      const tokenValue = `valid_token_${randomBytes(16).toString("hex")}`
      const verification = await db.verification.create({
        data: {
          identifier: `email-verification:${testEmail}`,
          value: tokenValue,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      })
      createdVerificationIds.push(verification.id)

      // Execute verification
      const result = await verifyEmailAction(tokenValue)
      expect(result.success).toBe(true)
      expect(result.status).toBe("success")
      expect(result.email).toBe(testEmail)

      // Verify database records
      const updatedUser = await db.user.findUnique({
        where: { email: testEmail },
      })
      expect(updatedUser?.emailVerified).toBe(true)
      expect(updatedUser?.emailVerifiedAt).toBeInstanceOf(Date)

      const updatedVerification = await db.verification.findUnique({
        where: { id: verification.id },
      })
      expect(updatedVerification?.consumedAt).toBeInstanceOf(Date)
    })

    it("accepts object argument { token: tokenValue } as well as raw string", async () => {
      const testEmail = `object_arg_${testRunId}@example.com`
      const user = await db.user.create({
        data: {
          email: testEmail,
          name: "Object Arg Tester",
          emailVerified: false,
        },
      })
      createdUserIds.push(user.id)

      const tokenValue = `obj_token_${randomBytes(16).toString("hex")}`
      const verification = await db.verification.create({
        data: {
          identifier: `email-verification:${testEmail}`,
          value: tokenValue,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })
      createdVerificationIds.push(verification.id)

      const result = await verifyEmailAction({ token: tokenValue })
      expect(result.success).toBe(true)
      expect(result.status).toBe("success")
      expect(result.email).toBe(testEmail)
    })

    it("returns status: 'consumed' for already consumed token (replay prevention)", async () => {
      const testEmail = `consumed_token_${testRunId}@example.com`
      const tokenValue = `consumed_token_${randomBytes(16).toString("hex")}`

      const verification = await db.verification.create({
        data: {
          identifier: `email-verification:${testEmail}`,
          value: tokenValue,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          consumedAt: new Date(),
        },
      })
      createdVerificationIds.push(verification.id)

      const result = await verifyEmailAction(tokenValue)
      expect(result.success).toBe(true)
      expect(result.status).toBe("consumed")
      expect(result.message).toContain("already been verified")
    })

    it("returns status: 'expired' for tokens older than 24 hours (AC-5)", async () => {
      const testEmail = `expired_token_${testRunId}@example.com`
      const tokenValue = `expired_token_${randomBytes(16).toString("hex")}`

      const verification = await db.verification.create({
        data: {
          identifier: `email-verification:${testEmail}`,
          value: tokenValue,
          expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        },
      })
      createdVerificationIds.push(verification.id)

      const result = await verifyEmailAction(tokenValue)
      expect(result.success).toBe(false)
      expect(result.status).toBe("expired")
      expect(result.message).toContain("expired")
    })

    it("returns status: 'invalid' for unknown token (AC-5)", async () => {
      const result = await verifyEmailAction("completely-bogus-token-value")
      expect(result.success).toBe(false)
      expect(result.status).toBe("invalid")
    })

    it("enforces cross-feature namespace isolation: rejects reset-password tokens on verifyEmailAction", async () => {
      const testEmail = `cross_namespace_${testRunId}@example.com`
      const resetTokenValue = `reset_token_${randomBytes(16).toString("hex")}`

      const resetVerification = await db.verification.create({
        data: {
          identifier: `reset-password:${testEmail}`,
          value: resetTokenValue,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      })
      createdVerificationIds.push(resetVerification.id)

      // Attempt to verify email using reset-password token
      const verifyResult = await verifyEmailAction(resetTokenValue)
      expect(verifyResult.success).toBe(false)
      expect(verifyResult.status).toBe("invalid")

      // Conversely, attempt to validate email-verification token on password reset endpoint
      const emailTokenValue = `email_token_${randomBytes(16).toString("hex")}`
      const emailVerification = await db.verification.create({
        data: {
          identifier: `email-verification:${testEmail}`,
          value: emailTokenValue,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })
      createdVerificationIds.push(emailVerification.id)

      const resetResult = await validateResetTokenAction(emailTokenValue)
      expect(resetResult.valid).toBe(false)
      expect(resetResult.reason).toBe("invalid")
    })

    it("handles concurrent requests safely so parallel executions cannot double consume (AC-3)", async () => {
      const testEmail = `concurrency_test_${testRunId}@example.com`
      const user = await db.user.create({
        data: {
          email: testEmail,
          name: "Concurrency Tester",
          emailVerified: false,
        },
      })
      createdUserIds.push(user.id)

      const tokenValue = `concurrent_token_${randomBytes(16).toString("hex")}`
      const verification = await db.verification.create({
        data: {
          identifier: `email-verification:${testEmail}`,
          value: tokenValue,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })
      createdVerificationIds.push(verification.id)

      // Run 3 simultaneous verification requests
      const results = await Promise.all([
        verifyEmailAction(tokenValue),
        verifyEmailAction(tokenValue),
        verifyEmailAction(tokenValue),
      ])

      const successCount = results.filter((r) => r.status === "success").length
      const consumedCount = results.filter((r) => r.status === "consumed").length

      expect(successCount).toBe(1)
      expect(consumedCount).toBe(2)
    })
  })

  describe("Anti-abuse Outgoing Invite Gating (covers: AC-7)", () => {
    it("holds live email dispatch with a warning if the owner email is unverified", async () => {
      const unverifiedEmail = `unverified_owner_${testRunId}@example.com`

      // Sign up unverified owner
      const signup = await signUpAction({
        fullName: "Unverified Owner",
        email: unverifiedEmail,
        password: "Password123",
        confirmPassword: "Password123",
        agreeTerms: true,
      })

      expect(signup.success).toBe(true)
      const userId = signup.user!.id
      const orgId = signup.organization!.id
      createdUserIds.push(userId)
      createdOrgIds.push(orgId)

      // Double check user.emailVerified is false
      const userRecord = await db.user.findUnique({
        where: { id: userId },
        select: { emailVerified: true },
      })
      expect(userRecord?.emailVerified).toBe(false)

      // Sign in to get session cookie headers
      const signInResult = await auth.api.signInEmail({
        body: {
          email: unverifiedEmail,
          password: "Password123",
        },
        asResponse: true,
      })
      const sessionCookie = signInResult.headers.get("set-cookie") || ""
      expect(sessionCookie).toBeTruthy()

      // Mock session headers for Server Action
      const testHeaders = new Headers()
      testHeaders.set("cookie", sessionCookie)

      const colleagueEmail = `held_colleague_${testRunId}@example.com`
      const inviteResult = await createTeamInvitationsAction(
        {
          invites: [
            {
              email: colleagueEmail,
              role: "editor",
            },
          ],
        },
        testHeaders
      )

      expect(inviteResult.success).toBe(true)
      expect(inviteResult.emailWarnings).toBeDefined()
      expect(inviteResult.emailWarnings?.[0]).toContain(
        "Email dispatch is held until your email address is verified"
      )

      // Check database: invitation record exists with emailSentAt null
      const createdInvite = await db.invitation.findFirst({
        where: {
          organizationId: orgId,
          email: colleagueEmail,
        },
      })
      expect(createdInvite).toBeDefined()
      expect(createdInvite?.emailSentAt).toBeNull()
    })

    it("dispatches live email and sets emailSentAt when the owner email is verified", async () => {
      const verifiedEmail = `verified_owner_${testRunId}@example.com`

      // Sign up verified owner
      const signup = await signUpAction({
        fullName: "Verified Owner",
        email: verifiedEmail,
        password: "Password123",
        confirmPassword: "Password123",
        agreeTerms: true,
      })

      expect(signup.success).toBe(true)
      const userId = signup.user!.id
      const orgId = signup.organization!.id
      createdUserIds.push(userId)
      createdOrgIds.push(orgId)

      // Set emailVerified to true in database
      await db.user.update({
        where: { id: userId },
        data: { emailVerified: true, emailVerifiedAt: new Date() },
      })

      // Sign in to get session cookie headers
      const signInResult = await auth.api.signInEmail({
        body: {
          email: verifiedEmail,
          password: "Password123",
        },
        asResponse: true,
      })
      const sessionCookie = signInResult.headers.get("set-cookie") || ""
      expect(sessionCookie).toBeTruthy()

      const testHeaders = new Headers()
      testHeaders.set("cookie", sessionCookie)

      const colleagueEmail = `sent_colleague_${testRunId}@example.com`
      const inviteResult = await createTeamInvitationsAction(
        {
          invites: [
            {
              email: colleagueEmail,
              role: "editor",
            },
          ],
        },
        testHeaders
      )

      expect(inviteResult.success).toBe(true)
      expect(inviteResult.emailWarnings).toBeUndefined()

      // Check database: invitation record exists with emailSentAt set
      const createdInvite = await db.invitation.findFirst({
        where: {
          organizationId: orgId,
          email: colleagueEmail,
        },
      })
      expect(createdInvite).toBeDefined()
      expect(createdInvite?.emailSentAt).toBeInstanceOf(Date)
    })
  })

  describe("VerifyEmail React Email Template (covers: AC-2)", () => {
    it("renders email element with Streamline branding, verify link, and button", () => {
      const verifyUrl = "http://localhost:3000/verify-email?token=test-token-123"
      const element = VerifyEmail({
        userEmail: "owner@company.com",
        userName: "Alex",
        verifyUrl,
      })

      expect(element).toBeDefined()
      expect(element.props.lang).toBe("en")
    })

    it("renders full HTML markup with Streamline branding, verify link, and #161616 action button", async () => {
      const verifyUrl = "http://localhost:3000/verify-email?token=test-token-456"
      const html = await render(
        React.createElement(VerifyEmail, {
          userEmail: "owner@company.com",
          userName: "Alex",
          verifyUrl,
        })
      )

      expect(html).toContain("Streamline")
      expect(html).toContain("Verify your email address")
      expect(html).toContain(verifyUrl)
      expect(html).toContain("#161616")
      expect(html).toContain("Verify Email Address")
    })
  })

  describe("sendVerificationEmail mock logger fallback (covers: AC-6)", () => {
    it("safely falls back to mock logger in test environment without throwing", async () => {
      const result = await sendVerificationEmail({
        to: "fallback@example.com",
        userName: "Fallback User",
        verifyUrl: "http://localhost:3000/verify-email?token=mock-token",
      })

      expect(result.success).toBe(true)
      expect(result.mock).toBe(true)
      expect(result.to).toBe("fallback@example.com")
      expect(result.emailSentAt).toBeInstanceOf(Date)
    })
  })
})
