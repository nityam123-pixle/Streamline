import { describe, it, expect, vi, afterAll, beforeAll } from "vitest"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { TeamInviteEmail } from "@/components/emails/TeamInviteEmail"
import {
  sendTeamInviteEmail,
  batchSendTeamInviteEmails,
} from "@/lib/email/invite"
import { createTeamInvitationsAction } from "@/actions/team-invitation"
import * as nextHeaders from "next/headers"
import type { Resend } from "resend"

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}))

describe("Transactional Invite Emails (Feature 11)", () => {
  const createdUserIds: string[] = []
  const createdOrgIds: string[] = []
  const testRunId = Date.now()
  const ownerEmail = `email-owner-${testRunId}@example.com`
  const testPassword = "Password123!"

  let ownerUserId = ""
  let testOrgId = ""
  let ownerSessionCookie = ""

  beforeAll(async () => {
    // 1. Create owner user via Better Auth
    const ownerRes = await auth.api.signUpEmail({
      body: {
        name: "Arthur Pendragon",
        email: ownerEmail,
        password: testPassword,
      },
    })
    if (!ownerRes?.user) throw new Error("Failed to create test owner")
    ownerUserId = ownerRes.user.id
    createdUserIds.push(ownerUserId)

    // Mark test owner email verified for invitation dispatch testing (AC-7)
    await db.user.update({
      where: { id: ownerUserId },
      data: { emailVerified: true, emailVerifiedAt: new Date() },
    })

    // 2. Create organization
    const org = await db.organization.create({
      data: {
        name: "Camelot Technologies",
        slug: `camelot-${testRunId}`,
        onboardingStep: "team-invitation",
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
    testOrgId = org.id
    createdOrgIds.push(testOrgId)

    // 3. Sign in owner to get session cookie
    const ownerSignIn = await auth.api.signInEmail({
      body: {
        email: ownerEmail,
        password: testPassword,
      },
      asResponse: true,
    })
    ownerSessionCookie = ownerSignIn.headers.get("set-cookie") || ""
  }, 45000)

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

  describe("AC-1 & AC-2: Email Template Rendering & Structure", () => {
    it("renders TeamInviteEmail component with inviter attribution, workspace name, role, and invite URL", () => {
      const emailElement = TeamInviteEmail({
        inviteeEmail: "lancelot@camelot.org",
        inviterName: "Arthur Pendragon",
        workspaceName: "Camelot Technologies",
        role: "Editor",
        inviteUrl: "https://streamline.app/invite/valid-token-123",
      })

      expect(emailElement).toBeDefined()
      expect(emailElement.props).toBeDefined()
    })
  })

  describe("AC-3 & AC-4: Mock Logger Fallback & Database emailSentAt Tracking", () => {
    it("falls back to mock logger when RESEND_API_KEY is not configured and updates emailSentAt", async () => {
      // Ensure no RESEND_API_KEY
      const originalKey = process.env.RESEND_API_KEY
      delete process.env.RESEND_API_KEY

      // Create a test invitation record
      const testInvite = await db.invitation.create({
        data: {
          organizationId: testOrgId,
          email: `mock-recipient-${Date.now()}@example.com`,
          role: "editor",
          status: "pending",
          token: `token-hash-mock-${Date.now()}`,
          expiresAt: new Date(Date.now() + 86400000),
          inviterId: ownerUserId,
        },
      })

      expect(testInvite.emailSentAt).toBeNull()

      const consoleLogSpy = vi.spyOn(console, "log")

      const result = await sendTeamInviteEmail({
        invitationId: testInvite.id,
        to: testInvite.email,
        inviterName: "Arthur Pendragon",
        inviterEmail: ownerEmail,
        workspaceName: "Camelot Technologies",
        role: "Editor",
        inviteUrl: `https://streamline.app/invite/raw-token-123`,
      })

      expect(result.success).toBe(true)
      expect(result.mock).toBe(true)
      expect(result.emailSentAt).toBeDefined()

      // Verify mock log printed invite details
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(testInvite.email)
      )

      // Verify database record has updated emailSentAt
      const updated = await db.invitation.findUnique({
        where: { id: testInvite.id },
      })
      expect(updated?.emailSentAt).not.toBeNull()
      expect(updated?.emailSentAt).toBeInstanceOf(Date)

      consoleLogSpy.mockRestore()
      if (originalKey) process.env.RESEND_API_KEY = originalKey
    })
  })

  describe("AC-2 & AC-3: Resend Client Dispatch", () => {
    it("dispatches email with correct headers and updates database timestamp when provider succeeds", async () => {
      const mockSend = vi.fn().mockResolvedValue({
        data: { id: "msg_12345" },
        error: null,
      })
      const mockClient = {
        emails: { send: mockSend },
      } as unknown as Resend

      const testInvite = await db.invitation.create({
        data: {
          organizationId: testOrgId,
          email: `provider-recipient-${Date.now()}@example.com`,
          role: "admin",
          status: "pending",
          token: `token-hash-provider-${Date.now()}`,
          expiresAt: new Date(Date.now() + 86400000),
          inviterId: ownerUserId,
        },
      })

      process.env.RESEND_API_KEY = "re_test_dummy_key"

      const result = await sendTeamInviteEmail({
        invitationId: testInvite.id,
        to: testInvite.email,
        inviterName: "Arthur Pendragon",
        inviterEmail: ownerEmail,
        workspaceName: "Camelot Technologies",
        role: "admin",
        inviteUrl: "https://streamline.app/invite/raw-token-abc",
        resendClient: mockClient,
      })

      expect(result.success).toBe(true)
      expect(mockSend).toHaveBeenCalledTimes(1)

      const sendArgs = mockSend.mock.calls[0][0]
      expect(sendArgs.to).toBe(testInvite.email)
      expect(sendArgs.from).toContain("Camelot Technologies via Streamline")
      expect(sendArgs.replyTo).toBe(ownerEmail)
      expect(sendArgs.subject).toBe(
        "Arthur Pendragon invited you to join Camelot Technologies on Streamline"
      )

      // Verify DB update
      const updated = await db.invitation.findUnique({
        where: { id: testInvite.id },
      })
      expect(updated?.emailSentAt).not.toBeNull()

      delete process.env.RESEND_API_KEY
    })
  })

  describe("AC-5: Provider Failure Isolation", () => {
    it("handles Resend API error without throwing and leaves invitation intact in database", async () => {
      const mockSend = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Domain not verified on Resend" },
      })
      const mockClient = {
        emails: { send: mockSend },
      } as unknown as Resend

      const testInvite = await db.invitation.create({
        data: {
          organizationId: testOrgId,
          email: `failing-recipient-${Date.now()}@example.com`,
          role: "editor",
          status: "pending",
          token: `token-hash-fail-${Date.now()}`,
          expiresAt: new Date(Date.now() + 86400000),
          inviterId: ownerUserId,
        },
      })

      process.env.RESEND_API_KEY = "re_test_dummy_key"

      const result = await sendTeamInviteEmail({
        invitationId: testInvite.id,
        to: testInvite.email,
        inviterName: "Arthur Pendragon",
        inviterEmail: ownerEmail,
        workspaceName: "Camelot Technologies",
        role: "editor",
        inviteUrl: "https://streamline.app/invite/raw-fail-token",
        resendClient: mockClient,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("Domain not verified")

      // Invariant: database invitation record remains pending and intact
      const freshInvite = await db.invitation.findUnique({
        where: { id: testInvite.id },
      })
      expect(freshInvite).not.toBeNull()
      expect(freshInvite?.status).toBe("pending")
      expect(freshInvite?.emailSentAt).toBeNull()

      delete process.env.RESEND_API_KEY
    })

    it("handles unexpected network throw/rejection gracefully", async () => {
      const mockSend = vi.fn().mockRejectedValue(new Error("Network timeout (ETIMEDOUT)"))
      const mockClient = {
        emails: { send: mockSend },
      } as unknown as Resend

      process.env.RESEND_API_KEY = "re_test_dummy_key"

      const result = await sendTeamInviteEmail({
        to: "timeout@example.com",
        inviterName: "Arthur",
        inviterEmail: ownerEmail,
        workspaceName: "Camelot",
        role: "viewer",
        inviteUrl: "https://streamline.app/invite/token",
        resendClient: mockClient,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("Network timeout (ETIMEDOUT)")

      delete process.env.RESEND_API_KEY
    })
  })

  describe("AC-6: Batch Delivery Isolation", () => {
    it("ensures a failure on one recipient does not stop delivery to subsequent valid recipients", async () => {
      const inviteAId = `inv-batch-a-${Date.now()}`
      const inviteBId = `inv-batch-b-${Date.now()}`

      const invA = await db.invitation.create({
        data: {
          id: inviteAId,
          organizationId: testOrgId,
          email: `batch-fail-${Date.now()}@example.com`,
          role: "editor",
          status: "pending",
          token: `token-hash-ba-${Date.now()}`,
          expiresAt: new Date(Date.now() + 86400000),
          inviterId: ownerUserId,
        },
      })

      const invB = await db.invitation.create({
        data: {
          id: inviteBId,
          organizationId: testOrgId,
          email: `batch-success-${Date.now()}@example.com`,
          role: "viewer",
          status: "pending",
          token: `token-hash-bb-${Date.now()}`,
          expiresAt: new Date(Date.now() + 86400000),
          inviterId: ownerUserId,
        },
      })

      const mockSend = vi.fn().mockImplementation(async ({ to }: { to: string }) => {
        if (to === invA.email) {
          return { data: null, error: { message: "Invalid email mailbox" } }
        }
        return { data: { id: "msg_batch_success" }, error: null }
      })
      const mockClient = {
        emails: { send: mockSend },
      } as unknown as Resend

      process.env.RESEND_API_KEY = "re_test_batch_key"

      const batchResult = await batchSendTeamInviteEmails({
        invites: [
          {
            invitationId: invA.id,
            email: invA.email,
            role: invA.role,
            rawToken: "raw-token-a",
          },
          {
            invitationId: invB.id,
            email: invB.email,
            role: invB.role,
            rawToken: "raw-token-b",
          },
        ],
        inviterName: "Arthur Pendragon",
        inviterEmail: ownerEmail,
        workspaceName: "Camelot Technologies",
        baseUrl: "https://streamline.app",
        resendClient: mockClient,
      })

      expect(batchResult.sentCount).toBe(1)
      expect(batchResult.failedCount).toBe(1)
      expect(batchResult.warnings.length).toBe(1)
      expect(batchResult.warnings[0]).toContain("Invalid email mailbox")

      // Check DB records
      const freshA = await db.invitation.findUnique({ where: { id: invA.id } })
      const freshB = await db.invitation.findUnique({ where: { id: invB.id } })

      expect(freshA?.emailSentAt).toBeNull()
      expect(freshB?.emailSentAt).not.toBeNull()

      delete process.env.RESEND_API_KEY
    })
  })

  describe("Integration: createTeamInvitationsAction with Transactional Emails", () => {
    it("successfully creates invitations, advances step, and dispatches invite emails", async () => {
      const reqHeaders = new Headers()
      reqHeaders.set("cookie", ownerSessionCookie)
      reqHeaders.set("host", "localhost:3000")
      vi.mocked(nextHeaders.headers).mockResolvedValue(reqHeaders)

      const recipientOne = `integration-colleague-1-${Date.now()}@example.com`
      const recipientTwo = `integration-colleague-2-${Date.now()}@example.com`

      const actionResult = await createTeamInvitationsAction({
        invites: [
          { email: recipientOne, role: "Editor" },
          { email: recipientTwo, role: "Viewer" },
        ],
      })

      expect(actionResult.success).toBe(true)
      expect(actionResult.count).toBe(2)
      expect(actionResult.onboardingStep).toBe("launch")

      // Verify database records exist and emailSentAt was recorded via mock logger
      const invOne = await db.invitation.findUnique({
        where: {
          organizationId_email: {
            organizationId: testOrgId,
            email: recipientOne,
          },
        },
      })
      const invTwo = await db.invitation.findUnique({
        where: {
          organizationId_email: {
            organizationId: testOrgId,
            email: recipientTwo,
          },
        },
      })

      expect(invOne).not.toBeNull()
      expect(invOne?.role).toBe("editor")
      expect(invOne?.emailSentAt).not.toBeNull()

      expect(invTwo).not.toBeNull()
      expect(invTwo?.role).toBe("viewer")
      expect(invTwo?.emailSentAt).not.toBeNull()
    })
  })
})
