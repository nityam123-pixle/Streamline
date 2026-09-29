"use server"

import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { randomBytes, randomUUID } from "crypto"
import {
  signUpSchema,
  type SignUpInput,
  forgotPasswordSchema,
  type ForgotPasswordInput,
  resetPasswordSchema,
  type ResetPasswordInput,
  resendVerificationSchema,
  type ResendVerificationInput,
  verifyEmailSchema,
  type VerifyEmailInput,
} from "@/lib/auth/schemas"
import { sendResetPasswordEmail } from "@/lib/email/password-reset"
import { sendVerificationEmail } from "@/lib/email/verification"
import { hashPassword } from "better-auth/crypto"
import { env } from "@/lib/env"

export type {
  SignUpInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ResendVerificationInput,
  VerifyEmailInput,
}

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

    // 6. Generate secure verification token and dispatch branded verification email (AC-1, AC-6)
    try {
      const rawToken = randomBytes(32).toString("hex")
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      const normalizedEmail = email.toLowerCase().trim()

      await db.verification.create({
        data: {
          identifier: `email-verification:${normalizedEmail}`,
          value: rawToken,
          expiresAt,
        },
      })

      let baseUrl = process.env.BETTER_AUTH_URL || env.BETTER_AUTH_URL || "http://localhost:3000"
      try {
        const configuredUrl = process.env.BETTER_AUTH_URL || env.BETTER_AUTH_URL
        if (configuredUrl) {
          baseUrl = configuredUrl
        } else {
          const host = reqHeaders.get("x-forwarded-host") || reqHeaders.get("host")
          const proto = reqHeaders.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https")
          if (
            host &&
            /^(localhost(:\d+)?|127\.0\.0\.1(:\d+)?|([a-zA-Z0-9-]+\.)*streamline\.io)$/.test(host)
          ) {
            baseUrl = `${proto}://${host}`
          }
        }
      } catch {
        // fallback
      }

      const cleanBase = baseUrl.replace(/\/+$/, "")
      const verifyUrl = `${cleanBase}/verify-email?token=${rawToken}`

      await sendVerificationEmail({
        to: normalizedEmail,
        userName: fullName,
        verifyUrl,
      })
    } catch (emailError) {
      // Do not fail account registration if verification email dispatch encounters an error
      console.warn("Failed to dispatch initial verification email upon signup:", emailError)
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

export interface RequestPasswordResetResult {
  success: boolean
  message: string
  error?: string
}

export interface ValidateResetTokenResult {
  valid: boolean
  reason?: "invalid" | "expired" | "consumed"
}

export interface ResetPasswordResult {
  success: boolean
  error?: string
  fieldErrors?: Record<string, string>
}

/**
 * Initiates self service password recovery.
 * Defends against account enumeration with constant response timing and identical generic confirmation.
 */
export async function requestPasswordResetAction(
  rawInput: unknown
): Promise<RequestPasswordResetResult> {
  const startTime = Date.now()
  const validation = forgotPasswordSchema.safeParse(rawInput)

  if (!validation.success) {
    return {
      success: false,
      message: "Please enter a valid work email address",
      error: validation.error.issues[0]?.message || "Validation failed",
    }
  }

  const email = validation.data.email.toLowerCase()

  try {
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    })

    if (user) {
      // Enforce 60 second cooldown on token creation
      const sixtySecondsAgo = new Date(Date.now() - 60 * 1000)
      const recentVerification = await db.verification.findFirst({
        where: {
          identifier: `reset-password:${email}`,
          createdAt: { gt: sixtySecondsAgo },
        },
      })

      if (!recentVerification) {
        const rawToken = randomBytes(32).toString("hex")
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

        await db.verification.create({
          data: {
            identifier: `reset-password:${email}`,
            value: rawToken,
            expiresAt,
          },
        })

        let baseUrl = process.env.BETTER_AUTH_URL || env.BETTER_AUTH_URL || "http://localhost:3000"
        try {
          const configuredUrl = process.env.BETTER_AUTH_URL || env.BETTER_AUTH_URL
          if (configuredUrl) {
            baseUrl = configuredUrl
          } else {
            const h = await headers()
            const host = h.get("x-forwarded-host") || h.get("host")
            const proto = h.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https")
            // Validate host to prevent password reset link poisoning
            if (
              host &&
              /^(localhost(:\d+)?|127\.0\.0\.1(:\d+)?|([a-zA-Z0-9-]+\.)*streamline\.io)$/.test(host)
            ) {
              baseUrl = `${proto}://${host}`
            }
          }
        } catch {
          // fallback to configured baseUrl
        }

        const cleanBase = baseUrl.replace(/\/+$/, "")
        const resetUrl = `${cleanBase}/reset-password?token=${rawToken}`

        await sendResetPasswordEmail({
          to: user.email,
          userName: user.name || "there",
          resetUrl,
        })
      }
    } else {
      // Mitigate timing side channels for unregistered emails
      const elapsed = Date.now() - startTime
      const targetDelay = 450 + Math.floor(Math.random() * 100)
      if (elapsed < targetDelay) {
        await new Promise((resolve) => setTimeout(resolve, targetDelay - elapsed))
      }
    }

    return {
      success: true,
      message: "If an account exists with this email, a reset link has been sent",
    }
  } catch (err: unknown) {
    console.error("requestPasswordResetAction error:", err)
    // Always return generic confirmation even on internal error to prevent enumeration
    return {
      success: true,
      message: "If an account exists with this email, a reset link has been sent",
    }
  }
}

