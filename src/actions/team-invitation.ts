"use server"

import { headers } from "next/headers"
import { randomBytes, randomUUID, createHash } from "crypto"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Role } from "@prisma/client"
import { resolveHighWatermarkStep } from "@/lib/onboarding/routing"
import { batchSendTeamInviteEmails } from "@/lib/email/invite"
import {
  teamInvitationsSchema,
  validateAndNormalizeInvites,
  acceptTokenInvitationSchema,
  joinOrganizationByCodeSchema,
  type TeamInvitationsInput,
  type AcceptTokenInvitationInput,
  type JoinOrganizationByCodeInput,
  type AcceptInvitationResult,
} from "@/lib/team-invitation/schemas"

export type {
  TeamInvitationsInput,
  AcceptTokenInvitationInput,
  JoinOrganizationByCodeInput,
  AcceptInvitationResult,
}

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
  emailWarnings?: string[]
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

async function getAuthorizedSessionAndWorkspace(customHeaders?: Headers): Promise<
  | {
      authorized: true
      userId: string
      userName: string
      userEmail: string
      workspaceId: string
      reqHeaders: Headers
    }
  | {
      authorized: false
      error: string
    }
> {
  let reqHeaders: Headers
  if (customHeaders) {
    reqHeaders = customHeaders
  } else {
    try {
      reqHeaders = await headers()
    } catch {
      reqHeaders = new Headers()
    }
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
    userName: sessionData.user.name || "A team member",
    userEmail: sessionData.user.email || "dispatch@streamline.app",
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
    const inviteLink = `${proto}://${host}/join/${activeInviteCode}`

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
  rawInput: unknown,
  customHeaders?: Headers
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
    const authResult = await getAuthorizedSessionAndWorkspace(customHeaders)
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
    let workspaceName = "Workspace"
    const createdInviteTokens: Array<{
      invitationId: string
      email: string
      role: string
      rawToken: string
    }> = []

    await db.$transaction(async (tx) => {
      const org = await tx.organization.findUnique({
        where: { id: workspaceId },
        select: { name: true, inviteCode: true, onboardingStep: true },
      })

      if (org?.name) {
        workspaceName = org.name
      }

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

        const invRecord = await tx.invitation.upsert({
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
          select: { id: true },
        })

        createdInviteTokens.push({
          invitationId: invRecord.id,
          email: invite.email,
          role: invite.role,
          rawToken,
        })
      }
    })

    // 6. Dispatch transactional invite emails with error isolation (AC-1, AC-5, AC-6)
    const host =
      authResult.reqHeaders.get("x-forwarded-host") ||
      authResult.reqHeaders.get("host") ||
      "localhost:3000"
    const proto =
      authResult.reqHeaders.get("x-forwarded-proto") ||
      (host.includes("localhost") ? "http" : "https")
    const baseUrl = `${proto}://${host}`

    let emailWarnings: string[] | undefined
    if (createdInviteTokens.length > 0) {
      // Check if inviter's email is verified to protect platform domain reputation (AC-7)
      const inviterUser = await db.user.findUnique({
        where: { id: userId },
        select: { emailVerified: true },
      })

      if (!inviterUser?.emailVerified) {
        emailWarnings = [
          "Email dispatch is held until your email address is verified. You can still share the invite link directly with teammates.",
        ]
      } else {
        const dispatchResult = await batchSendTeamInviteEmails({
          invites: createdInviteTokens,
          inviterName: authResult.userName,
          inviterEmail: authResult.userEmail,
          workspaceName,
          baseUrl,
        })

        if (dispatchResult.warnings.length > 0) {
          emailWarnings = dispatchResult.warnings
        }
      }
    }

    return {
      success: true,
      count: validInvites.length,
      onboardingStep: nextStep,
      ...(emailWarnings && emailWarnings.length > 0 ? { emailWarnings } : {}),
    }
  } catch (err: unknown) {
    console.error("createTeamInvitationsAction error:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred while saving team invitations",
    }
  }
}

