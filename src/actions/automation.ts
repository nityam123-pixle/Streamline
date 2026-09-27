"use server"

import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { resolveHighWatermarkStep } from "@/lib/onboarding/routing"
import {
  automationPreferencesSchema,
  type AutomationPreferencesInput,
} from "@/lib/automation/schemas"

export type { AutomationPreferencesInput }

export interface UpdateAutomationPreferencesResult {
  success: boolean
  error?: string
  fieldErrors?: Record<string, string>
  organization?: {
    id: string
    name: string
    automationAreas: string[]
    onboardingStep: string
  }
}

export interface GetAutomationPreferencesResult {
  success: boolean
  error?: string
  automationAreas?: string[]
}

export async function getAutomationPreferencesAction(): Promise<GetAutomationPreferencesResult> {
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
      select: { automationAreas: true },
    })

    let automationAreas: string[] = []
    if (org?.automationAreas && Array.isArray(org.automationAreas)) {
      automationAreas = org.automationAreas.map((item) => String(item))
    }

    return {
      success: true,
      automationAreas,
    }
  } catch (err: unknown) {
    console.error("getAutomationPreferencesAction error:", err)
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to load automation preferences",
    }
  }
}

export async function updateAutomationPreferencesAction(
  rawInput: unknown
): Promise<UpdateAutomationPreferencesResult> {
  // 1. Validate Input
  const validation = automationPreferencesSchema.safeParse(rawInput)
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

    // 3. Atomically persist automation preferences and advance step using high watermark logic
    const currentOrg = await db.organization.findUnique({
      where: { id: workspaceId },
      select: { onboardingStep: true },
    })
    const nextStep = resolveHighWatermarkStep(currentOrg?.onboardingStep, "tools")

    const updatedOrg = await db.organization.update({
      where: { id: workspaceId },
      data: {
        automationAreas: data.automationAreas,
        onboardingStep: nextStep,
      },
    })

    const parsedAreas: string[] = Array.isArray(updatedOrg.automationAreas)
      ? updatedOrg.automationAreas.map((item) => String(item))
      : []

    return {
      success: true,
      organization: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        automationAreas: parsedAreas,
        onboardingStep: updatedOrg.onboardingStep,
      },
    }
  } catch (err: unknown) {
    console.error("updateAutomationPreferencesAction error:", err)
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while saving automation preferences",
    }
  }
}
