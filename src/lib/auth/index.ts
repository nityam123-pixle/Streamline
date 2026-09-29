import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { organization } from "better-auth/plugins/organization"
import { nextCookies } from "better-auth/next-js"
import { db } from "@/lib/db"

import { sendResetPasswordEmail } from "@/lib/email/password-reset"
import { sendVerificationEmail } from "@/lib/email/verification"
import { env } from "@/lib/env"

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailVerification: {
    sendOnSignUp: false,
    autoSignInAfterVerification: false,
    async sendVerificationEmail(data) {
      const baseUrl = process.env.BETTER_AUTH_URL || env.BETTER_AUTH_URL || "http://localhost:3000"
      const cleanBase = baseUrl.replace(/\/+$/, "")
      const verifyUrl = `${cleanBase}/verify-email?token=${data.token}`

      await sendVerificationEmail({
        to: data.user.email,
        userName: data.user.name || "there",
        verifyUrl,
      })
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
    async sendResetPassword(data) {
      const baseUrl = process.env.BETTER_AUTH_URL || env.BETTER_AUTH_URL || "http://localhost:3000"
      const cleanBase = baseUrl.replace(/\/+$/, "")
      const resetUrl = `${cleanBase}/reset-password?token=${data.token}`

      await sendResetPasswordEmail({
        to: data.user.email,
        userName: data.user.name || "there",
        resetUrl,
      })
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // 1 day sliding refresh
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes cache
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 10,
  },
  plugins: [
    organization(),
    nextCookies(),
  ],
})

export type Session = typeof auth.$Infer.Session
