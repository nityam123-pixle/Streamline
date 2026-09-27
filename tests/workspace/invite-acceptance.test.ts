import { describe, it, expect, vi, afterAll, beforeAll, beforeEach } from "vitest"
import { randomBytes, createHash } from "crypto"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import * as nextHeaders from "next/headers"
import {
  getInvitationByTokenAction,
  acceptTokenInvitationAction,
  getOrganizationByCodeAction,
  joinOrganizationByCodeAction,
} from "@/actions/team-invitation"
import { getOnboardingResumeState } from "@/lib/onboarding/routing"
import {
  acceptTokenInvitationSchema,
  joinOrganizationByCodeSchema,
} from "@/lib/team-invitation/schemas"

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}))

describe("Invite Acceptance and Teammate Join Flow (Feature 10)", () => {
  const createdUserIds: string[] = []
  const createdOrgIds: string[] = []
  const testRunId = Date.now()
  const testPassword = "SecurePassword123!"

  const ownerEmail = `invite-owner-${testRunId}@example.com`
  const existingUserEmail = `existing-account-${testRunId}@example.com`
  const inviteeEmail = `invited-teammate-${testRunId}@example.com`

  let ownerUserId = ""
  let existingUserId = ""
  let testOrgId = ""
  let testInviteCode = ""
  let rawToken = ""
  let tokenHash = ""

  let ownerSessionCookie = ""
  let existingUserSessionCookie = ""

  function mockSession(cookie?: string) {
    const h = new Headers()
    h.set("host", "localhost:3000")
    if (cookie) {
      h.set("cookie", cookie)
    }
    vi.mocked(nextHeaders.headers).mockResolvedValue(h)
  }

  beforeAll(async () => {
    // 1. Create owner user
    const ownerRes = await auth.api.signUpEmail({
      body: {
        name: "Morgan le Fay",
        email: ownerEmail,
        password: testPassword,
      },
    })
    if (!ownerRes?.user) throw new Error("Failed to create test owner")
    ownerUserId = ownerRes.user.id
    createdUserIds.push(ownerUserId)

    // 2. Create existing user (for testing AC-4 mismatch and AC-9 conflict)
    const existingRes = await auth.api.signUpEmail({
      body: {
        name: "Lancelot DuLac",
        email: existingUserEmail,
        password: testPassword,
      },
    })
    if (!existingRes?.user) throw new Error("Failed to create existing user")
    existingUserId = existingRes.user.id
    createdUserIds.push(existingUserId)

    // 3. Generate invite code and organization
    testInviteCode = randomBytes(4).toString("hex")
    const org = await db.organization.create({
      data: {
        name: "Camelot Operations",
        slug: `camelot-${testRunId}`,
        inviteCode: testInviteCode,
        onboardingStep: "launch",
        members: {
          create: {
            userId: ownerUserId,
            role: "owner",
          },
        },
      },
    })
    testOrgId = org.id
    createdOrgIds.push(testOrgId)

    // 4. Create pending invitation with SHA-256 hashed token for inviteeEmail
    rawToken = randomBytes(32).toString("hex")
    tokenHash = createHash("sha256").update(rawToken).digest("hex")

    await db.invitation.create({
      data: {
        organizationId: testOrgId,
        email: inviteeEmail,
        role: "editor",
        status: "pending",
        token: tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        inviterId: ownerUserId,
      },
    })

    // 5. Sign in owner to get session cookie
    const ownerSignIn = await auth.api.signInEmail({
      body: {
        email: ownerEmail,
        password: testPassword,
      },
      asResponse: true,
    })
    ownerSessionCookie = ownerSignIn.headers.get("set-cookie") || ""

    // 6. Sign in existing user to get session cookie
    const existingSignIn = await auth.api.signInEmail({
      body: {
        email: existingUserEmail,
        password: testPassword,
      },
      asResponse: true,
    })
    existingUserSessionCookie = existingSignIn.headers.get("set-cookie") || ""
  }, 45000)

  beforeEach(() => {
    mockSession()
  })

  afterAll(async () => {
    for (const orgId of createdOrgIds) {
      try {
        await db.organization.delete({ where: { id: orgId } })
      } catch {
        // cleanup ignore
      }
    }
    for (const userId of createdUserIds) {
      try {
        await db.user.delete({ where: { id: userId } })
      } catch {
        // cleanup ignore
      }
    }
  }, 30000)

  describe("Schema Validation (schemas.ts)", () => {
    it("validates acceptTokenInvitationSchema requires token and enforces minimum password length", () => {
      const valid = acceptTokenInvitationSchema.safeParse({
        token: "some-raw-token",
        name: "Gawain",
        password: "ValidPassword123!",
      })
      expect(valid.success).toBe(true)

      const invalidToken = acceptTokenInvitationSchema.safeParse({
        token: "",
      })
      expect(invalidToken.success).toBe(false)

      const shortPassword = acceptTokenInvitationSchema.safeParse({
        token: "token",
        name: "Gawain",
        password: "short",
      })
      expect(shortPassword.success).toBe(false)
    })

    it("validates joinOrganizationByCodeSchema enforces 8 character code", () => {
      const valid = joinOrganizationByCodeSchema.safeParse({
        inviteCode: "a1b2c3d4",
        email: "test@example.com",
        name: "Galahad",
        password: "ValidPassword123!",
      })
      expect(valid.success).toBe(true)

      const invalidLength = joinOrganizationByCodeSchema.safeParse({
        inviteCode: "short",
      })
      expect(invalidLength.success).toBe(false)
    })
  })

  describe("AC-1: Token Validation & Route Lookup", () => {
    it("returns invitation details for a valid pending token when unauthenticated", async () => {
      mockSession()

      const result = await getInvitationByTokenAction(rawToken)
      expect(result.success).toBe(true)
      expect(result.invitation).toBeDefined()
      expect(result.invitation?.email).toBe(inviteeEmail)
      expect(result.invitation?.role).toBe("editor")
      expect(result.invitation?.organizationName).toBe("Camelot Operations")
      expect(result.invitation?.inviterName).toBe("Morgan le Fay")
      expect(result.currentUser).toBeNull()
      expect(result.isCurrentEmailMatch).toBe(false)
    })

    it("returns error when token does not exist or was tampered with", async () => {
      mockSession()

      const result = await getInvitationByTokenAction("non-existent-token-12345")
      expect(result.success).toBe(false)
      expect(result.error).toContain("not found")
    })
  })

  describe("AC-4: Authenticated User Email Mismatch", () => {
    it("detects email mismatch when logged in user does not match invited email", async () => {
      mockSession(existingUserSessionCookie)

      const lookup = await getInvitationByTokenAction(rawToken)
      expect(lookup.success).toBe(true)
      expect(lookup.currentUser?.email).toBe(existingUserEmail)
      expect(lookup.isCurrentEmailMatch).toBe(false)

      // Submitting accept with mismatched email session fails
      const acceptResult = await acceptTokenInvitationAction({ token: rawToken })
      expect(acceptResult.success).toBe(false)
      expect(acceptResult.emailMismatch).toBe(true)
      expect(acceptResult.error).toContain("signed in as")
    })
  })

  describe("AC-9: Existing User Conflict on Token Registration", () => {
    it("halts unauthenticated registration when invited email already belongs to an existing User account", async () => {
      // Create an invitation for existingUserEmail in Camelot
      const tempToken = randomBytes(32).toString("hex")
      const tempTokenHash = createHash("sha256").update(tempToken).digest("hex")

      await db.invitation.create({
        data: {
          organizationId: testOrgId,
          email: existingUserEmail,
          role: "viewer",
          status: "pending",
          token: tempTokenHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          inviterId: ownerUserId,
        },
      })

      // Ensure caller is unauthenticated
      mockSession()
      const result = await acceptTokenInvitationAction({
        token: tempToken,
        name: "Lancelot New Attempt",
        password: "NewPassword123!",
      })

      expect(result.success).toBe(false)
      expect(result.requiresLogin).toBe(true)
      expect(result.error).toContain("already exists")
      expect(result.error).toContain("log in first")
    })
  })

  describe("AC-2: New User Registration & Token Accept", () => {
    it("creates user, session, member with invited role, marks invitation accepted, and redirects to /launch", async () => {
      mockSession()

      const result = await acceptTokenInvitationAction({
        token: rawToken,
        name: "Percival Knight",
        password: testPassword,
      })

      expect(result.success).toBe(true)
      expect(result.redirectUrl).toBe("/launch")
      expect(result.role).toBe("editor")
      expect(result.organizationName).toBe("Camelot Operations")

      // Verify user was persisted
      const newUser = await db.user.findUnique({
        where: { email: inviteeEmail },
      })
      expect(newUser).toBeDefined()
      if (newUser) createdUserIds.push(newUser.id)

      // Verify member record with invited role 'editor'
      const member = await db.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: testOrgId,
            userId: newUser!.id,
          },
        },
      })
      expect(member).toBeDefined()
      expect(member?.role).toBe("editor")

      // Verify invitation status changed to 'accepted'
      const updatedInv = await db.invitation.findFirst({
        where: { token: tokenHash },
      })
      expect(updatedInv?.status).toBe("accepted")
    })
  })

  describe("AC-5: Claimed or Expired Token Error States", () => {
    it("rejects token lookup and acceptance if invitation is already accepted", async () => {
      mockSession()

      const lookup = await getInvitationByTokenAction(rawToken)
      expect(lookup.success).toBe(false)
      expect(lookup.alreadyAccepted).toBe(true)
      expect(lookup.error).toContain("already been accepted")

      const accept = await acceptTokenInvitationAction({
        token: rawToken,
        name: "Another Attempt",
        password: testPassword,
      })
      expect(accept.success).toBe(false)
      expect(accept.error).toContain("already been accepted")
    })

    it("rejects token if expired", async () => {
      const expiredToken = randomBytes(32).toString("hex")
      const expiredHash = createHash("sha256").update(expiredToken).digest("hex")

      await db.invitation.create({
        data: {
          organizationId: testOrgId,
          email: "expired-user@example.com",
          role: "viewer",
          status: "pending",
          token: expiredHash,
          expiresAt: new Date(Date.now() - 10000), // in the past
          inviterId: ownerUserId,
        },
      })

      mockSession()
      const lookup = await getInvitationByTokenAction(expiredToken)
      expect(lookup.success).toBe(false)
      expect(lookup.isExpired).toBe(true)
      expect(lookup.error).toContain("expired")
    })
  })

  describe("AC-3: Authenticated One-Click Accept with Matching Email", () => {
    it("allows logged-in user with matching email to accept with one click", async () => {
      // 1. Create a new user first
      const oneClickEmail = `oneclick-${testRunId}@example.com`
      const userRes = await auth.api.signUpEmail({
        body: {
          name: "Kay Seneschal",
          email: oneClickEmail,
          password: testPassword,
        },
      })
      if (!userRes?.user) throw new Error("Failed to create user")
      createdUserIds.push(userRes.user.id)

      // 2. Create pending invitation for this user
      const oneClickToken = randomBytes(32).toString("hex")
      const oneClickHash = createHash("sha256").update(oneClickToken).digest("hex")

      await db.invitation.create({
        data: {
          organizationId: testOrgId,
          email: oneClickEmail,
          role: "admin",
          status: "pending",
          token: oneClickHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          inviterId: ownerUserId,
        },
      })

      // 3. Sign in the user
      const signInRes = await auth.api.signInEmail({
        body: {
          email: oneClickEmail,
          password: testPassword,
        },
        asResponse: true,
      })
      const userCookie = signInRes.headers.get("set-cookie") || ""

      // 4. Token lookup recognizes current user with email match
      mockSession(userCookie)

      const lookup = await getInvitationByTokenAction(oneClickToken)
      expect(lookup.success).toBe(true)
      expect(lookup.currentUser?.email).toBe(oneClickEmail)
      expect(lookup.isCurrentEmailMatch).toBe(true)

      // 5. One click accept attaches user with invited role (admin)
      const accept = await acceptTokenInvitationAction({ token: oneClickToken })
      expect(accept.success).toBe(true)
      expect(accept.redirectUrl).toBe("/launch")
      expect(accept.role).toBe("admin")

      const member = await db.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: testOrgId,
            userId: userRes.user.id,
          },
        },
      })
      expect(member).toBeDefined()
      expect(member?.role).toBe("admin")
    })
  })

  describe("AC-7: Invalid Invite Code Error State", () => {
    it("returns error when invite code does not exist", async () => {
      mockSession()

      const result = await getOrganizationByCodeAction("invalid8")
      expect(result.success).toBe(false)
      expect(result.error).toContain("not found")
    })

    it("rejects code join when code is invalid", async () => {
      mockSession()

      const result = await joinOrganizationByCodeAction({
        inviteCode: "invalid8",
        email: "someone@example.com",
        name: "Visitor",
        password: testPassword,
      })
      expect(result.success).toBe(false)
      expect(result.error).toContain("not found")
    })
  })

  describe("AC-6 & AC-9: Organization Code Join Flow", () => {
    it("halts unauthenticated code registration if email belongs to an existing User (AC-9)", async () => {
      mockSession()

      const result = await joinOrganizationByCodeAction({
        inviteCode: testInviteCode,
        email: existingUserEmail,
        name: "Lancelot Try Again",
        password: testPassword,
      })

      expect(result.success).toBe(false)
      expect(result.requiresLogin).toBe(true)
      expect(result.error).toContain("already exists")
      expect(result.error).toContain("log in first")
    })

    it("registers new user and assigns viewer role via invite code (AC-6)", async () => {
      mockSession()

      const codeJoinEmail = `code-join-${testRunId}@example.com`
      const result = await joinOrganizationByCodeAction({
        inviteCode: testInviteCode,
        email: codeJoinEmail,
        name: "Bedivere Knight",
        password: testPassword,
      })

      expect(result.success).toBe(true)
      expect(result.redirectUrl).toBe("/launch")
      expect(result.role).toBe("viewer")
      expect(result.organizationName).toBe("Camelot Operations")

      const newUser = await db.user.findUnique({
        where: { email: codeJoinEmail },
      })
      expect(newUser).toBeDefined()
      if (newUser) createdUserIds.push(newUser.id)

      const member = await db.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: testOrgId,
            userId: newUser!.id,
          },
        },
      })
      expect(member).toBeDefined()
      expect(member?.role).toBe("viewer")
    })

    it("allows logged-in user to join via code with one click as viewer (AC-6)", async () => {
      mockSession(existingUserSessionCookie)

      const result = await joinOrganizationByCodeAction({
        inviteCode: testInviteCode,
      })

      expect(result.success).toBe(true)
      expect(result.redirectUrl).toBe("/launch")
      expect(result.role).toBe("viewer")

      const member = await db.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: testOrgId,
            userId: existingUserId,
          },
        },
      })
      expect(member).toBeDefined()
      expect(member?.role).toBe("viewer")
    })
  })

  describe("AC-8: Non-owner Onboarding Bypass", () => {
    it("routes non-owner members directly to /launch and bypasses onboarding wizard", async () => {
      // Find a member with viewer or editor role in Camelot Operations
      const member = await db.member.findFirst({
        where: {
          organizationId: testOrgId,
          role: "viewer",
        },
      })
      expect(member).toBeDefined()

      const resumeState = await getOnboardingResumeState(
        member!.userId,
        testOrgId
      )

      expect(resumeState).toBeDefined()
      expect(resumeState?.targetPath).toBe("/launch")
      expect(resumeState?.step).toBe("launch")
      expect(resumeState?.isCompleted).toBe(true)
      expect(resumeState?.role).toBe("viewer")
    })
  })
})
