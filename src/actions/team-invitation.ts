"use server"

import { headers } from "next/headers"
import { randomBytes, randomUUID, createHash } from "crypto"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Role } from "@prisma/client"
import { resolveHighWatermarkStep } from "@/lib/onboarding/routing"
import {
  teamInvitationsSchema,
  validateAndNormalizeInvites,
  type TeamInvitationsInput,
} from "@/lib/team-invitation/schemas"

export type { TeamInvitationsInput }

export interface InvitationItem {
  id: string
  email: string
  role: string
  createdAt: string
}

export interface GetTeamInvitationsResult {
  success: boolean
  error?: string
  inviteLink?: string
  inviteCode?: string
  invitations?: InvitationItem[]
}

export interface CreateTeamInvitationsResult {
  success: boolean
  error?: string
  fieldErrors?: Record<string, string>
  count?: number
  onboardingStep?: string
}

async function generateUniqueInviteCode(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = randomBytes(4).toString("hex")
    const existing = await tx.organization.findUnique({
      where: { inviteCode: candidate },
      select: { id: true },
    })
    if (!existing) {
      return candidate
    }
  }

  return randomUUID()
}

async function getAuthorizedSessionAndWorkspace(): Promise<
  | {
      authorized: true
      userId: string
      workspaceId: string
      reqHeaders: Headers
    }
  | {
      authorized: false
      error: string
    }
> {
  let reqHeaders: Headers
  try {
    reqHeaders = await headers()
  } catch {
    reqHeaders = new Headers()
  }

  const sessionData = await auth.api.getSession({
    headers: reqHeaders,
  })

  if (!sessionData?.user) {
    return {
      authorized: false,
      error: "Unauthorized. Please sign in to continue.",
    }
  }

  const userId = sessionData.user.id
  let workspaceId = sessionData.session.activeOrganizationId

  if (!workspaceId) {
    const member = await db.member.findFirst({
      where: { userId },
      select: { organizationId: true },
    })
    workspaceId = member?.organizationId || null
  }

  if (!workspaceId) {
    return {
      authorized: false,
      error: "No workspace found for your account. Please complete registration first.",
    }
  }

  const callerMember = await db.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId: workspaceId,
        userId,
      },
    },
  })

  if (!callerMember || (callerMember.role !== "owner" && callerMember.role !== "admin")) {
    return {
      authorized: false,
      error: "Forbidden. Only workspace owners and admins can invite members.",
    }
  }

  return {
    authorized: true,
    userId,
    workspaceId,
    reqHeaders,
  }
}

export async function getTeamInvitationsAction(): Promise<GetTeamInvitationsResult> {
  try {
    const authResult = await getAuthorizedSessionAndWorkspace()
    if (!authResult.authorized) {
      return {
        success: false,
        error: authResult.error,
      }
    }

    const { workspaceId, reqHeaders } = authResult

    const org = await db.organization.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, slug: true, inviteCode: true },
    })

    if (!org) {
      return {
        success: false,
        error: "Workspace not found.",
      }
    }

    let activeInviteCode = org.inviteCode
    if (!activeInviteCode) {
      activeInviteCode = await db.$transaction(async (tx) => {
        const code = await generateUniqueInviteCode(tx)
        await tx.organization.update({
          where: { id: workspaceId },
          data: { inviteCode: code },
        })
        return code
      })
    }

    const host =
      reqHeaders.get("x-forwarded-host") ||
      reqHeaders.get("host") ||
      "localhost:3000"
    const proto = reqHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https")
    const inviteLink = `${proto}://${host}/invite/${activeInviteCode}`

    const pendingInvites = await db.invitation.findMany({
      where: {
        organizationId: workspaceId,
        status: "pending",
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    return {
      success: true,
      inviteLink,
      inviteCode: activeInviteCode,
      invitations: pendingInvites.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        createdAt: inv.createdAt.toISOString(),
      })),
    }
  } catch (err: unknown) {
    console.error("getTeamInvitationsAction error:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load team invitations",
    }
  }
}

