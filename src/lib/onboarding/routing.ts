import { db } from "@/lib/db";

/**
 * Canonical sequence of onboarding step identifiers.
 */
export const ONBOARDING_STEP_ORDER = [
  "welcome",
  "about",
  "automation",
  "tools",
  "team-invitation",
  "launch",
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEP_ORDER)[number];

/**
 * Mapping from step ID to route path.
 */
export const STEP_TO_PATH: Record<string, string> = {
  welcome: "/welcome",
  about: "/about",
  automation: "/automation",
  tools: "/tools",
  "team-invitation": "/team-invitation",
  launch: "/launch",
};

/**
 * Mapping from route path to 1-based step index.
 */
export const PATH_TO_STEP_INDEX: Record<string, number> = {
  "/welcome": 1,
  "/about": 2,
  "/automation": 3,
  "/tools": 4,
  "/team-invitation": 5,
  "/launch": 6,
};

export interface OnboardingResumeState {
  step: string;
  targetPath: string;
  isCompleted: boolean;
  organizationId: string;
  role: string;
}

export interface StepAccessResult {
  allowed: boolean;
  redirectPath?: string;
}

/**
 * Returns the numeric 1-based index for a given step string.
 * Unrecognized or missing steps return 1 (welcome).
 * Terminal "completed" state returns 7.
 */
export function getStepIndex(step: string | null | undefined): number {
  if (!step) return 1;
  if (step === "completed") return 7;
  const index = ONBOARDING_STEP_ORDER.indexOf(step as OnboardingStepId);
  return index >= 0 ? index + 1 : 1;
}

/**
 * Returns the maximum step index an owner is permitted to access forward.
 * When step is "welcome" (initial registration), step 2 (/about) is also unlocked
 * because step 1 is an informational greeting screen with no form submission.
 */
export function getMaxAllowedStepIndex(step: string | null | undefined): number {
  if (step === "completed") return 7;
  const currentIndex = getStepIndex(step);
  return currentIndex === 1 ? 2 : currentIndex;
}

/**
 * Resolves the canonical route path for a given step string.
 */
export function getPathForStep(step: string | null | undefined): string {
  if (step === "completed") return "/launch";
  if (step && STEP_TO_PATH[step]) return STEP_TO_PATH[step];
  return "/welcome";
}

/**
 * High watermark resolver: ensures updating an earlier step never regresses
 * the furthest completed onboarding step in the database.
 */
export function resolveHighWatermarkStep(
  currentStep: string | null | undefined,
  newStep: string
): string {
  if (currentStep === "completed" || newStep === "completed") {
    return "completed";
  }

  const currentIndex = getStepIndex(currentStep);
  const newIndex = getStepIndex(newStep);

  return currentIndex >= newIndex ? currentStep || "welcome" : newStep;
}

/**
 * Evaluates whether a requested URL pathname is allowed given the current database onboardingStep.
 */
export function isStepAccessAllowed(
  requestedPath: string,
  currentStep: string | null | undefined
): StepAccessResult {
  const normalizedPath =
    requestedPath === "/"
      ? "/"
      : requestedPath.replace(/\/$/, "").toLowerCase();

  // Completed owners can only view /launch
  if (currentStep === "completed") {
    if (normalizedPath === "/launch") {
      return { allowed: true };
    }
    return { allowed: false, redirectPath: "/launch" };
  }

  const normalizedStep =
    currentStep && (STEP_TO_PATH[currentStep] || currentStep === "completed")
      ? currentStep
      : "welcome";

  const currentStepIndex = getStepIndex(normalizedStep);
  const targetPath = getPathForStep(normalizedStep);
  const requestedIndex = PATH_TO_STEP_INDEX[normalizedPath];

  // If path is not a recognized onboarding route, pass through
  if (requestedIndex === undefined) {
    return { allowed: true };
  }

  // Resume rule for /welcome: if the owner has advanced beyond step 1,
  // visiting /welcome automatically resumes them forward to their active target step
  if (normalizedPath === "/welcome" && currentStepIndex > 1) {
    return { allowed: false, redirectPath: targetPath };
  }

  const maxAllowedIndex = getMaxAllowedStepIndex(normalizedStep);

  // Forward skipping barrier: cannot jump past max unlocked step
  if (requestedIndex > maxAllowedIndex) {
    return { allowed: false, redirectPath: targetPath };
  }

  // Backward navigation or current step access is permitted
  return { allowed: true };
}

/**
 * Single shared helper that queries the database to derive the authoritative
 * onboarding resume state for an authenticated user.
 * Supports an optional preferredOrganizationId for multi-workspace accounts,
 * defaulting to the initial workspace via createdAt: asc.
 */
export async function getOnboardingResumeState(
  userId: string,
  preferredOrganizationId?: string | null
): Promise<OnboardingResumeState | null> {
  let member = null;

  if (preferredOrganizationId) {
    member = await db.member.findFirst({
      where: { userId, organizationId: preferredOrganizationId },
      select: {
        role: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            onboardingStep: true,
          },
        },
      },
    });
  }

  if (!member) {
    member = await db.member.findFirst({
      where: { userId },
      select: {
        role: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            onboardingStep: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  if (!member || !member.organization) {
    return null;
  }

  const rawStep = member.organization.onboardingStep;
  const isCompleted = rawStep === "completed";
  const step = isCompleted
    ? "completed"
    : rawStep && STEP_TO_PATH[rawStep]
      ? rawStep
      : "welcome";

  const targetPath = isCompleted ? "/launch" : STEP_TO_PATH[step] || "/welcome";

  return {
    step,
    targetPath,
    isCompleted,
    organizationId: member.organizationId,
    role: member.role,
  };
}
