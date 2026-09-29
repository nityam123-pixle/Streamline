import React, { Suspense } from "react";
import type { Metadata } from "next";
import { BrandSection } from "@/components/brand/BrandSection";
import { VerifyEmailCard } from "@/components/form/VerifyEmailCard";

export const metadata: Metadata = {
  title: "Verify Email | Streamline",
  description: "Verify your Streamline account email address.",
  referrer: "no-referrer",
};

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { token } = await searchParams;

  return (
    <main className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <BrandSection />
      <Suspense
        fallback={
          <div className="w-full min-h-screen bg-background flex items-center justify-center text-sm text-[#737373]">
            Loading email verification...
          </div>
        }
      >
        <VerifyEmailCard initialToken={token} />
      </Suspense>
    </main>
  );
}
