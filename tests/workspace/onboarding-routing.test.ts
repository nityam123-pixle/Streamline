import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import * as nextHeaders from "next/headers";
import { auth } from "@/lib/auth";

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));
import { db } from "@/lib/db";
import {
  getStepIndex,
  getMaxAllowedStepIndex,
  getPathForStep,
  resolveHighWatermarkStep,
  isStepAccessAllowed,
  getOnboardingResumeState,
  STEP_TO_PATH,
  PATH_TO_STEP_INDEX,
} from "@/lib/onboarding/routing";
import { updateWorkspaceProfileAction } from "@/actions/workspace";
import { updateAutomationPreferencesAction } from "@/actions/automation";
import { updateToolsAction } from "@/actions/tools";
import { createTeamInvitationsAction } from "@/actions/team-invitation";

describe("Onboarding Resume & Route Protection (Feature 9)", () => {
  const createdUserIds: string[] = [];
  const createdOrgIds: string[] = [];
  const testRunId = Date.now();
  const testPassword = "SecurePassword123!";

  let ownerUserId = "";
  let ownerOrgId = "";
  let ownerCookie = "";

  beforeAll(async () => {
    // 1. Create a test owner user
    const ownerEmail = `resume-owner-${testRunId}@example.com`;
    const ownerRes = await auth.api.signUpEmail({
      body: {
        name: "Arthur Dent",
        email: ownerEmail,
        password: testPassword,
      },
    });
    if (!ownerRes?.user) throw new Error("Failed to create test owner");
    ownerUserId = ownerRes.user.id;
    createdUserIds.push(ownerUserId);

    // Sign in to obtain session cookie
    const signInRes = await auth.api.signInEmail({
      body: { email: ownerEmail, password: testPassword },
      asResponse: true,
    });
    ownerCookie = signInRes.headers.get("set-cookie") || "";

    // 2. Create organization and member record
    const org = await db.organization.create({
      data: {
        name: "Megadodo Publications",
        slug: `megadodo-${testRunId}`,
        onboardingStep: "welcome",
      },
    });
    ownerOrgId = org.id;
    createdOrgIds.push(ownerOrgId);

    await db.member.create({
      data: {
        organizationId: ownerOrgId,
        userId: ownerUserId,
        role: "owner",
      },
    });
  });

  afterAll(async () => {
    // Cleanup created test records
    for (const orgId of createdOrgIds) {
      await db.organization.deleteMany({ where: { id: orgId } });
    }
    for (const userId of createdUserIds) {
      await db.user.deleteMany({ where: { id: userId } });
    }
  });

  describe("Unit: Step Index and Route Resolvers", () => {
    it("returns correct 1-based index for each onboarding step", () => {
      expect(getStepIndex("welcome")).toBe(1);
      expect(getStepIndex("about")).toBe(2);
      expect(getStepIndex("automation")).toBe(3);
      expect(getStepIndex("tools")).toBe(4);
      expect(getStepIndex("team-invitation")).toBe(5);
      expect(getStepIndex("launch")).toBe(6);
    });

    it("handles special and corrupt step strings safely (AC-6)", () => {
      expect(getStepIndex("completed")).toBe(7);
      expect(getStepIndex(null)).toBe(1);
      expect(getStepIndex(undefined)).toBe(1);
      expect(getStepIndex("")).toBe(1);
      expect(getStepIndex("non-existent-step")).toBe(1);
    });

    it("resolves canonical path for each step (AC-1)", () => {
      expect(getPathForStep("welcome")).toBe("/welcome");
      expect(getPathForStep("about")).toBe("/about");
      expect(getPathForStep("automation")).toBe("/automation");
      expect(getPathForStep("tools")).toBe("/tools");
      expect(getPathForStep("team-invitation")).toBe("/team-invitation");
      expect(getPathForStep("launch")).toBe("/launch");
      expect(getPathForStep("completed")).toBe("/launch");
      expect(getPathForStep(null)).toBe("/welcome");
      expect(getPathForStep("invalid")).toBe("/welcome");
    });

    it("unlocks step 2 (/about) when step is welcome because step 1 has no form", () => {
      expect(getMaxAllowedStepIndex("welcome")).toBe(2);
      expect(getMaxAllowedStepIndex(null)).toBe(2);
      expect(getMaxAllowedStepIndex("about")).toBe(2);
      expect(getMaxAllowedStepIndex("automation")).toBe(3);
      expect(getMaxAllowedStepIndex("tools")).toBe(4);
      expect(getMaxAllowedStepIndex("team-invitation")).toBe(5);
      expect(getMaxAllowedStepIndex("launch")).toBe(6);
      expect(getMaxAllowedStepIndex("completed")).toBe(7);
    });
  });

  describe("Unit: High Watermark Progression (AC-5)", () => {
    it("advances step when moving forward in the sequence", () => {
      expect(resolveHighWatermarkStep("welcome", "about")).toBe("about");
      expect(resolveHighWatermarkStep("about", "automation")).toBe("automation");
      expect(resolveHighWatermarkStep("automation", "tools")).toBe("tools");
    });

    it("preserves furthest step when updating an earlier step (AC-5)", () => {
      expect(resolveHighWatermarkStep("tools", "about")).toBe("tools");
      expect(resolveHighWatermarkStep("tools", "automation")).toBe("tools");
      expect(resolveHighWatermarkStep("launch", "about")).toBe("launch");
      expect(resolveHighWatermarkStep("launch", "team-invitation")).toBe("launch");
    });

    it("preserves completed terminal state unconditionally", () => {
      expect(resolveHighWatermarkStep("completed", "about")).toBe("completed");
      expect(resolveHighWatermarkStep("completed", "tools")).toBe("completed");
      expect(resolveHighWatermarkStep("tools", "completed")).toBe("completed");
    });
  });

  describe("Unit: Route Access & Protection Barrier (AC-1, AC-2, AC-3, AC-4)", () => {
    it("allows accessing current unlocked step (AC-1)", () => {
      expect(isStepAccessAllowed("/welcome", "welcome")).toEqual({ allowed: true });
      expect(isStepAccessAllowed("/about", "about")).toEqual({ allowed: true });
      expect(isStepAccessAllowed("/tools", "tools")).toEqual({ allowed: true });
      expect(isStepAccessAllowed("/launch", "launch")).toEqual({ allowed: true });
    });

    it("explicitly confirms boundary case stepIndex === currentStepIndex is permitted for every step", () => {
      expect(isStepAccessAllowed("/welcome", "welcome")).toEqual({ allowed: true });
      expect(isStepAccessAllowed("/about", "about")).toEqual({ allowed: true });
      expect(isStepAccessAllowed("/automation", "automation")).toEqual({ allowed: true });
      expect(isStepAccessAllowed("/tools", "tools")).toEqual({ allowed: true });
      expect(isStepAccessAllowed("/team-invitation", "team-invitation")).toEqual({ allowed: true });
      expect(isStepAccessAllowed("/launch", "launch")).toEqual({ allowed: true });
    });

    it("allows initial registration access to both /welcome and /about", () => {
      expect(isStepAccessAllowed("/welcome", "welcome")).toEqual({ allowed: true });
      expect(isStepAccessAllowed("/about", "welcome")).toEqual({ allowed: true });
    });

    it("blocks forward skipping and redirects to current step (AC-2)", () => {
      expect(isStepAccessAllowed("/automation", "welcome")).toEqual({
        allowed: false,
        redirectPath: "/welcome",
      });
      expect(isStepAccessAllowed("/launch", "about")).toEqual({
        allowed: false,
        redirectPath: "/about",
      });
      expect(isStepAccessAllowed("/tools", "about")).toEqual({
        allowed: false,
        redirectPath: "/about",
      });
      expect(isStepAccessAllowed("/launch", "tools")).toEqual({
        allowed: false,
        redirectPath: "/tools",
      });
    });

    it("allows backward navigation to inspect or revise earlier steps (AC-4)", () => {
      expect(isStepAccessAllowed("/about", "tools")).toEqual({ allowed: true });
      expect(isStepAccessAllowed("/automation", "tools")).toEqual({ allowed: true });
      expect(isStepAccessAllowed("/about", "launch")).toEqual({ allowed: true });
      expect(isStepAccessAllowed("/tools", "launch")).toEqual({ allowed: true });
    });

    it("resumes forward when an advanced owner visits /welcome (AC-1)", () => {
      expect(isStepAccessAllowed("/welcome", "about")).toEqual({
        allowed: false,
        redirectPath: "/about",
      });
      expect(isStepAccessAllowed("/welcome", "tools")).toEqual({
        allowed: false,
        redirectPath: "/tools",
      });
      expect(isStepAccessAllowed("/welcome", "launch")).toEqual({
        allowed: false,
        redirectPath: "/launch",
      });
    });

    it("locks completed owners out of onboarding steps and redirects to /launch (AC-3)", () => {
      expect(isStepAccessAllowed("/welcome", "completed")).toEqual({
        allowed: false,
        redirectPath: "/launch",
      });
      expect(isStepAccessAllowed("/about", "completed")).toEqual({
        allowed: false,
        redirectPath: "/launch",
      });
      expect(isStepAccessAllowed("/automation", "completed")).toEqual({
        allowed: false,
        redirectPath: "/launch",
      });
      expect(isStepAccessAllowed("/tools", "completed")).toEqual({
        allowed: false,
        redirectPath: "/launch",
      });
      expect(isStepAccessAllowed("/team-invitation", "completed")).toEqual({
        allowed: false,
        redirectPath: "/launch",
      });
    });

    it("allows completed owners to view /launch without redirect loops (AC-3)", () => {
      expect(isStepAccessAllowed("/launch", "completed")).toEqual({ allowed: true });
    });

    it("safely falls back to welcome for corrupt or unrecognized steps (AC-6)", () => {
      expect(isStepAccessAllowed("/welcome", "corrupt-step-val")).toEqual({ allowed: true });
      expect(isStepAccessAllowed("/about", "corrupt-step-val")).toEqual({ allowed: true });
      expect(isStepAccessAllowed("/tools", "corrupt-step-val")).toEqual({
        allowed: false,
        redirectPath: "/welcome",
      });
    });
  });

  describe("Integration: getOnboardingResumeState helper", () => {
    it("derives authoritative resume state for an active owner", async () => {
      // Set org to "tools"
      await db.organization.update({
        where: { id: ownerOrgId },
        data: { onboardingStep: "tools" },
      });

      const resumeState = await getOnboardingResumeState(ownerUserId);
      expect(resumeState).not.toBeNull();
      expect(resumeState?.step).toBe("tools");
      expect(resumeState?.targetPath).toBe("/tools");
      expect(resumeState?.isCompleted).toBe(false);
      expect(resumeState?.organizationId).toBe(ownerOrgId);
      expect(resumeState?.role).toBe("owner");
    });

    it("identifies completed status and targets /launch (AC-3)", async () => {
      await db.organization.update({
        where: { id: ownerOrgId },
        data: { onboardingStep: "completed" },
      });

      const resumeState = await getOnboardingResumeState(ownerUserId);
      expect(resumeState).not.toBeNull();
      expect(resumeState?.step).toBe("completed");
      expect(resumeState?.targetPath).toBe("/launch");
      expect(resumeState?.isCompleted).toBe(true);
    });

    it("falls back safely to welcome when onboardingStep is corrupt in DB (AC-6)", async () => {
      await db.organization.update({
        where: { id: ownerOrgId },
        data: { onboardingStep: "random-unrecognized-value" },
      });

      const resumeState = await getOnboardingResumeState(ownerUserId);
      expect(resumeState).not.toBeNull();
      expect(resumeState?.step).toBe("welcome");
      expect(resumeState?.targetPath).toBe("/welcome");
      expect(resumeState?.isCompleted).toBe(false);
    });

    it("returns null for a user with no organization membership (AC-8)", async () => {
      const lonelyUser = await auth.api.signUpEmail({
        body: {
          name: "Ford Prefect",
          email: `lonely-${testRunId}@example.com`,
          password: testPassword,
        },
      });
      if (!lonelyUser?.user) throw new Error("Failed to create lonely user");
      createdUserIds.push(lonelyUser.user.id);

      const resumeState = await getOnboardingResumeState(lonelyUser.user.id);
      expect(resumeState).toBeNull();
    });

    it("respects preferredOrganizationId when user belongs to multiple organizations", async () => {
      const secondOrg = await db.organization.create({
        data: {
          name: "Second Workspace",
          slug: `second-${testRunId}`,
          onboardingStep: "launch",
        },
      });
      createdOrgIds.push(secondOrg.id);

      await db.member.create({
        data: {
          organizationId: secondOrg.id,
          userId: ownerUserId,
          role: "owner",
        },
      });

      // Targeting the second organization returns launch
      const targetedResume = await getOnboardingResumeState(ownerUserId, secondOrg.id);
      expect(targetedResume).not.toBeNull();
      expect(targetedResume?.organizationId).toBe(secondOrg.id);
      expect(targetedResume?.step).toBe("launch");
      expect(targetedResume?.targetPath).toBe("/launch");

      // Omitting preferredOrganizationId defaults to initial org via createdAt asc
      const fallbackResume = await getOnboardingResumeState(ownerUserId);
      expect(fallbackResume).not.toBeNull();
      expect(fallbackResume?.organizationId).toBe(ownerOrgId);
    });
  });

  describe("Integration: Action High Watermark Persistence (AC-5)", () => {
    it("preserves downstream step when updating an earlier step action", async () => {
      // 1. Advance org to "tools" (step 4)
      await db.organization.update({
        where: { id: ownerOrgId },
        data: { onboardingStep: "tools" },
      });

      // 2. Perform updateWorkspaceProfileAction (step 2) with mocked session headers
      vi.mocked(nextHeaders.headers).mockResolvedValue(
        new Headers({ cookie: ownerCookie }) as any
      );

      const updateResult = await updateWorkspaceProfileAction({
        companyName: "Megadodo Galactic",
        teamSize: "11-50",
        role: "Founder",
        firstName: "Arthur",
        lastName: "Dent",
      });

      expect(updateResult.success).toBe(true);
      // High watermark: returns "tools", not "automation"!
      expect(updateResult.organization?.onboardingStep).toBe("tools");

      // Verify in database
      const refreshedOrg = await db.organization.findUnique({
        where: { id: ownerOrgId },
        select: { onboardingStep: true, name: true },
      });
      expect(refreshedOrg?.name).toBe("Megadodo Galactic");
      expect(refreshedOrg?.onboardingStep).toBe("tools");
    });

    it("preserves downstream step when updating automation preferences (step 3) while on launch (step 6)", async () => {
      // 1. Advance org to "launch" (step 6)
      await db.organization.update({
        where: { id: ownerOrgId },
        data: { onboardingStep: "launch" },
      });

      // 2. Perform updateAutomationPreferencesAction with mocked session headers
      vi.mocked(nextHeaders.headers).mockResolvedValue(
        new Headers({ cookie: ownerCookie }) as any
      );

      const updateResult = await updateAutomationPreferencesAction({
        automationAreas: ["marketing", "sales"],
      });

      expect(updateResult.success).toBe(true);
      // High watermark: preserves "launch", does not regress to "tools"
      expect(updateResult.organization?.onboardingStep).toBe("launch");

      const refreshedOrg = await db.organization.findUnique({
        where: { id: ownerOrgId },
        select: { onboardingStep: true },
      });
      expect(refreshedOrg?.onboardingStep).toBe("launch");
    });

    it("preserves downstream step when updating selected tools (step 4) while on launch (step 6)", async () => {
      // 1. Advance org to "launch" (step 6)
      await db.organization.update({
        where: { id: ownerOrgId },
        data: { onboardingStep: "launch" },
      });

      // 2. Perform updateToolsAction with mocked session headers
      vi.mocked(nextHeaders.headers).mockResolvedValue(
        new Headers({ cookie: ownerCookie }) as any
      );

      const updateResult = await updateToolsAction({
        selectedTools: ["hubspot", "slack"],
      });

      expect(updateResult.success).toBe(true);
      // High watermark: preserves "launch", does not regress to "team-invitation"
      expect(updateResult.organization?.onboardingStep).toBe("launch");

      const refreshedOrg = await db.organization.findUnique({
        where: { id: ownerOrgId },
        select: { onboardingStep: true },
      });
      expect(refreshedOrg?.onboardingStep).toBe("launch");
    });

    it("preserves completed terminal state when submitting empty invitations in skip flow", async () => {
      await db.session.updateMany({
        where: { userId: ownerUserId },
        data: { activeOrganizationId: ownerOrgId },
      });

      // 1. Set org to "completed" (step 7)
      await db.organization.update({
        where: { id: ownerOrgId },
        data: { onboardingStep: "completed" },
      });

      // 2. Perform createTeamInvitationsAction with empty array (skip flow)
      vi.mocked(nextHeaders.headers).mockResolvedValue(
        new Headers({ cookie: ownerCookie }) as any
      );

      const updateResult = await createTeamInvitationsAction({
        invitations: [],
      });

      expect(updateResult.success).toBe(true);
      // High watermark: preserves "completed", does not regress to "launch"
      expect(updateResult.onboardingStep).toBe("completed");

      const refreshedOrg = await db.organization.findUnique({
        where: { id: ownerOrgId },
        select: { onboardingStep: true },
      });
      expect(refreshedOrg?.onboardingStep).toBe("completed");
    });
  });
});