export async function createTeamInvitationsAction(
  rawInput: unknown
): Promise<CreateTeamInvitationsResult> {
  // 1. Zod input validation
  const validation = teamInvitationsSchema.safeParse(rawInput)
  if (!validation.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of validation.error.issues) {
      const field = issue.path[0] ? String(issue.path[0]) : "form"
      if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message
      }
    }
    return {
      success: false,
      error: validation.error.issues[0]?.message || "Validation failed",
      fieldErrors,
    }
  }

  const { validInvites, errors } = validateAndNormalizeInvites(validation.data.invites)
  if (errors && Object.keys(errors).length > 0) {
    return {
      success: false,
      error: Object.values(errors)[0] || "Invalid invitation inputs",
      fieldErrors: errors,
    }
  }

  try {
    // 2. Authorize via Session
    const authResult = await getAuthorizedSessionAndWorkspace()
    if (!authResult.authorized) {
      return {
        success: false,
        error: authResult.error,
      }
    }

    const { userId, workspaceId } = authResult

    // 3. Skip flow: if no emails are entered, advance onboardingStep directly
    if (validInvites.length === 0) {
      let nextStep = "launch"
      await db.$transaction(async (tx) => {
        const org = await tx.organization.findUnique({
          where: { id: workspaceId },
          select: { inviteCode: true, onboardingStep: true },
        })

        nextStep = resolveHighWatermarkStep(org?.onboardingStep, "launch")

        const updateData: { onboardingStep: string; inviteCode?: string } = {
          onboardingStep: nextStep,
        }

        if (!org?.inviteCode) {
          updateData.inviteCode = await generateUniqueInviteCode(tx)
        }

        await tx.organization.update({
          where: { id: workspaceId },
          data: updateData,
        })
      })

      return {
        success: true,
        count: 0,
        onboardingStep: nextStep,
      }
    }

    // 4. Check if any submitted email already belongs to an active workspace member
    const submittedEmails = validInvites.map((inv) => inv.email.toLowerCase())
    const existingMembers = await db.member.findMany({
      where: {
        organizationId: workspaceId,
        user: {
          email: {
            in: submittedEmails,
            mode: "insensitive",
          },
        },
      },
      include: {
        user: { select: { email: true } },
      },
    })

    if (existingMembers.length > 0) {
      const memberEmail = existingMembers[0].user.email
      return {
        success: false,
        error: `User "${memberEmail}" is already a member of this workspace.`,
      }
    }

    // 5. In an atomic transaction, ensure inviteCode, upsert invitations with SHA-256 token hashes, and advance step
    let nextStep = "launch"
    await db.$transaction(async (tx) => {
      const org = await tx.organization.findUnique({
        where: { id: workspaceId },
        select: { inviteCode: true, onboardingStep: true },
      })

      nextStep = resolveHighWatermarkStep(org?.onboardingStep, "launch")

      const updateOrgData: { onboardingStep: string; inviteCode?: string } = {
        onboardingStep: nextStep,
      }

      if (!org?.inviteCode) {
        updateOrgData.inviteCode = await generateUniqueInviteCode(tx)
      }

      await tx.organization.update({
        where: { id: workspaceId },
        data: updateOrgData,
      })

      for (const invite of validInvites) {
        const rawToken = randomBytes(32).toString("hex")
        const tokenHash = createHash("sha256").update(rawToken).digest("hex")
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

        await tx.invitation.upsert({
          where: {
            organizationId_email: {
              organizationId: workspaceId,
              email: invite.email,
            },
          },
          create: {
            organizationId: workspaceId,
            email: invite.email,
            role: invite.role as Role,
            status: "pending",
            token: tokenHash,
            expiresAt,
            inviterId: userId,
          },
          update: {
            role: invite.role as Role,
            status: "pending",
            token: tokenHash,
            expiresAt,
            inviterId: userId,
          },
        })
      }
    })

    return {
      success: true,
      count: validInvites.length,
      onboardingStep: nextStep,
    }
  } catch (err: unknown) {
    console.error("createTeamInvitationsAction error:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred while saving team invitations",
    }
  }
}
