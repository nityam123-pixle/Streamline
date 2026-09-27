'use client';

import React, { useState, useEffect } from "react";
import { TeamInviteRow, TeamInvite } from "./TeamInviteRow";
import { ShareLinkCard } from "./ShareLinkCard";
import { useOnboardingTransition } from "@/context/OnboardingTransitionContext";
import {
  getTeamInvitationsAction,
  createTeamInvitationsAction,
} from "@/actions/team-invitation";

interface TeamInvitationStepContentProps {
  onContinue?: () => void;
  isTransitioning?: boolean;
}

const DEFAULT_EMPTY_INVITES: TeamInvite[] = [
  { id: "invite-1", email: "", role: "Editor" },
  { id: "invite-2", email: "", role: "Editor" },
  { id: "invite-3", email: "", role: "Editor" },
];

export function TeamInvitationStepContent({
  onContinue,
  isTransitioning,
}: TeamInvitationStepContentProps) {
  const [invites, setInvites] = useState<TeamInvite[]>(DEFAULT_EMPTY_INVITES);
  const [shareLink, setShareLink] = useState<string>(
    "https://streamline.app/invite/team-workspace-7x9q"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { goNext } = useOnboardingTransition();

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const result = await getTeamInvitationsAction();
        if (!isMounted) return;

        if (result.success) {
          if (result.inviteLink) {
            setShareLink(result.inviteLink);
          }
          if (result.invitations && result.invitations.length > 0) {
            const loaded: TeamInvite[] = result.invitations.map((inv) => ({
              id: inv.id,
              email: inv.email,
              role:
                inv.role.charAt(0).toUpperCase() +
                inv.role.slice(1).toLowerCase(),
            }));
            // Pad with empty rows up to 3 if fewer exist
            while (loaded.length < 3) {
              const nextNum = loaded.length + 1;
              loaded.push({
                id: `invite-pad-${nextNum}`,
                email: "",
                role: "Editor",
              });
            }
            setInvites(loaded);
          }
        }
      } catch (err) {
        console.error("Failed to load team invitations:", err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleContinue = async () => {
    if (isSubmitting || isTransitioning) return;
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await createTeamInvitationsAction({
        invites: invites.map((inv) => ({
          email: inv.email,
          role: inv.role,
        })),
      });

      if (!result.success) {
        setErrorMessage(result.error || "Failed to save team invitations");
        setIsSubmitting(false);
        return;
      }

      if (onContinue) {
        onContinue();
      } else {
        goNext();
      }
    } catch (err: unknown) {
      console.error("handleContinue error:", err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while saving team invitations"
      );
      setIsSubmitting(false);
    }
  };

  const handleEmailChange = (id: string, newEmail: string) => {
    setErrorMessage(null);
    setInvites((prev) =>
      prev.map((item) => (item.id === id ? { ...item, email: newEmail } : item))
    );
  };

  const handleRoleChange = (id: string, newRole: string) => {
    setInvites((prev) =>
      prev.map((item) => (item.id === id ? { ...item, role: newRole } : item))
    );
  };

  const handleAddAnother = () => {
    const nextNum = invites.length + 1;
    setInvites((prev) => [
      ...prev,
      {
        id: `invite-${Date.now()}-${nextNum}`,
        email: "",
        role: "Editor",
      },
    ]);
  };

  const hasEnteredEmails = invites.some((inv) => inv.email.trim().length > 0);
  const buttonLabel = isSubmitting
    ? "Saving..."
    : hasEnteredEmails
    ? "Continue"
    : "Skip for now";

  return (
    <div
      className="flex flex-col w-full items-stretch min-w-0"
      style={{
        marginTop: "clamp(24px, 5.5vh, 64px)",
      }}
    >
      {/* HEADING BLOCK: Aligned with Steps 3 and 4 */}
      <div className="w-full max-w-full md:max-w-[440px] flex flex-col gap-[6px] flex-shrink-0 min-w-0 text-left">
        <h1 className="font-['Geist',sans-serif] text-[24px] font-semibold leading-[30px] tracking-[-0.0015em] text-[#282828] m-0">
          Invite your team
        </h1>
        <p className="font-['Geist',sans-serif] text-[14px] font-medium leading-[20px] tracking-[-0.0015em] text-[#757575] m-0 max-w-[440px]">
          Collaborate with teammates. They’ll get an email invite to join your workspace
        </p>
      </div>

      {/* INVITATION ROWS STACK */}
      <div
        className="flex flex-col gap-[10px] w-full min-w-0 flex-shrink-0"
        style={{
          marginTop: "clamp(18px, 3.2vh, 32px)",
        }}
      >
        {invites.map((invite, index) => (
          <TeamInviteRow
            key={invite.id}
            invite={invite}
            placeholder={`teammate${index + 1}@company.com`}
            onChangeEmail={handleEmailChange}
            onChangeRole={handleRoleChange}
          />
        ))}

        {/* + ADD ANOTHER BUTTON: tight height, border touching text, no background, #757575 text and icon */}
        <button
          type="button"
          onClick={handleAddAnother}
          className="self-start mt-[4px] h-[22px] px-[8px] rounded-full border border-[#EAEAEA] bg-transparent hover:border-[#DCDCDC] flex items-center gap-[5px] text-[#757575] transition-all cursor-pointer text-[13px] font-medium tracking-[-0.0015em] outline-none select-none"
          style={{ boxSizing: "border-box" }}
          aria-label="Add another teammate"
        >
          <svg
            className="w-[11px] h-[11px] text-[#757575] flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span className="leading-none pt-[0.5px] tracking-[-0.0015em]">Add another</span>
        </button>
      </div>

      {/* SHARE LINK CARD */}
      <div
        className="w-full flex-shrink-0"
        style={{
          marginTop: "clamp(16px, 2.8vh, 26px)",
        }}
      >
        <ShareLinkCard inviteLink={shareLink} />
      </div>

      {/* ERROR MESSAGE BANNER */}
      {errorMessage && (
        <div
          role="alert"
          className="w-full max-w-full md:max-w-[440px] mt-[12px] p-[10px] rounded-[6px] bg-[#FEF2F2] border border-[#F87171] text-[#B91C1C] text-[13px] font-medium leading-[18px]"
        >
          {errorMessage}
        </div>
      )}

      {/* PRIMARY BUTTON: Exactly matching primary button from Tools */}
      <button
        type="button"
        id="skip-for-now-btn"
        disabled={isTransitioning || isSubmitting}
        onClick={handleContinue}
        className="w-full max-w-full md:max-w-[440px] h-[36px] bg-[#282828] hover:bg-[#383838] border border-[#B7B7B7] rounded-[8px] px-[10px] flex items-center justify-center transition-all cursor-pointer active:scale-[0.99] flex-shrink-0 disabled:opacity-80 disabled:cursor-not-allowed select-none"
        style={{
          marginTop: "clamp(18px, 2.6vh, 26px)",
          boxShadow: "inset 2px 2px 4px rgba(255, 255, 255, 0.20)",
          boxSizing: "border-box",
        }}
      >
        <span className="font-['Geist',sans-serif] text-[14px] font-medium leading-[16px] tracking-[-0.0015em] text-white">
          {buttonLabel}
        </span>
      </button>
    </div>
  );
}
