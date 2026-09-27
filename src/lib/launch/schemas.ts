export interface MemberSummaryItem {
  id: string
  name: string
  email: string
  role: string
  jobTitle?: string | null
}

export interface LaunchSummaryData {
  companyName: string
  companyInitials: string
  userRole: string
  memberRole?: string
  automatingText: string
  integrationsText: string
  workflowText: string
  invitedCount: number
  invitedTeammatesText: string
  membersCount?: number
  members?: MemberSummaryItem[]
  inviteCode: string | null
  shareableInviteLink: string | null
  onboardingStep: string
}


export const AUTOMATION_AREA_LABELS: Record<string, { title: string; workflow: string }> = {
  sales: { title: "Sales Automation", workflow: "Lead Generation" },
  marketing: { title: "Marketing Ops", workflow: "Campaign Automation" },
  support: { title: "Customer Support", workflow: "Ticket Routing" },
  data: { title: "Data & Reporting", workflow: "Data Enrichment" },
  hr: { title: "HR & Recruiting", workflow: "Candidate Screening" },
  finance: { title: "Finance & Ops", workflow: "Invoice Processing" },
}

export const TOOL_LABELS: Record<string, string> = {
  hubspot: "HubSpot",
  salesforce: "Salesforce",
  slack: "Slack",
  gmail: "Gmail",
  notion: "Notion",
  stripe: "Stripe",
}

export function getCompanyInitials(name?: string | null): string {
  if (!name) return "WS"
  const trimmed = name.trim()
  if (!trimmed) return "WS"
  const words = trimmed.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return trimmed.slice(0, 2).toUpperCase()
}

export function formatUserRole(
  jobTitle?: string | null,
  role?: string | null,
  companyName?: string | null
): string {
  const cleanTitle = (jobTitle || "").trim()
  const cleanRole = (role || "").trim()
  const cleanCompany = (companyName || "").trim()

  const baseTitle = cleanTitle || (cleanRole ? cleanRole.charAt(0).toUpperCase() + cleanRole.slice(1).toLowerCase() : "Member")

  if (cleanCompany) {
    return `${baseTitle} at ${cleanCompany}`
  }
  return baseTitle
}

export function formatAutomatingText(areas?: unknown): string {
  if (!areas || !Array.isArray(areas) || areas.length === 0) {
    return "Automating: None selected"
  }

  const titles = areas
    .map((item) => {
      const key = String(item).toLowerCase().trim()
      return AUTOMATION_AREA_LABELS[key]?.title || key
    })
    .filter(Boolean)

  if (titles.length === 0) {
    return "Automating: None selected"
  }

  return `Automating: ${titles.join(", ")}`
}

export function formatWorkflowText(areas?: unknown): string {
  if (!areas || !Array.isArray(areas) || areas.length === 0) {
    return "First workflow: Workspace Automation"
  }

  const firstKey = String(areas[0]).toLowerCase().trim()
  const matchingWorkflow = AUTOMATION_AREA_LABELS[firstKey]?.workflow

  if (matchingWorkflow) {
    return `First workflow: ${matchingWorkflow}`
  }

  return "First workflow: Workspace Automation"
}

export function formatIntegrationsText(tools?: unknown): string {
  if (!tools || !Array.isArray(tools) || tools.length === 0) {
    return "No tools selected"
  }

  const names = tools
    .map((item) => {
      const key = String(item).toLowerCase().trim()
      return TOOL_LABELS[key] || key
    })
    .filter(Boolean)

  if (names.length === 0) {
    return "No tools selected"
  }

  const count = names.length
  const unit = count === 1 ? "tool" : "tools"
  return `${count} ${unit} selected: ${names.join(", ")}`
}

export function formatInvitedTeammatesText(count: number): string {
  if (count <= 0) {
    return "Team: No teammates invited yet"
  }
  if (count === 1) {
    return "Team: 1 member invited"
  }
  return `Team: ${count} members invited`
}
