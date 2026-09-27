"use server"

import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { resolveHighWatermarkStep } from "@/lib/onboarding/routing"
import {
  selectedToolsSchema,
  type SelectedToolsInput,
} from "@/lib/tools/schemas"

export type { SelectedToolsInput }

export interface UpdateToolsResult {
  success: boolean
  error?: string
  fieldErrors?: Record<string, string>
  organization?: {
    id: string
    name: string
    selectedTools: string[]
    onboardingStep: string
  }
}

export interface GetToolsResult {
  success: boolean
  error?: string
  selectedTools?: string[]
}

export async function getToolsAction(): Promise<GetToolsResult> {
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
        success: false,
        error: "No workspace found for your account.",
      }
    }

    const org = await db.organization.findUnique({
      where: { id: workspaceId },
      select: { selectedTools: true },
    })

    let selectedTools: string[] = []
    if (org?.selectedTools && Array.isArray(org.selectedTools)) {
      selectedTools = org.selectedTools.map((item) => String(item))
    }

    return {
      success: true,
      selectedTools,
    }
  } catch (err: unknown) {
    console.error("getToolsAction error:", err)
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Failed to load selected tools",
    }
  }
}

export async function updateToolsAction(
  rawInput: unknown
): Promise<UpdateToolsResult> {
  // 1. Validate Input
  const validation = selectedToolsSchema.safeParse(rawInput)
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
          error:
            "No workspace found for your account. Please complete registration first.",
        }
      }
      workspaceId = member.organizationId
    }

    // 3. Atomically persist selected tools and advance step using high watermark logic
    const currentOrg = await db.organization.findUnique({
      where: { id: workspaceId },
      select: { onboardingStep: true },
    })
    const nextStep = resolveHighWatermarkStep(currentOrg?.onboardingStep, "team-invitation")

    const updatedOrg = await db.organization.update({
      where: { id: workspaceId },
      data: {
        selectedTools: data.selectedTools,
        onboardingStep: nextStep,
      },
    })

    const parsedTools: string[] = Array.isArray(updatedOrg.selectedTools)
      ? updatedOrg.selectedTools.map((item) => String(item))
      : []

    return {
      success: true,
      organization: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        selectedTools: parsedTools,
        onboardingStep: updatedOrg.onboardingStep,
      },
    }
  } catch (err: unknown) {
    console.error("updateToolsAction error:", err)
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while saving your selected tools",
    }
  }
}
