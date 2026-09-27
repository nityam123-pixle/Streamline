"use server"

import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { randomBytes, randomUUID } from "crypto"
import { signUpSchema, type SignUpInput } from "@/lib/auth/schemas"

export type { SignUpInput }

export interface SignUpActionResult {
  success: boolean
  error?: string
  fieldErrors?: Record<string, string>
  user?: {
    id: string
    email: string
    fullName: string
    firstName: string
    lastName: string
  }
  organization?: {
    id: string
    name: string
    slug: string
  }
}

async function generateUniqueWorkspaceSlug(
  baseName: string,
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]
): Promise<string> {
  const cleanBase =
    baseName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 20) || "workspace"

  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = randomBytes(4).toString("hex")
    const candidate = `${cleanBase}-${suffix}`
    const existing = await tx.organization.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    if (!existing) {
      return candidate
    }
  }

  return `${cleanBase}-${randomUUID()}`
}

export async function signUpAction(rawInput: unknown): Promise<SignUpActionResult> {
  // 1. Zod Validation
  const validation = signUpSchema.safeParse(rawInput)
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

  const { fullName, email, password } = validation.data

  try {
    // 2. Check for duplicate account
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return {
        success: false,
        error: "An account with this email already exists. Please sign in instead.",
      }
    }

    // 3. Register user and session via Better Auth
    let reqHeaders: Headers
    try {
      reqHeaders = await headers()
    } catch {
      reqHeaders = new Headers()
    }

    const signUpResult = await auth.api.signUpEmail({
      body: {
        name: fullName,
        email,
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

    // 4. Derive first and last name
    const nameParts = fullName.trim().split(/\s+/)
    const firstName = nameParts[0] || ""
    const lastName = nameParts.slice(1).join(" ") || ""

    // 5. Atomically persist user profile, workspace, member, and session inside a transaction
    let organization: { id: string; name: string; slug: string }
    try {
      organization = await db.$transaction(async (tx) => {
        // Update user first and last name
        await tx.user.update({
          where: { id: userId },
          data: {
            firstName: firstName || null,
            lastName: lastName || null,
          },
        })

        // Generate collision safe unique workspace slug
        const workspaceSlug = await generateUniqueWorkspaceSlug(firstName, tx)
        const workspaceName = `${fullName}'s Workspace`

        // Create organization and owner member atomically
        const org = await tx.organization.create({
          data: {
            name: workspaceName,
            slug: workspaceSlug,
            onboardingStep: "welcome",
            members: {
              create: {
                userId,
                role: "owner",
              },
            },
          },
        })

        // Associate active organization on the created session
        if (signUpResult.token) {
          await tx.session.updateMany({
            where: { token: signUpResult.token },
            data: { activeOrganizationId: org.id },
          })
        }

        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
        }
      })
    } catch (txError) {
      // Clean up orphaned Better Auth user if workspace transaction fails
      try {
        await db.user.delete({ where: { id: userId } })
      } catch (cleanupError) {
        console.error("Failed to clean up orphaned user after transaction failure:", cleanupError)
      }
      throw txError
    }

    return {
      success: true,
      user: {
        id: userId,
        email: signUpResult.user.email,
        fullName,
        firstName,
        lastName,
      },
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
    }
  } catch (err: unknown) {
    console.error("signUpAction error:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred during signup",
    }
  }
}
