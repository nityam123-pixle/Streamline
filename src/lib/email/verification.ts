import React from "react"
import { Resend } from "resend"
import { env } from "@/lib/env"
import { VerifyEmail } from "@/components/emails/VerifyEmail"

export interface SendVerificationEmailParams {
  to: string
  userName?: string
  verifyUrl: string
  resendClient?: Resend
}

export interface SendVerificationEmailResult {
  success: boolean
  to: string
  error?: string
  mock?: boolean
  emailSentAt?: Date
}

function extractEmailAddress(rawFrom: string): string {
  const match = rawFrom.match(/<([^>]+)>/)
  return match ? match[1].trim() : rawFrom.trim()
}

/**
 * Dispatches an email verification email via Resend or dev mock logger.
 * Safe fallback for development and tests when RESEND_API_KEY is not configured.
 */
export async function sendVerificationEmail(
  params: SendVerificationEmailParams
): Promise<SendVerificationEmailResult> {
  const { to, userName, verifyUrl, resendClient } = params

  const apiKey = process.env.RESEND_API_KEY || env.RESEND_API_KEY
  const isTest = process.env.NODE_ENV === "test"
  const isMock = !resendClient && (isTest || !apiKey)

  const rawFrom = process.env.EMAIL_FROM || env.EMAIL_FROM || "onboarding@resend.dev"
  const fromAddress = extractEmailAddress(rawFrom)
  const fromFormatted = `Streamline Security <${fromAddress}>`
  const subject = "Verify your Streamline email address"

  // Development and test mock logger path
  if (isMock) {
    console.log(`[Email Mock] Sending email verification to: ${to}`)
    console.log(`[Email Mock] From: ${fromFormatted}`)
    console.log(`[Email Mock] Subject: ${subject}`)
    console.log(`[Email Mock] Verification URL: ${verifyUrl}`)

    return {
      success: true,
      to,
      mock: true,
      emailSentAt: new Date(),
    }
  }

  if (isTest && !resendClient) {
    throw new Error("Live Resend network dispatch is forbidden in test environment")
  }

  try {
    const client = resendClient || new Resend(apiKey)

    const response = await client.emails.send({
      from: fromFormatted,
      to,
      subject,
      react: React.createElement(VerifyEmail, {
        userEmail: to,
        userName,
        verifyUrl,
      }),
    })

    if (response.error) {
      const errorMsg = response.error.message || "Failed to dispatch verification email"
      console.warn(`[Email Provider Error] Recipient: ${to}, Error: ${errorMsg}`)
      return {
        success: false,
        to,
        error: errorMsg,
      }
    }

    return {
      success: true,
      to,
      emailSentAt: new Date(),
    }
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error
        ? err.message
        : "Unexpected provider error during verification email dispatch"
    console.warn(`[Email Dispatch Exception] Recipient: ${to}, Exception: ${errorMsg}`)
    return {
      success: false,
      to,
      error: errorMsg,
    }
  }
}