/**
 * Validates a password reset token on page load.
 */
export async function validateResetTokenAction(
  token: string
): Promise<ValidateResetTokenResult> {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "invalid" }
  }

  try {
    const verification = await db.verification.findFirst({
      where: {
        value: token,
        identifier: { startsWith: "reset-password:" },
      },
    })

    if (!verification) {
      return { valid: false, reason: "invalid" }
    }

    if (verification.consumedAt !== null) {
      return { valid: false, reason: "consumed" }
    }

    if (verification.expiresAt < new Date()) {
      return { valid: false, reason: "expired" }
    }

    return { valid: true }
  } catch (err: unknown) {
    console.error("validateResetTokenAction error:", err)
    return { valid: false, reason: "invalid" }
  }
}

/**
 * Atomically consumes a reset token, updates password hash, and revokes sessions.
 */
export async function resetPasswordAction(
  rawInput: unknown
): Promise<ResetPasswordResult> {
  const validation = resetPasswordSchema.safeParse(rawInput)

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

  const { token, password } = validation.data
  const now = new Date()

  try {
    const verification = await db.verification.findFirst({
      where: {
        value: token,
        identifier: { startsWith: "reset-password:" },
      },
    })

    if (!verification) {
      return {
        success: false,
        error: "This password reset link is invalid. Please request a new one.",
      }
    }

    if (verification.consumedAt !== null) {
      return {
        success: false,
        error: "This password reset link has already been used. Please request a new one.",
      }
    }

    if (verification.expiresAt < now) {
      return {
        success: false,
        error: "This password reset link has expired. Please request a new one.",
      }
    }

    // Atomically mark token as consumed
    const consumeResult = await db.verification.updateMany({
      where: {
        id: verification.id,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: {
        consumedAt: now,
      },
    })

    if (consumeResult.count === 0) {
      return {
        success: false,
        error: "This password reset link has already been used. Please request a new one.",
      }
    }

    const email = verification.identifier.replace(/^reset-password:/, "").toLowerCase()
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    })

    if (!user) {
      return {
        success: false,
        error: "User account associated with this token was not found.",
      }
    }

    // Hash password via Better Auth crypto
    const hashedPassword = await hashPassword(password)

    // Update credential account
    const existingAccount = await db.account.findFirst({
      where: {
        userId: user.id,
        providerId: "credential",
      },
    })

    if (existingAccount) {
      await db.account.update({
        where: { id: existingAccount.id },
        data: { password: hashedPassword },
      })
    } else {
      await db.account.create({
        data: {
          userId: user.id,
          providerId: "credential",
          accountId: user.id,
          password: hashedPassword,
        },
      })
    }

    // Invalidate all active sessions across devices
    await db.session.deleteMany({
      where: { userId: user.id },
    })

    return {
      success: true,
    }
  } catch (err: unknown) {
    console.error("resetPasswordAction error:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred while resetting your password",
    }
  }
}

export interface ResendVerificationResult {
  success: boolean
  message: string
  error?: string
  cooldownSeconds?: number
}

export interface VerifyEmailResult {
  success: boolean
  status: "success" | "expired" | "consumed" | "invalid"
  message: string
  email?: string
}

/**
 * Resends an email verification link with Better Auth rate limiting and a 60 second cooldown.
 */
