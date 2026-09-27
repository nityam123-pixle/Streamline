"use server"

import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  type LaunchSummaryData,
  getCompanyInitials,
  formatUserRole,
  formatAutomatingText,
  formatWorkflowText,
  formatIntegrationsText,
  formatInvitedTeammatesText,
} from "@/lib/launch/schemas"

export type { LaunchSummaryData }

export interface GetLaunchSummaryResult {
  success: boolean
  error?: string
  summary?: LaunchSummaryData
}

export interface CompleteOnboardingResult {
  success: boolean
  error?: string
  onboardingStep?: string
}

async function getAuthorizedSession() {
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
      authorized: false as const,
      error: "Unauthorized. Please sign in to continue.",
      reqHeaders,
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
      authorized: false as const,
      error: "No workspace found.",
      reqHeaders,
    }
  }

  return {
    authorized: true as const,
    userId,
    workspaceId,
    reqHeaders,
  }
}

export async function getLaunchSummaryAction(): Promise<GetLaunchSummaryResult> {
  try {
    const authResult = await getAuthorizedSession()
    if (!authResult.authorized) {
      return {
        success: false,
        error: authResult.error,
      }
    }

    const { workspaceId, userId, reqHeaders } = authResult

    const [org, member, pendingInvitationsCount] = await Promise.all([
      db.organization.findUnique({
        where: { id: workspaceId },
        select: {
          id: true,
          name: true,
          inviteCode: true,
          onboardingStep: true,
          automationAreas: true,
          selectedTools: true,
        },
      }),
      db.member.findFirst({
        where: { organizationId: workspaceId, userId },
        select: { role: true, jobTitle: true },
      }),
      db.invitation.count({
        where: { organizationId: workspaceId, status: "pending" },
      }),
    ])

    if (!org) {
      return {
        success: false,
        error: "Workspace not found.",
      }
    }

    const companyName = org.name || ""
    const companyInitials = getCompanyInitials(companyName)
    const userRole = formatUserRole(member?.jobTitle, member?.role, companyName)
    const automatingText = formatAutomatingText(org.automationAreas)
    const workflowText = formatWorkflowText(org.automationAreas)
    const integrationsText = formatIntegrationsText(org.selectedTools)
    const invitedTeammatesText = formatInvitedTeammatesText(pendingInvitationsCount)

    let shareableInviteLink: string | null = null
    if (org.inviteCode && typeof org.inviteCode === "string" && org.inviteCode.trim().length > 0) {
      const host =
        reqHeaders.get("x-forwarded-host") ||
        reqHeaders.get("host") ||
        "localhost:3000"
      const proto =
        reqHeaders.get("x-forwarded-proto") ||
        (host.includes("localhost") ? "http" : "https")
      shareableInviteLink = `${proto}://${host}/invite/${org.inviteCode.trim()}`
    }

    return {
      success: true,
      summary: {
        companyName,
        companyInitials,
        userRole,
        automatingText,
        integrationsText,
        workflowText,
        invitedCount: pendingInvitationsCount,
        invitedTeammatesText,
        inviteCode: org.inviteCode || null,
        shareableInviteLink,
        onboardingStep: org.onboardingStep,
      },
    }
  } catch (err: unknown) {
    console.error("getLaunchSummaryAction error:", err)
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to load launch summary",
    }
  }
}

export async function completeOnboardingAction(): Promise<CompleteOnboardingResult> {
  try {
    const authResult = await getAuthorizedSession()
    if (!authResult.authorized) {
      return {
        success: false,
        error: authResult.error,
      }
    }

    const { workspaceId, userId } = authResult

    const member = await db.member.findFirst({
      where: { organizationId: workspaceId, userId },
      select: { role: true },
    })

    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      return {
        success: false,
        error: "Forbidden. Only workspace owners or admins can complete onboarding.",
      }
    }

    const updatedOrg = await db.organization.update({
      where: { id: workspaceId },
      data: { onboardingStep: "completed" },
      select: { id: true, onboardingStep: true },
    })

    return {
      success: true,
      onboardingStep: updatedOrg.onboardingStep,
    }
  } catch (err: unknown) {
    console.error("completeOnboardingAction error:", err)
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to complete onboarding",
    }
  }
}
