import React, { Suspense } from "react";
import type { Metadata } from "next";
import { BrandSection } from "@/components/brand/BrandSection";
import { ResetPasswordForm } from "@/components/form/ResetPasswordForm";

export const metadata: Metadata = {
  title: "New Password | Streamline",
  description: "Set a new secure password for your Streamline account.",
};

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;

  return (
    <main className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <BrandSection />
      <Suspense fallback={<div className="w-full min-h-screen bg-background flex items-center justify-center text-sm text-[#757575]">Loading password recovery...</div>}>
        <ResetPasswordForm initialToken={token} />
      </Suspense>
    </main>
  );
}
