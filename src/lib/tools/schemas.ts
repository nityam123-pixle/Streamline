import { z } from "zod"

export const VALID_TOOLS = [
  "hubspot",
  "salesforce",
  "slack",
  "gmail",
  "notion",
  "stripe",
] as const

export type ToolId = (typeof VALID_TOOLS)[number]

export const selectedToolsSchema = z.object({
  selectedTools: z
    .array(z.string().trim())
    .refine(
      (tools) => tools.every((tool) => VALID_TOOLS.includes(tool as ToolId)),
      {
        message: "One or more selected tools are invalid",
      }
    ),
})

export type SelectedToolsInput = z.infer<typeof selectedToolsSchema>
