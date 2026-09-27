import React, { useState, useEffect } from "react";
import { useSession } from "@/lib/auth/client";
import {
  getWorkspaceProfileAction,
  updateWorkspaceProfileAction,
} from "@/actions/workspace";
import { RoleSelector } from "./RoleSelector";
import { TeamSizeSelector } from "./TeamSizeSelector";

interface AboutStepContentProps {
  initialData?: {
    firstName?: string;
    lastName?: string;
    companyName?: string;
    role?: string;
    teamSize?: string;
  };
  onContinue?: (data: {
    firstName: string;
    lastName: string;
    companyName: string;
    role: string;
    teamSize: string;
  }) => void;
  isTransitioning?: boolean;
}

export function AboutStepContent({ initialData, onContinue, isTransitioning }: AboutStepContentProps) {
  const { data: session } = useSession();
  const [firstName, setFirstName] = useState(initialData?.firstName || "");
  const [lastName, setLastName] = useState(initialData?.lastName || "");
  const [companyName, setCompanyName] = useState(initialData?.companyName || "");
  const [role, setRole] = useState(initialData?.role || "");
  const [teamSize, setTeamSize] = useState(initialData?.teamSize || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load existing persisted profile on mount
  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      try {
        const res = await getWorkspaceProfileAction();
        if (isMounted && res.success && res.profile) {
          if (res.profile.firstName && !firstName) setFirstName(res.profile.firstName);
          if (res.profile.lastName && !lastName) setLastName(res.profile.lastName);
          if (res.profile.companyName && !companyName) setCompanyName(res.profile.companyName);
          if (res.profile.role && !role) setRole(res.profile.role);
          if (res.profile.teamSize && !teamSize) setTeamSize(res.profile.teamSize);
        }
      } catch {
        // Fallback to session prefill
      }
    }
    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  // Prefill first and last name from session user name if empty
  useEffect(() => {
    if (session?.user?.name && !firstName && !lastName) {
      const parts = session.user.name.trim().split(/\s+/);
      if (parts[0]) setFirstName(parts[0]);
      if (parts.length > 1) setLastName(parts.slice(1).join(" "));
    }
  }, [session, firstName, lastName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!role) {
      setErrorMessage("Please select your role");
      return;
    }

    if (!teamSize) {
      setErrorMessage("Please select your team size");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateWorkspaceProfileAction({
        firstName,
        lastName,
        companyName,
        role,
        teamSize,
      });

      if (!result.success) {
        setErrorMessage(result.error || "Failed to save profile. Please check your inputs.");
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);

      if (onContinue) {
        onContinue({
          firstName,
          lastName,
          companyName,
          role,
          teamSize,
        });
      }
    } catch {
      setErrorMessage("An unexpected error occurred while saving. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="flex flex-col w-full items-stretch min-w-0"
      style={{
        marginTop: "clamp(24px, 6.8vh, 74px)",
        gap: "clamp(16px, 2.6vh, 26px)",
      }}
    >
      {/* HEADING BLOCK */}
      <div className="w-full flex flex-col gap-[8px] flex-shrink-0 min-w-0 text-left">
        <h1 className="font-['Geist',sans-serif] text-[24px] font-semibold leading-[32px] tracking-[-0.0015em] text-[#282828] m-0">
          Tell us about yourself
        </h1>
        <p className="font-['Geist',sans-serif] text-[14px] font-medium leading-[20px] tracking-[-0.0015em] text-[#757575] m-0">
          We’ll personalize your experience based on your role and team.
        </p>
      </div>

      {/* FORM FIELDS */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-[14px] sm:gap-[16px] w-full min-w-0">
        {errorMessage && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-medium"
          >
            {errorMessage}
          </div>
        )}

        {/* FIRST NAME / LAST NAME ROW */}
        <div className="grid grid-cols-2 gap-[10px] w-full min-w-0">
          {/* First Name */}
          <div className="flex flex-col gap-[6px] min-w-0">
            <label className="font-['Geist',sans-serif] text-[14px] font-medium leading-[16px] tracking-[-0.0015em] text-[#282828] text-left">
              First name <span className="text-[#EF4444] text-[12px]">*</span>
            </label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Alex"
              className="w-full h-[36px] bg-white border border-[#EAEAEA] rounded-[8px] px-[14px] font-['Geist',sans-serif] text-[14px] leading-[18px] text-[#282828] placeholder:text-[#A1A1A1] tracking-[-0.0015em] focus:outline-none focus:border-[#282828] focus:ring-1 focus:ring-[#282828]/20 transition-all"
              style={{ boxSizing: "border-box" }}
            />
          </div>

          {/* Last Name */}
          <div className="flex flex-col gap-[6px] min-w-0">
            <label className="font-['Geist',sans-serif] text-[14px] font-medium leading-[16px] tracking-[-0.0015em] text-[#282828] text-left">
              Last name <span className="text-[#EF4444] text-[12px]">*</span>
            </label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Johnson"
              className="w-full h-[36px] bg-white border border-[#EAEAEA] rounded-[8px] px-[14px] font-['Geist',sans-serif] text-[14px] leading-[18px] text-[#282828] placeholder:text-[#A1A1A1] tracking-[-0.0015em] focus:outline-none focus:border-[#282828] focus:ring-1 focus:ring-[#282828]/20 transition-all"
              style={{ boxSizing: "border-box" }}
            />
          </div>
        </div>

        {/* COMPANY NAME */}
        <div className="flex flex-col gap-[6px] w-full min-w-0">
          <label className="font-['Geist',sans-serif] text-[14px] font-medium leading-[16px] tracking-[-0.0015em] text-[#282828] text-left">
            Company name <span className="text-[#EF4444] text-[12px]">*</span>
          </label>
          <input
            type="text"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Acme Corp."
            className="w-full h-[36px] bg-white border border-[#EAEAEA] rounded-[8px] px-[14px] font-['Geist',sans-serif] text-[14px] leading-[18px] text-[#282828] placeholder:text-[#A1A1A1] tracking-[-0.0015em] focus:outline-none focus:border-[#282828] focus:ring-1 focus:ring-[#282828]/20 transition-all"
            style={{ boxSizing: "border-box" }}
          />
        </div>

        {/* ROLE SELECTOR */}
        <RoleSelector value={role} onChange={setRole} />

        {/* TEAM SIZE SELECTOR */}
        <TeamSizeSelector value={teamSize} onChange={setTeamSize} />

        {/* CONTINUE BUTTON */}
        <button
          type="submit"
          disabled={isTransitioning || isSubmitting}
          className="w-full h-[36px] bg-[#282828] hover:bg-[#383838] border border-[#B7B7B7] rounded-[8px] px-[10px] flex items-center justify-center transition-all cursor-pointer active:scale-[0.99] flex-shrink-0 mt-2 disabled:opacity-80 disabled:cursor-not-allowed"
          style={{
            boxShadow: "inset 2px 2px 4px rgba(255, 255, 255, 0.20)",
            boxSizing: "border-box",
          }}
        >
          <span className="font-['Geist',sans-serif] text-[14px] font-medium leading-[16px] tracking-[-0.0015em] text-white">
            {isSubmitting ? "Saving..." : "Continue"}
          </span>
        </button>
      </form>
    </div>
  );
}
