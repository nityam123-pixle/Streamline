import React, { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOnboardingResumeState } from "@/lib/onboarding/routing";
import { BrandSection } from "@/components/brand/BrandSection";
import { LoginForm } from "@/components/form/LoginForm";

export default async function LoginPage() {
  const headerList = await headers();
  const session = await auth.api.getSession({ headers: headerList });

  if (session) {
    const resume = await getOnboardingResumeState(
      session.user.id,
      session.session.activeOrganizationId
    );
    if (resume) {
      redirect(resume.targetPath);
    }
  }

  return (
    <main className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <BrandSection />
      <Suspense fallback={<div className="w-full min-h-screen bg-background flex items-center justify-center text-sm text-[#757575]">Loading sign in...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
