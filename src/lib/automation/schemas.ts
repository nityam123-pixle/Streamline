import { z } from "zod"

export const VALID_AUTOMATION_AREAS = [
  "sales",
  "marketing",
  "support",
  "data",
  "hr",
  "finance",
] as const

export type AutomationAreaId = (typeof VALID_AUTOMATION_AREAS)[number]

export const automationPreferencesSchema = z.object({
  automationAreas: z
    .array(z.string().trim())
    .min(1, "Please select at least one automation area")
    .refine(
      (areas) =>
        areas.every((area) =>
          VALID_AUTOMATION_AREAS.includes(area as AutomationAreaId)
        ),
      {
        message: "One or more selected automation areas are invalid",
      }
    ),
})

export type AutomationPreferencesInput = z.infer<typeof automationPreferencesSchema>
