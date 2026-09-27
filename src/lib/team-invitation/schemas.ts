import { z } from "zod"

export const VALID_INVITATION_ROLES = ["editor", "admin", "viewer"] as const
export type InvitationRole = (typeof VALID_INVITATION_ROLES)[number]

export const singleInvitationSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address"),
  role: z
    .string()
    .trim()
    .toLowerCase()
    .refine((val): val is InvitationRole => VALID_INVITATION_ROLES.includes(val as InvitationRole), {
      message: "Role must be editor, admin, or viewer",
    }),
})

export const rawInviteRowSchema = z.object({
  email: z.string().trim(),
  role: z.string().trim().default("Editor"),
})

export const teamInvitationsSchema = z.object({
  invites: z.array(rawInviteRowSchema).default([]),
})

export type TeamInvitationsInput = z.infer<typeof teamInvitationsSchema>
export type ValidatedInvitation = z.infer<typeof singleInvitationSchema>

export function validateAndNormalizeInvites(invites: { email: string; role?: string }[]): {
  validInvites: ValidatedInvitation[]
  errors?: Record<string, string>
} {
  const validInvites: ValidatedInvitation[] = []
  const seenEmails = new Set<string>()
  const errors: Record<string, string> = {}

  for (let index = 0; index < invites.length; index++) {
    const raw = invites[index]
    const trimmedEmail = (raw.email || "").trim()

    // Skip empty rows
    if (!trimmedEmail) {
      continue
    }

    const parseResult = singleInvitationSchema.safeParse({
      email: trimmedEmail,
      role: raw.role || "editor",
    })

    if (!parseResult.success) {
      const issue = parseResult.error.issues[0]
      errors[`invite-${index}`] = issue?.message || "Invalid invitation"
      continue
    }

    const normalized = parseResult.data

    // Reject duplicate emails within the same submission to prevent conflicting role assignments
    if (seenEmails.has(normalized.email)) {
      errors[`invite-${index}`] = `Duplicate email "${normalized.email}" found in submission. Each teammate can only be invited once.`
      continue
    }

    seenEmails.add(normalized.email)
    validInvites.push(normalized)
  }

  if (Object.keys(errors).length > 0) {
    return { validInvites: [], errors }
  }

  return { validInvites }
}
