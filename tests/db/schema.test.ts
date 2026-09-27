import { describe, it, expect, afterAll } from "vitest"
import { db } from "@/lib/db/index"

describe("Data model and relational invariants (AC-3, AC-4, AC-7)", () => {
  const testRunId = Date.now()
  const createdUserIds: string[] = []
  const createdOrgIds: string[] = []

  afterAll(async () => {
    // Clean up created entities (cascades will clean children)
    for (const userId of createdUserIds) {
      await db.user.deleteMany({ where: { id: userId } })
    }
    for (const orgId of createdOrgIds) {
      await db.organization.deleteMany({ where: { id: orgId } })
    }
  })

  it("creates a User record with default values and timestamps (AC-3)", async () => {
    const email = `test-user-${testRunId}-1@example.com`
    const user = await db.user.create({
      data: {
        name: "Alex Morgan",
        firstName: "Alex",
        lastName: "Morgan",
        email,
      },
    })
    createdUserIds.push(user.id)

    expect(user.id).toBeDefined()
    expect(user.email).toBe(email)
    expect(user.emailVerified).toBe(false)
    expect(user.createdAt).toBeInstanceOf(Date)
    expect(user.updatedAt).toBeInstanceOf(Date)
  })

  it("creates an Organization with JSON fields for automation areas and selected tools (AC-3)", async () => {
    const slug = `org-${testRunId}-1`
    const org = await db.organization.create({
      data: {
        name: "Streamline Testing Co",
        slug,
        teamSize: "11-50",
        automationAreas: ["customer_support", "sales_pipeline"],
        selectedTools: ["slack", "github", "hubspot"],
      },
    })
    createdOrgIds.push(org.id)

    expect(org.id).toBeDefined()
    expect(org.slug).toBe(slug)
    expect(org.onboardingStep).toBe("welcome")
    expect(org.automationAreas).toEqual(["customer_support", "sales_pipeline"])
    expect(org.selectedTools).toEqual(["slack", "github", "hubspot"])
  })

  it("supports Role enum values owner, admin, and editor on Member and Invitation (AC-4)", async () => {
    const user = await db.user.create({
      data: {
        name: "Sam Taylor",
        email: `sam-${testRunId}@example.com`,
      },
    })
    createdUserIds.push(user.id)

    const org = await db.organization.create({
      data: {
        name: "Role Test Org",
        slug: `org-roles-${testRunId}`,
      },
    })
    createdOrgIds.push(org.id)

    // Member with owner role
    const ownerMember = await db.member.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: "owner",
        jobTitle: "Founder & CEO",
      },
    })
    expect(ownerMember.role).toBe("owner")

    // Invitation with editor role
    const editorInvite = await db.invitation.create({
      data: {
        organizationId: org.id,
        email: `teammate-${testRunId}@example.com`,
        role: "editor",
        token: `token-editor-${testRunId}`,
        expiresAt: new Date(Date.now() + 86400000),
        inviterId: user.id,
      },
    })
    expect(editorInvite.role).toBe("editor")
  })

  it("enforces unique constraint on user email (AC-3)", async () => {
    const sharedEmail = `duplicate-${testRunId}@example.com`
    const firstUser = await db.user.create({
      data: {
        name: "Original User",
        email: sharedEmail,
      },
    })
    createdUserIds.push(firstUser.id)

    await expect(
      db.user.create({
        data: {
          name: "Second User",
          email: sharedEmail,
        },
      })
    ).rejects.toThrow()
  })

  it("cascades deletion from User to Sessions and Accounts (AC-7)", async () => {
    const user = await db.user.create({
      data: {
        name: "Cascade Target User",
        email: `cascade-user-${testRunId}@example.com`,
      },
    })

    const session = await db.session.create({
      data: {
        userId: user.id,
        token: `session-cascade-${testRunId}`,
        expiresAt: new Date(Date.now() + 86400000),
      },
    })

    const account = await db.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
      },
    })

    // Delete the parent user
    await db.user.delete({
      where: { id: user.id },
    })

    // Child records must no longer exist
    const foundSession = await db.session.findUnique({ where: { id: session.id } })
    const foundAccount = await db.account.findUnique({ where: { id: account.id } })

    expect(foundSession).toBeNull()
    expect(foundAccount).toBeNull()
  })

  it("cascades deletion from Organization to Members and Invitations (AC-7)", async () => {
    const user = await db.user.create({
      data: {
        name: "Org Cascade User",
        email: `org-cascade-${testRunId}@example.com`,
      },
    })
    createdUserIds.push(user.id)

    const org = await db.organization.create({
      data: {
        name: "Cascade Org",
        slug: `cascade-org-${testRunId}`,
      },
    })

    const member = await db.member.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: "admin",
      },
    })

    const invitation = await db.invitation.create({
      data: {
        organizationId: org.id,
        email: `invite-cascade-${testRunId}@example.com`,
        role: "editor",
        token: `token-org-cascade-${testRunId}`,
        expiresAt: new Date(Date.now() + 86400000),
        inviterId: user.id,
      },
    })

    // Delete the parent organization
    await db.organization.delete({
      where: { id: org.id },
    })

    // Child records must no longer exist
    const foundMember = await db.member.findUnique({ where: { id: member.id } })
    const foundInvitation = await db.invitation.findUnique({ where: { id: invitation.id } })

    expect(foundMember).toBeNull()
    expect(foundInvitation).toBeNull()
  })
})
