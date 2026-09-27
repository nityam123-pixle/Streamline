import React from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOnboardingResumeState, isStepAccessAllowed } from "@/lib/onboarding/routing";
import { OnboardingProvider } from "@/context/OnboardingTransitionContext";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const session = await auth.api.getSession({ headers: headerList });

  const pathname = headerList.get("x-pathname") || "/welcome";

  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
  }

  const resume = await getOnboardingResumeState(
    session.user.id,
    session.session.activeOrganizationId
  );

  if (!resume) {
    redirect("/login");
  }

  const access = isStepAccessAllowed(pathname, resume.step);

  if (!access.allowed && access.redirectPath) {
    redirect(access.redirectPath);
  }

  return (
    <OnboardingProvider initialPath={pathname}>
      <OnboardingShell />
      <div className="sr-only" aria-hidden="true">
        {children}
      </div>
    </OnboardingProvider>
  );
}
