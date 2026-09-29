import { z } from "zod"

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, "Full name is required")
      .max(100, "Full name cannot exceed 100 characters"),
    email: z
      .string()
      .trim()
      .email("Please enter a valid work email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long"),
    confirmPassword: z
      .string()
      .min(1, "Please confirm your password"),
    agreeTerms: z
      .boolean()
      .refine((val) => val === true, {
        message: "You must agree to the Terms of Service and Privacy Policy",
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type SignUpInput = z.infer<typeof signUpSchema>

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid work email address"),
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(/[a-zA-Z]/, "Password must contain at least one letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export const resendVerificationSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid work email address")
    .optional(),
})

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(1, "Verification token is required"),
})

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>

