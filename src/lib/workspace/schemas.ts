import { z } from "zod"

export const workspaceProfileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(50, "First name cannot exceed 50 characters"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(50, "Last name cannot exceed 50 characters"),
  companyName: z
    .string()
    .trim()
    .min(1, "Company name is required")
    .max(100, "Company name cannot exceed 100 characters"),
  role: z
    .string()
    .trim()
    .min(1, "Please select your role"),
  teamSize: z
    .string()
    .trim()
    .min(1, "Please select your team size"),
})

export type WorkspaceProfileInput = z.infer<typeof workspaceProfileSchema>
