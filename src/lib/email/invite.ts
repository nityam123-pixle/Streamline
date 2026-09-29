import React from "react"
import { Resend } from "resend"
import { db } from "@/lib/db"
import { env } from "@/lib/env"
import { TeamInviteEmail } from "@/components/emails/TeamInviteEmail"

export interface SendInviteEmailParams {
  invitationId?: string
  to: string
  inviterName: string
  inviterEmail: string
  workspaceName: string
  role: string
  inviteUrl: string
  resendClient?: Resend
}

export interface SendInviteEmailResult {
  success: boolean
  to: string
  error?: string
  mock?: boolean
  emailSentAt?: Date
}

export interface BatchSendInvitesParams {
  invites: Array<{
    invitationId: string
    email: string
    role: string
    rawToken: string
  }>
  inviterName: string
  inviterEmail: string
  workspaceName: string
  baseUrl: string
  resendClient?: Resend
}

export interface BatchSendInvitesResult {
  sentCount: number
  failedCount: number
  warnings: string[]
  results: SendInviteEmailResult[]
}

/**
 * Extracts a bare email address if wrapped in angle brackets or display names
 */
function extractEmailAddress(rawFrom: string): string {
  const match = rawFrom.match(/<([^>]+)>/)
  return match ? match[1].trim() : rawFrom.trim()
}

/**
 * Dispatches an individual team invite transactional email.
 * Falls back to development mock logger if RESEND_API_KEY is not configured.
 * Catches and isolates all external errors so callers are never blocked.
 */
export async function sendTeamInviteEmail(
  params: SendInviteEmailParams
): Promise<SendInviteEmailResult> {
  const {
    invitationId,
    to,
    inviterName,
    inviterEmail,
    workspaceName,
    role,
    inviteUrl,
    resendClient,
  } = params

  const apiKey = process.env.RESEND_API_KEY || env.RESEND_API_KEY
  const isTest = process.env.NODE_ENV === "test"

  // In test environments without an injected mock client, or in development without an API key,
  // unconditionally force the mock logger path. Test environment safety never depends on API key presence.
  const isMock = !resendClient && (isTest || !apiKey)

  const subject = `${inviterName} invited you to join ${workspaceName} on Streamline`
  const rawFrom = process.env.EMAIL_FROM || env.EMAIL_FROM || "onboarding@resend.dev"
  const fromAddress = extractEmailAddress(rawFrom)
  const fromFormatted = `${workspaceName} via Streamline <${fromAddress}>`

  // Development & Test Mock Logger Fallback (AC-4)
  if (isMock) {
    console.log(`[Email Mock] Sending team invite email to: ${to}`)
    console.log(`[Email Mock] From: ${fromFormatted}`)
    console.log(`[Email Mock] Reply-To: ${inviterEmail}`)
    console.log(`[Email Mock] Subject: ${subject}`)
    console.log(`[Email Mock] Personal Invite URL: ${inviteUrl}`)

    const dispatchedAt = new Date()

    if (invitationId) {
      try {
        await db.invitation.update({
          where: { id: invitationId },
          data: { emailSentAt: dispatchedAt },
        })
      } catch (dbErr) {
        console.error(`[Email Mock] Failed to update emailSentAt for invitation ${invitationId}:`, dbErr)
      }
    }

    return {
      success: true,
      to,
      mock: true,
      emailSentAt: dispatchedAt,
    }
  }

  // Live Provider Dispatch via Resend (AC-1, AC-2, AC-5)
  // Hard guard: live client instantiation is strictly forbidden under test environment
  if (isTest && !resendClient) {
    throw new Error("Live Resend network dispatch is forbidden in test environment")
  }

  try {
    const client = resendClient || new Resend(apiKey)

    const response = await client.emails.send({
      from: fromFormatted,
      to,
      replyTo: inviterEmail,
      subject,
      react: React.createElement(TeamInviteEmail, {
        inviteeEmail: to,
        inviterName,
        workspaceName,
        role,
        inviteUrl,
      }),
    })

    if (response.error) {
      const errorMsg = response.error.message || "Failed to dispatch email via Resend"
      console.warn(`[Email Provider Error] Recipient: ${to}, Error: ${errorMsg}`)
      return {
        success: false,
        to,
        error: errorMsg,
      }
    }

    const dispatchedAt = new Date()

    // Update database emailSentAt timestamp (AC-3)
    if (invitationId) {
      try {
        await db.invitation.update({
          where: { id: invitationId },
          data: { emailSentAt: dispatchedAt },
        })
      } catch (dbErr) {
        console.error(`Failed to update emailSentAt for invitation ${invitationId}:`, dbErr)
      }
    }

    return {
      success: true,
      to,
      emailSentAt: dispatchedAt,
    }
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error
        ? err.message
        : "Unexpected network or provider error during email dispatch"
    console.warn(`[Email Dispatch Exception] Recipient: ${to}, Exception: ${errorMsg}`)
    return {
      success: false,
      to,
      error: errorMsg,
    }
  }
}

/**
 * Dispatches transactional invite emails in batch across all created invitations.
 * Uses individual error isolation so one failing recipient never halts delivery to others (AC-6).
 */
export async function batchSendTeamInviteEmails(
  params: BatchSendInvitesParams
): Promise<BatchSendInvitesResult> {
  const {
    invites,
    inviterName,
    inviterEmail,
    workspaceName,
    baseUrl,
    resendClient,
  } = params

  let sentCount = 0
  let failedCount = 0
  const warnings: string[] = []
  const results: SendInviteEmailResult[] = []

  const cleanBaseUrl = baseUrl.replace(/\/+$/, "")

  for (const inv of invites) {
    const inviteUrl = `${cleanBaseUrl}/invite/${inv.rawToken}`

    const res = await sendTeamInviteEmail({
      invitationId: inv.invitationId,
      to: inv.email,
      inviterName,
      inviterEmail,
      workspaceName,
      role: inv.role,
      inviteUrl,
      resendClient,
    })

    results.push(res)

    if (res.success) {
      sentCount++
    } else {
      failedCount++
      const warning = `Failed to deliver invite email to ${inv.email}: ${res.error || "delivery error"}`
      warnings.push(warning)
    }
  }

  return {
    sentCount,
    failedCount,
    warnings,
    results,
  }
}
