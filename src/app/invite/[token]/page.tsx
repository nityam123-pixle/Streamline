import React from "react";
import { redirect } from "next/navigation";
import { BrandSection } from "@/components/brand/BrandSection";
import { TokenInviteCard } from "@/components/team-invitation/TokenInviteCard";
import { getInvitationByTokenAction } from "@/actions/team-invitation";

interface InvitePageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;

  // AC-1 Redirect shim: If param is an 8-character alphanumeric code, redirect to /join/:code
  if (token && token.length === 8 && /^[a-zA-Z0-9]+$/.test(token)) {
    redirect(`/join/${token}`);
  }

  const invitationData = await getInvitationByTokenAction(token);

  return (
    <main className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <BrandSection />
      <TokenInviteCard token={token} initialData={invitationData} />
    </main>
  );
}
