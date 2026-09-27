"use server"

import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { resolveHighWatermarkStep } from "@/lib/onboarding/routing"
import { workspaceProfileSchema, type WorkspaceProfileInput } from "@/lib/workspace/schemas"

export type { WorkspaceProfileInput }

export interface UpdateWorkspaceProfileResult {
  success: boolean
  error?: string
  fieldErrors?: Record<string, string>
  user?: {
    id: string
    firstName: string
    lastName: string
    fullName: string
  }
  organization?: {
    id: string
    name: string
    teamSize: string | null
    onboardingStep: string
  }
}

export interface GetWorkspaceProfileResult {
  success: boolean
  error?: string
  profile?: {
    firstName: string
    lastName: string
    companyName: string
    role: string
    teamSize: string
  }
}

export async function getWorkspaceProfileAction(): Promise<GetWorkspaceProfileResult> {
  try {
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
        success: false,
        error: "Unauthorized. Please sign in to continue.",
      }
    }

    const userId = sessionData.user.id
    const user = await db.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return {
        success: false,
        error: "User not found.",
      }
    }

    let workspaceId = sessionData.session.activeOrganizationId
    if (!workspaceId) {
      const member = await db.member.findFirst({
        where: { userId },
        select: { organizationId: true },
      })
      workspaceId = member?.organizationId || null
    }

    let org = null
    let member = null

    if (workspaceId) {
      org = await db.organization.findUnique({
        where: { id: workspaceId },
      })
      member = await db.member.findFirst({
        where: { organizationId: workspaceId, userId },
      })
    }

    // Prefill first and last name from user model or fallback to name split
    const nameParts = (user.name || "").trim().split(/\s+/)
    const firstName = user.firstName || nameParts[0] || ""
    const lastName = user.lastName || nameParts.slice(1).join(" ") || ""

    // Don't prefill default generated "Name's Workspace" as company name so placeholder shows
    const isDefaultWorkspaceName = org?.name ? org.name.endsWith("'s Workspace") : false
    const companyName = org?.name && !isDefaultWorkspaceName ? org.name : ""

    return {
      success: true,
      profile: {
        firstName,
        lastName,
        companyName,
        role: member?.jobTitle || "",
        teamSize: org?.teamSize || "",
      },
    }
  } catch (err: unknown) {
    console.error("getWorkspaceProfileAction error:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load workspace profile",
    }
  }
}

export async function updateWorkspaceProfileAction(
  rawInput: unknown
): Promise<UpdateWorkspaceProfileResult> {
  // 1. Validate Input
  const validation = workspaceProfileSchema.safeParse(rawInput)
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

  const data = validation.data

  try {
    // 2. Authorize via Session
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
        success: false,
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
      if (!member) {
        return {
          success: false,
          error: "No workspace found for your account. Please complete registration first.",
        }
      }
      workspaceId = member.organizationId
    }

    // 3. Atomically persist User profile, Organization metadata, and Member job title
    const fullName = `${data.firstName} ${data.lastName}`.trim()

    const result = await db.$transaction(async (tx) => {
      // Update User names
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          name: fullName,
        },
      })

      // Fetch current organization onboardingStep to apply high watermark progression
      const currentOrg = await tx.organization.findUnique({
        where: { id: workspaceId },
        select: { onboardingStep: true },
      })
      const nextStep = resolveHighWatermarkStep(currentOrg?.onboardingStep, "automation")

      // Update Organization metadata and advance step with high watermark logic
      const updatedOrg = await tx.organization.update({
        where: { id: workspaceId },
        data: {
          name: data.companyName,
          teamSize: data.teamSize,
          onboardingStep: nextStep,
        },
      })

      // Update Member jobTitle with selected role
      await tx.member.updateMany({
        where: {
          organizationId: workspaceId,
          userId,
        },
        data: {
          jobTitle: data.role,
        },
      })

      return {
        user: updatedUser,
        organization: updatedOrg,
      }
    })

    return {
      success: true,
      user: {
        id: result.user.id,
        firstName: result.user.firstName || data.firstName,
        lastName: result.user.lastName || data.lastName,
        fullName: result.user.name,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        teamSize: result.organization.teamSize,
        onboardingStep: result.organization.onboardingStep,
      },
    }
  } catch (err: unknown) {
    console.error("updateWorkspaceProfileAction error:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred while saving your profile",
    }
  }
}