export interface GetInvitationByTokenResult {
  success: boolean
  error?: string
  alreadyAccepted?: boolean
  isExpired?: boolean
  invitation?: {
    id: string
    email: string
    role: string
    organizationId: string
    organizationName: string
    inviterName: string
  }
  currentUser?: {
    id: string
    email: string
    name: string
  } | null
  isCurrentEmailMatch?: boolean
  isAlreadyMember?: boolean
}

export async function getInvitationByTokenAction(
  token: string
): Promise<GetInvitationByTokenResult> {
  if (!token || typeof token !== "string" || !token.trim()) {
    return {
      success: false,
      error: "Invitation token is required.",
    }
  }

  const cleanToken = token.trim()
  const tokenHash = createHash("sha256").update(cleanToken).digest("hex")

  try {
    const invitation = await db.invitation.findFirst({
      where: {
        OR: [
          { token: tokenHash },
          { token: cleanToken },
        ],
      },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
        inviter: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!invitation) {
      return {
        success: false,
        error: "Invitation not found or link has expired.",
      }
    }

    if (invitation.status === "accepted") {
      return {
        success: false,
        alreadyAccepted: true,
        error: "This invitation has already been accepted.",
      }
    }

    if (invitation.status !== "pending") {
      return {
        success: false,
        error: "This invitation is no longer active.",
      }
    }

    if (invitation.expiresAt < new Date()) {
      return {
        success: false,
        isExpired: true,
        error: "This invitation has expired. Please ask your workspace owner for a new invite.",
      }
    }

    let reqHeaders: Headers
    try {
      reqHeaders = await headers()
    } catch {
      reqHeaders = new Headers()
    }

    let sessionData = null
    try {
      sessionData = await auth.api.getSession({
        headers: reqHeaders,
      })
    } catch {
      sessionData = null
    }

    let currentUser = null
    let isCurrentEmailMatch = false
    let isAlreadyMember = false

    if (sessionData?.user) {
      currentUser = {
        id: sessionData.user.id,
        email: sessionData.user.email,
        name: sessionData.user.name,
      }
      isCurrentEmailMatch =
        sessionData.user.email.toLowerCase() === invitation.email.toLowerCase()

      const member = await db.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId: sessionData.user.id,
          },
        },
      })
      isAlreadyMember = !!member
    }

    return {
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        organizationId: invitation.organizationId,
        organizationName: invitation.organization.name,
        inviterName:
          invitation.inviter?.name || invitation.inviter?.email || "A team member",
      },
      currentUser,
      isCurrentEmailMatch,
      isAlreadyMember,
    }
  } catch (err: unknown) {
    console.error("getInvitationByTokenAction error:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load invitation",
    }
  }
}