export async function resendVerificationEmailAction(
  rawInput?: unknown
): Promise<ResendVerificationResult> {
  const startTime = Date.now()
  const validation = resendVerificationSchema.safeParse(rawInput || {})
  let targetEmail = validation.success && validation.data.email ? validation.data.email.toLowerCase().trim() : undefined

  let reqHeaders: Headers
  try {
    reqHeaders = await headers()
  } catch {
    reqHeaders = new Headers()
  }

  // If no email was provided in the input, resolve from authenticated session
  if (!targetEmail) {
    try {
      const sessionData = await auth.api.getSession({ headers: reqHeaders })
      if (sessionData?.user?.email) {
        targetEmail = sessionData.user.email.toLowerCase().trim()
      }
    } catch {
      // Unauthenticated
    }
  }

  if (!targetEmail) {
    return {
      success: false,
      error: "Please provide a valid work email address or sign in.",
      message: "Missing email address",
    }
  }

  try {
    const user = await db.user.findUnique({
      where: { email: targetEmail },
      select: { id: true, email: true, name: true, emailVerified: true },
    })

    if (!user) {
      // Mitigate timing side channels for unregistered emails
      const elapsed = Date.now() - startTime
      const targetDelay = 450 + Math.floor(Math.random() * 100)
      if (elapsed < targetDelay) {
        await new Promise((resolve) => setTimeout(resolve, targetDelay - elapsed))
      }

      // Defend against account enumeration: return uniform confirmation
      return {
        success: true,
        message: "If an account exists with this email, a verification link has been sent.",
        cooldownSeconds: 60,
      }
    }

    if (user.emailVerified) {
      return {
        success: true,
        message: "Your email address is already verified.",
        cooldownSeconds: 0,
      }
    }

    // Check 60-second cooldown on verification token generation (AC-4)
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000)
    const recent = await db.verification.findFirst({
      where: {
        identifier: `email-verification:${targetEmail}`,
        createdAt: { gt: sixtySecondsAgo },
      },
      orderBy: { createdAt: "desc" },
    })

    if (recent) {
      const elapsedMs = Date.now() - recent.createdAt.getTime()
      const remainingSeconds = Math.max(1, Math.ceil((60 * 1000 - elapsedMs) / 1000))
      return {
        success: false,
        error: `Please wait ${remainingSeconds} second${remainingSeconds === 1 ? "" : "s"} before requesting another verification email.`,
        message: "Rate limit cooldown active",
        cooldownSeconds: remainingSeconds,
      }
    }

    const rawToken = randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await db.verification.create({
      data: {
        identifier: `email-verification:${targetEmail}`,
        value: rawToken,
        expiresAt,
      },
    })

    const configuredUrl = process.env.BETTER_AUTH_URL || env.BETTER_AUTH_URL
    let baseUrl = configuredUrl || "http://localhost:3000"
    if (!configuredUrl) {
      try {
        const host = reqHeaders.get("x-forwarded-host") || reqHeaders.get("host")
        const proto = reqHeaders.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https")
        if (
          host &&
          /^(localhost(:\d+)?|127\.0\.0\.1(:\d+)?|([a-zA-Z0-9-]+\.)*streamline\.io)$/.test(host)
        ) {
          baseUrl = `${proto}://${host}`
        }
      } catch {
        // fallback
      }
    }

    const cleanBase = baseUrl.replace(/\/+$/, "")
    const verifyUrl = `${cleanBase}/verify-email?token=${rawToken}`

    await sendVerificationEmail({
      to: user.email,
      userName: user.name || "there",
      verifyUrl,
    })

    return {
      success: true,
      message: "A fresh verification link has been sent to your email address.",
      cooldownSeconds: 60,
    }
  } catch (err: unknown) {
    console.error("resendVerificationEmailAction error:", err)
    return {
      success: false,
      error: "An unexpected error occurred while dispatching the verification email.",
      message: "Dispatch failed",
    }
  }
}

/**
 * Validates and atomically consumes an email verification token (AC-3, AC-5).
 */
export async function verifyEmailAction(rawToken: unknown): Promise<VerifyEmailResult> {
  const tokenString =
    typeof rawToken === "string"
      ? rawToken
      : rawToken && typeof rawToken === "object" && "token" in rawToken
        ? (rawToken as { token: unknown }).token
        : rawToken
  const validation = verifyEmailSchema.safeParse({ token: tokenString })
  if (!validation.success) {
    return {
      success: false,
      status: "invalid",
      message: "Verification token is invalid or missing.",
    }
  }

  const { token } = validation.data

  try {
    const verification = await db.verification.findFirst({
      where: {
        value: token,
        identifier: { startsWith: "email-verification:" },
      },
    })

    if (!verification) {
      return {
        success: false,
        status: "invalid",
        message: "The verification link is invalid or could not be found.",
      }
    }

    if (verification.consumedAt !== null) {
      const targetEmail = verification.identifier.replace(/^email-verification:/, "").toLowerCase().trim()
      return {
        success: true,
        status: "consumed",
        message: "This email address has already been verified.",
        email: targetEmail,
      }
    }

    if (verification.expiresAt < new Date()) {
      return {
        success: false,
        status: "expired",
        message: "This verification link has expired (links are valid for 24 hours). Please request a new one.",
      }
    }

    const targetEmail = verification.identifier.replace(/^email-verification:/, "").toLowerCase().trim()

    return await db.$transaction(async (tx) => {
      const updateResult = await tx.verification.updateMany({
        where: {
          id: verification.id,
          consumedAt: null,
        },
        data: {
          consumedAt: new Date(),
        },
      })

      if (updateResult.count === 0) {
        return {
          success: true,
          status: "consumed",
          message: "This email address has already been verified.",
          email: targetEmail,
        }
      }

      await tx.user.update({
        where: { email: targetEmail },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      })

      return {
        success: true,
        status: "success",
        message: "Your email address has been successfully verified.",
        email: targetEmail,
      }
    })
  } catch (err: unknown) {
    console.error("verifyEmailAction error:", err)
    return {
      success: false,
      status: "invalid",
      message: "An unexpected error occurred while verifying your email.",
    }
  }
}


