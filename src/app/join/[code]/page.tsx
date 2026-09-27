import React from "react";
import { BrandSection } from "@/components/brand/BrandSection";
import { CodeJoinCard } from "@/components/team-invitation/CodeJoinCard";
import { getOrganizationByCodeAction } from "@/actions/team-invitation";

interface JoinPageProps {
  params: Promise<{
    code: string;
  }>;
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { code } = await params;
  const orgData = await getOrganizationByCodeAction(code);

  return (
    <main className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <BrandSection />
      <CodeJoinCard code={code} initialData={orgData} />
    </main>
  );
}