export async function acceptTokenInvitationAction(
  rawInput: unknown
): Promise<AcceptInvitationResult> {
  const validation = acceptTokenInvitationSchema.safeParse(rawInput)
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || "Invalid invitation input",
    }
  }

  const { token, name, password } = validation.data
  const cleanToken = token.trim()
  const tokenHash = createHash("sha256").update(cleanToken).digest("hex")

  try {
    const invitation = await db.invitation.findFirst({
      where: {
        OR: [
          { token: tokenHash },
          { token: cleanToken },
        ],
      },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    })

    if (!invitation) {
      return {
        success: false,
        error: "Invitation not found or link has expired.",
      }
    }

    if (invitation.status === "accepted") {
      return {
        success: false,
        error: "This invitation has already been accepted.",
      }
    }

    if (invitation.status !== "pending") {
      return {
        success: false,
        error: "This invitation is no longer active.",
      }
    }

    if (invitation.expiresAt < new Date()) {
      return {
        success: false,
        error: "This invitation has expired. Please ask your workspace owner for a new invite.",
      }
    }

    let reqHeaders: Headers
    try {
      reqHeaders = await headers()
    } catch {
      reqHeaders = new Headers()
    }

    let sessionData = null
    try {
      sessionData = await auth.api.getSession({
        headers: reqHeaders,
      })
    } catch {
      sessionData = null
    }

    if (sessionData?.user) {
      // Authenticated acceptance flow
      const currentUserEmail = sessionData.user.email.toLowerCase()
      const invitedEmail = invitation.email.toLowerCase()

      if (currentUserEmail !== invitedEmail) {
        return {
          success: false,
          emailMismatch: true,
          error: `You are signed in as ${sessionData.user.email}. Please sign out and sign in with ${invitation.email} to accept this invitation.`,
        }
      }

      const existingMember = await db.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId: sessionData.user.id,
          },
        },
      })

      await db.$transaction(async (tx) => {
        if (!existingMember) {
          await tx.member.create({
            data: {
              organizationId: invitation.organizationId,
              userId: sessionData.user.id,
              role: invitation.role,
            },
          })
        }

        await tx.invitation.update({
          where: { id: invitation.id },
          data: { status: "accepted" },
        })

        if (sessionData.session?.token) {
          await tx.session.updateMany({
            where: { token: sessionData.session.token },
            data: { activeOrganizationId: invitation.organizationId },
          })
        }
      })

      return {
        success: true,
        redirectUrl: "/launch",
        role: invitation.role,
        organizationName: invitation.organization.name,
      }
    }

    // Unauthenticated registration flow
    if (!name || !name.trim()) {
      return {
        success: false,
        error: "Please enter your full name.",
      }
    }

    if (!password || password.length < 8) {
      return {
        success: false,
        error: "Password must be at least 8 characters.",
      }
    }

    // AC-9: Prevent registration collision if email already exists in User table
    const existingUser = await db.user.findUnique({
      where: { email: invitation.email.toLowerCase() },
    })

    if (existingUser) {
      return {
        success: false,
        requiresLogin: true,
        error: "An account with this email already exists. Please log in first to accept this invitation.",
      }
    }

    const signUpResult = await auth.api.signUpEmail({
      body: {
        name: name.trim(),
        email: invitation.email.toLowerCase(),
        password,
      },
      headers: reqHeaders,
    })

    if (!signUpResult || !signUpResult.user) {
      return {
        success: false,
        error: "Failed to create account. Please try again.",
      }
    }

    const userId = signUpResult.user.id
    const nameParts = name.trim().split(/\s+/)
    const firstName = nameParts[0] || ""
    const lastName = nameParts.slice(1).join(" ") || ""

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          firstName: firstName || null,
          lastName: lastName || null,
        },
      })

      await tx.member.create({
        data: {
          organizationId: invitation.organizationId,
          userId,
          role: invitation.role,
        },
      })

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: "accepted" },
      })

      if (signUpResult.token) {
        await tx.session.updateMany({
          where: { token: signUpResult.token },
          data: { activeOrganizationId: invitation.organizationId },
        })
      } else {
        const latestSession = await tx.session.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        })
        if (latestSession) {
          await tx.session.update({
            where: { id: latestSession.id },
            data: { activeOrganizationId: invitation.organizationId },
          })
        }
      }
    })

    return {
      success: true,
      redirectUrl: "/launch",
      role: invitation.role,
      organizationName: invitation.organization.name,
    }
  } catch (err: unknown) {
    console.error("acceptTokenInvitationAction error:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to accept invitation.",
    }
  }
}

export interface GetOrganizationByCodeResult {
  success: boolean
  error?: string
  organization?: {
    id: string
    name: string
    slug: string
    inviteCode: string | null
  }
  currentUser?: {
    id: string
    email: string
    name: string
  } | null
  isAlreadyMember?: boolean
}

export async function getOrganizationByCodeAction(
  code: string
): Promise<GetOrganizationByCodeResult> {
  if (!code || typeof code !== "string" || !code.trim()) {
    return {
      success: false,
      error: "Invite code is required.",
    }
  }

  const cleanCode = code.trim()

  try {
    const org = await db.organization.findUnique({
      where: { inviteCode: cleanCode },
      select: {
        id: true,
        name: true,
        slug: true,
        inviteCode: true,
      },
    })

    if (!org) {
      return {
        success: false,
        error: "Workspace invite link not found or invalid.",
      }
    }

    let reqHeaders: Headers
    try {
      reqHeaders = await headers()
    } catch {
      reqHeaders = new Headers()
    }

    let sessionData = null
    try {
      sessionData = await auth.api.getSession({
        headers: reqHeaders,
      })
    } catch {
      sessionData = null
    }

    let currentUser = null
    let isAlreadyMember = false

    if (sessionData?.user) {
      currentUser = {
        id: sessionData.user.id,
        email: sessionData.user.email,
        name: sessionData.user.name,
      }

      const member = await db.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: org.id,
            userId: sessionData.user.id,
          },
        },
      })
      isAlreadyMember = !!member
    }

    return {
      success: true,
      organization: org,
      currentUser,
      isAlreadyMember,
    }
  } catch (err: unknown) {
    console.error("getOrganizationByCodeAction error:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load workspace details.",
    }
  }
}

