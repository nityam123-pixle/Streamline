'use client';

import React, { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { SetupSummaryCard, SetupSummaryData } from "./SetupSummaryCard";
import { MemberCard } from "./MemberCard";
import {
  getLaunchSummaryAction,
  completeOnboardingAction,
} from "@/actions/launch";

interface LaunchStepContentProps {
  onContinue?: () => void;
  isTransitioning?: boolean;
}

export function LaunchStepContent({
  onContinue,
  isTransitioning,
}: LaunchStepContentProps) {
  const shouldReduceMotion = useReducedMotion();
  const [summaryData, setSummaryData] = useState<SetupSummaryData | null>(null);
  const [memberRole, setMemberRole] = useState<string>("owner");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchSummary() {
      try {
        const res = await getLaunchSummaryAction();
        if (!isMounted) return;

        if (res.success && res.summary) {
          if (res.summary.memberRole) {
            setMemberRole(res.summary.memberRole);
          }
          setSummaryData({
            companyInitials: res.summary.companyInitials,
            companyName: res.summary.companyName,
            userRole: res.summary.userRole,
            automatingText: res.summary.automatingText,
            integrationsText: res.summary.integrationsText,
            workflowText: res.summary.workflowText,
            invitedTeammatesText: res.summary.invitedTeammatesText,
            membersCount: res.summary.membersCount,
            members: res.summary.members,
            shareableInviteLink: res.summary.shareableInviteLink,
          });
        }
      } catch (err) {
        console.error("Failed to load launch summary:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchSummary();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLaunch = async () => {
    if (isSubmitting || isTransitioning || isCompleted) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    // Non-owner teammates don't execute owner setup completion
    if (memberRole !== "owner" && memberRole !== "admin") {
      setIsCompleted(true);
      setIsSubmitting(false);
      if (onContinue) {
        onContinue();
      }
      return;
    }

    try {
      const res = await completeOnboardingAction();
      if (!res.success) {
        setErrorMessage(res.error || "Failed to complete onboarding.");
        setIsSubmitting(false);
        return;
      }

      setIsCompleted(true);
      setIsSubmitting(false);

      if (onContinue) {
        onContinue();
      }
    } catch (err) {
      console.error("completeOnboardingAction error:", err);
      setErrorMessage("An unexpected error occurred while launching.");
      setIsSubmitting(false);
    }
  };

  const itemVariants = (delay: number) => ({
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0.15 : 0.4,
        delay: shouldReduceMotion ? 0 : delay,
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      },
    },
  });

  // Render static confirmation screen placeholder when onboarding is complete
  if (isCompleted) {
    return (
      <div
        className="flex flex-col w-full items-stretch min-w-0"
        style={{
          marginTop: "clamp(24px, 5.5vh, 64px)",
        }}
      >
        <motion.div
          variants={itemVariants(0.04)}
          initial="hidden"
          animate="visible"
          className="w-full max-w-full md:max-w-[440px] flex flex-col gap-[16px] flex-shrink-0 min-w-0 text-left"
        >
          {/* Green checkmark badge */}
          <div
            className="w-[44px] h-[44px] rounded-full bg-[#38A169] flex items-center justify-center flex-shrink-0"
            style={{
              boxShadow: "0 2px 8px rgba(56, 161, 105, 0.25), inset 0 1px 2px rgba(255, 255, 255, 0.40)",
              boxSizing: "border-box",
            }}
          >
            <svg
              className="w-[22px] h-[22px] text-white flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <div className="flex flex-col gap-[6px]">
            <h1 className="font-['Geist',sans-serif] text-[24px] font-semibold leading-[30px] tracking-[-0.0015em] text-[#282828] m-0">
              {memberRole !== "owner" ? "Welcome to the Team!" : "Workspace Launched!"}
            </h1>
            <p className="font-['Geist',sans-serif] text-[14px] font-medium leading-[20px] tracking-[-0.0015em] text-[#757575] m-0 max-w-[415px]">
              {memberRole !== "owner"
                ? `You’ve joined ${summaryData?.companyName || "Streamline"} as a teammate. Your account is ready.`
                : "Your Streamline workspace is ready. All configuration details have been saved to your account."}
            </p>
          </div>
        </motion.div>

        {/* Confirmation Details Card */}
        <motion.div
          variants={itemVariants(0.12)}
          initial="hidden"
          animate="visible"
          className="w-full max-w-full md:max-w-[440px] bg-[#F0F0F0] border border-[#EAEAEA] rounded-[8px] p-[20px] flex flex-col gap-[14px] flex-shrink-0 mt-[24px]"
          style={{ boxSizing: "border-box" }}
        >
          <div className="flex items-center gap-[8px]">
            <span className="w-[8px] h-[8px] rounded-full bg-[#38A169] flex-shrink-0 animate-pulse" />
            <span className="font-['Geist',sans-serif] text-[13px] font-semibold tracking-[-0.0015em] text-[#282828]">
              {memberRole !== "owner" ? "Status: Joined workspace" : "Status: Onboarding completed"}
            </span>
          </div>


          <div className="flex flex-col gap-[8px] pt-[8px] border-t border-[#E2E2E2]">
            <div className="flex justify-between items-center text-[13px] font-['Geist',sans-serif]">
              <span className="text-[#757575] font-medium">Workspace</span>
              <span className="text-[#282828] font-semibold truncate max-w-[240px]">
                {summaryData?.companyName || "Streamline Workspace"}
              </span>
            </div>
            <div className="flex justify-between items-center text-[13px] font-['Geist',sans-serif]">
              <span className="text-[#757575] font-medium">Role</span>
              <span className="text-[#282828] font-medium truncate max-w-[240px]">
                {summaryData?.userRole || "Owner"}
              </span>
            </div>
            <div className="flex justify-between items-center text-[13px] font-['Geist',sans-serif]">
              <span className="text-[#757575] font-medium">Automations</span>
              <span className="text-[#282828] font-medium truncate max-w-[240px]">
                {summaryData?.automatingText?.replace("Automating: ", "") || "None"}
              </span>
            </div>
            <div className="flex justify-between items-center text-[13px] font-['Geist',sans-serif]">
              <span className="text-[#757575] font-medium">Tools</span>
              <span className="text-[#282828] font-medium truncate max-w-[240px]">
                {summaryData?.integrationsText || "None"}
              </span>
            </div>
            <div className="flex justify-between items-center text-[13px] font-['Geist',sans-serif]">
              <span className="text-[#757575] font-medium">Team</span>
              <span className="text-[#282828] font-medium truncate max-w-[240px]">
                {summaryData?.members && summaryData.members.length > 0
                  ? `${summaryData.members.length} ${summaryData.members.length === 1 ? "active member" : "active members"}`
                  : summaryData?.invitedTeammatesText?.replace("Team: ", "") || "No teammates invited"}
              </span>
            </div>
          </div>

          {/* Member cards shown after Launch button is pressed */}
          {summaryData?.members && summaryData.members.length > 0 && (
            <div className="flex flex-col gap-[10px] pt-[12px] border-t border-[#E2E2E2]">
              <span className="font-['Geist',sans-serif] text-[13px] font-semibold text-[#282828] text-left">
                Team Members ({summaryData.members.length})
              </span>
              <div className="flex flex-col gap-[8px]">
                {summaryData.members.map((m, idx) => (
                  <MemberCard key={m.id} member={m} index={idx} />
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Dashboard Placeholder Note */}
        <motion.div
          variants={itemVariants(0.18)}
          initial="hidden"
          animate="visible"
          className="w-full max-w-full md:max-w-[440px] mt-[16px] bg-[#FAFAFA] border border-[#EAEAEA] rounded-[8px] p-[16px]"
          style={{ boxSizing: "border-box" }}
        >
          <p className="font-['Geist',sans-serif] text-[13px] font-medium leading-[19px] text-[#757575] m-0">
            The main application dashboard is queued up next in the build sequence. In the meantime, your workspace configuration is locked in and ready.
          </p>
        </motion.div>

        {/* Back to Summary Toggle */}
        <motion.div
          variants={itemVariants(0.24)}
          initial="hidden"
          animate="visible"
          className="w-full max-w-full md:max-w-[440px] mt-[16px]"
        >
          <button
            type="button"
            onClick={() => setIsCompleted(false)}
            className="font-['Geist',sans-serif] text-[13px] font-medium text-[#757575] hover:text-[#282828] transition-colors cursor-pointer select-none py-[4px]"
          >
            ← Review setup summary
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col w-full items-stretch min-w-0"
      style={{
        marginTop: "clamp(24px, 5.5vh, 64px)",
      }}
    >
      {/* TEAMMATE WELCOME BANNER (AC-8) */}
      {memberRole !== "owner" && (
        <motion.div
          variants={itemVariants(0.02)}
          initial="hidden"
          animate="visible"
          className="w-full max-w-full md:max-w-[440px] bg-[#F0FDF4] border border-[#BBF7D0] rounded-[8px] p-[14px] flex items-center gap-[12px] mb-[18px]"
        >
          <div className="w-[32px] h-[32px] rounded-full bg-[#16A34A] flex items-center justify-center flex-shrink-0 text-white">
            <svg
              className="w-[16px] h-[16px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="flex flex-col text-left">
            <span className="font-['Geist',sans-serif] text-[13px] font-semibold text-[#166534]">
              Welcome to the team!
            </span>
            <span className="font-['Geist',sans-serif] text-[12px] text-[#15803D]">
              You’ve joined {summaryData?.companyName || "the workspace"} as {memberRole === "admin" ? "an Admin" : memberRole === "editor" ? "an Editor" : "a Viewer"}.
            </span>
          </div>
        </motion.div>
      )}

      {/* HEADING BLOCK: Aligned with Steps 3, 4, 5 */}
      <motion.div
        variants={itemVariants(0.04)}
        initial="hidden"
        animate="visible"
        className="w-full max-w-full md:max-w-[440px] flex flex-col gap-[6px] flex-shrink-0 min-w-0 text-left"
      >
        <h1 className="font-['Geist',sans-serif] text-[24px] font-semibold leading-[30px] tracking-[-0.0015em] text-[#282828] m-0">
          {memberRole !== "owner" ? "Welcome to your workspace!" : "You’re all set!"}
        </h1>
        <p className="font-['Geist',sans-serif] text-[14px] font-medium leading-[20px] tracking-[-0.0015em] text-[#757575] m-0 max-w-[415px]">
          {memberRole !== "owner"
            ? "Your workspace is ready. You have access to collaborate with your team."
            : "Your Streamline workspace is ready. Your first workflow is queued up and ready to configure."}
        </p>
      </motion.div>

      {/* SETUP SUMMARY CARD */}
      <motion.div
        variants={itemVariants(0.12)}
        initial="hidden"
        animate="visible"
        className="w-full flex-shrink-0"
        style={{
          marginTop: "clamp(20px, 3.5vh, 32px)",
        }}
      >
        <SetupSummaryCard data={summaryData || undefined} />
      </motion.div>

      {/* ERROR BANNER */}
      {errorMessage && (
        <div
          role="alert"
          className="w-full max-w-full md:max-w-[440px] p-[10px] mt-[12px] bg-[#FFF5F5] border border-[#FED7D7] rounded-[8px] text-[13px] text-[#C53030] font-['Geist',sans-serif]"
        >
          {errorMessage}
        </div>
      )}

      {/* PRIMARY CTA: Launch Streamline Button */}
      <motion.div
        variants={itemVariants(0.2)}
        initial="hidden"
        animate="visible"
        className="w-full max-w-full md:max-w-[440px]"
        style={{
          marginTop: "clamp(20px, 3vh, 30px)",
        }}
      >
        <button
          type="button"
          id="launch-streamline-btn"
          disabled={isTransitioning || isSubmitting || isLoading}
          onClick={handleLaunch}
          className="w-full h-[36px] bg-[#282828] hover:bg-[#383838] border border-[#B7B7B7] rounded-[8px] px-[10px] flex items-center justify-center gap-[6px] transition-all cursor-pointer active:scale-[0.99] flex-shrink-0 disabled:opacity-80 disabled:cursor-not-allowed select-none"
          style={{
            boxShadow: "inset 2px 2px 4px rgba(255, 255, 255, 0.20)",
            boxSizing: "border-box",
          }}
          aria-label="Launch Streamline"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-[8px] font-['Geist',sans-serif] text-[14px] font-medium leading-[16px] tracking-[-0.0015em] text-white">
              <svg
                className="animate-spin h-[14px] w-[14px] text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Launching...
            </span>
          ) : (
            <span className="font-['Geist',sans-serif] text-[14px] font-medium leading-[16px] tracking-[-0.0015em] text-white">
              {memberRole !== "owner" ? "Enter Workspace" : "Launch Streamline"}
            </span>
          )}
        </button>
      </motion.div>
    </div>
  );
}