export async function joinOrganizationByCodeAction(
  rawInput: unknown
): Promise<AcceptInvitationResult> {
  const validation = joinOrganizationByCodeSchema.safeParse(rawInput)
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || "Invalid input",
    }
  }

  const { inviteCode, email, name, password } = validation.data

  try {
    const org = await db.organization.findUnique({
      where: { inviteCode },
      select: { id: true, name: true, slug: true },
    })

    if (!org) {
      return {
        success: false,
        error: "Workspace invite link not found or invalid.",
      }
    }

    let reqHeaders: Headers
    try {
      reqHeaders = await headers()
    } catch {
      reqHeaders = new Headers()
    }

    let sessionData = null
    try {
      sessionData = await auth.api.getSession({
        headers: reqHeaders,
      })
    } catch {
      sessionData = null
    }

    if (sessionData?.user) {
      // Authenticated flow: One-click join with default viewer role
      const userId = sessionData.user.id
      const existingMember = await db.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: org.id,
            userId,
          },
        },
      })

      await db.$transaction(async (tx) => {
        if (!existingMember) {
          await tx.member.create({
            data: {
              organizationId: org.id,
              userId,
              role: "viewer",
            },
          })
        }

        if (sessionData.session?.token) {
          await tx.session.updateMany({
            where: { token: sessionData.session.token },
            data: { activeOrganizationId: org.id },
          })
        }
      })

      return {
        success: true,
        redirectUrl: "/launch",
        role: existingMember?.role || "viewer",
        organizationName: org.name,
      }
    }

    // Unauthenticated flow
    if (!email || !email.includes("@")) {
      return {
        success: false,
        error: "Please enter a valid email address.",
      }
    }

    if (!name || !name.trim()) {
      return {
        success: false,
        error: "Please enter your full name.",
      }
    }

    if (!password || password.length < 8) {
      return {
        success: false,
        error: "Password must be at least 8 characters.",
      }
    }

    const normalizedEmail = email.trim().toLowerCase()

    // AC-9: Check if submitted email already belongs to an existing User
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return {
        success: false,
        requiresLogin: true,
        error: "An account with this email already exists. Please log in first to accept this invitation.",
      }
    }

    const signUpResult = await auth.api.signUpEmail({
      body: {
        name: name.trim(),
        email: normalizedEmail,
        password,
      },
      headers: reqHeaders,
    })

    if (!signUpResult || !signUpResult.user) {
      return {
        success: false,
        error: "Failed to create account. Please try again.",
      }
    }

    const userId = signUpResult.user.id
    const nameParts = name.trim().split(/\s+/)
    const firstName = nameParts[0] || ""
    const lastName = nameParts.slice(1).join(" ") || ""

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          firstName: firstName || null,
          lastName: lastName || null,
        },
      })

      await tx.member.create({
        data: {
          organizationId: org.id,
          userId,
          role: "viewer",
        },
      })

      if (signUpResult.token) {
        await tx.session.updateMany({
          where: { token: signUpResult.token },
          data: { activeOrganizationId: org.id },
        })
      } else {
        const latestSession = await tx.session.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        })
        if (latestSession) {
          await tx.session.update({
            where: { id: latestSession.id },
            data: { activeOrganizationId: org.id },
          })
        }
      }
    })

    return {
      success: true,
      redirectUrl: "/launch",
      role: "viewer",
      organizationName: org.name,
    }
  } catch (err: unknown) {
    console.error("joinOrganizationByCodeAction error:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to join workspace.",
    }
  }
}

