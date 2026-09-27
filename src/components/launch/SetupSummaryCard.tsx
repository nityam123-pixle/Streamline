'use client';

import React, { useState } from "react";

export interface SetupSummaryData {
  companyInitials?: string;
  companyName?: string;
  userRole?: string;
  automatingText?: string;
  integrationsText?: string;
  workflowText?: string;
  invitedTeammatesText?: string;
  shareableInviteLink?: string | null;
}

const DEFAULT_SUMMARY: SetupSummaryData = {
  companyInitials: "DC",
  companyName: "DSCODE",
  userRole: "Founder / CEO at DSCODE",
  automatingText: "Automating: HR & Recruiting, Customer Support, Marketing Ops",
  integrationsText: "1 tool selected: HubSpot",
  workflowText: "First workflow: Lead Generation",
  invitedTeammatesText: "Team: No teammates invited yet",
  shareableInviteLink: null,
};

export function SetupSummaryCard({
  data = DEFAULT_SUMMARY,
}: {
  data?: SetupSummaryData;
}) {
  const summary = { ...DEFAULT_SUMMARY, ...data };
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    if (!summary.shareableInviteLink) return;

    try {
      let success = false;
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summary.shareableInviteLink);
        success = true;
      } else if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = summary.shareableInviteLink;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        success = document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Ignore copy error
    }
  };

  return (
    <div
      className="w-full max-w-full md:max-w-[440px] bg-[#F0F0F0] border border-[#EAEAEA] rounded-[8px] p-[20px] flex flex-col gap-[18px] flex-shrink-0 select-none"
      style={{ boxSizing: "border-box" }}
    >
      {/* Title */}
      <h2 className="font-['Geist',sans-serif] text-[14px] font-medium leading-[18px] tracking-[-0.0015em] text-[#282828] m-0 text-left">
        Your setup summary
      </h2>

      {/* Row 1: Company / User Row */}
      <div className="flex items-center gap-[12px] min-w-0">
        {/* DC Avatar Badge: background #A9C7FF, border 1px #82AEFF, text #2086FF */}
        <div
          className="w-[36px] h-[36px] rounded-[8px] bg-[#A9C7FF] border border-[#82AEFF] flex items-center justify-center flex-shrink-0"
          style={{ boxSizing: "border-box" }}
        >
          <span className="font-['Geist',sans-serif] text-[14px] font-semibold leading-none tracking-[-0.0015em] text-[#2086FF]">
            {summary.companyInitials}
          </span>
        </div>

        {/* Company & Role */}
        <div className="flex flex-col min-w-0 text-left">
          <span className="font-['Geist',sans-serif] text-[14px] font-semibold leading-[18px] tracking-[-0.0015em] text-[#282828] truncate block">
            {summary.companyName}
          </span>
          <span className="font-['Geist',sans-serif] text-[14px] font-medium leading-[20px] tracking-[-0.0015em] text-[#757575] truncate block">
            {summary.userRole}
          </span>
        </div>
      </div>

      {/* Row 2: Automation Summary Row */}
      <div className="flex items-start gap-[10px] min-w-0 text-left">
        <div className="w-[18px] h-[18px] flex items-center justify-center flex-shrink-0 mt-[1px]">
          <svg
            className="w-[15px] h-[15px] text-[#A1A1A1] flex-shrink-0"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M3.6 6.5a4.2 4.2 0 1 0 8.4 0 4.2 4.2 0 1 0-8.4 0Z" />
            <path d="M14.5 7.4a3.4 3.4 0 1 0 6.8 0 3.4 3.4 0 1 0-6.8 0Z" />
            <path d="M4.8 14.1H10.8a3.8 3.8 0 0 1 0 7.6H4.8a3.8 3.8 0 0 1 0-7.6Z" />
            <path d="M17.1 14.1H19.6a3.4 3.4 0 0 1 0 6.8H17.1Z" />
          </svg>
        </div>
        <span className="font-['Geist',sans-serif] text-[14px] font-medium leading-[20px] tracking-[-0.0015em] text-[#757575]">
          {summary.automatingText}
        </span>
      </div>

      {/* Row 3: Integration Summary Row */}
      <div className="flex items-center gap-[10px] min-w-0 text-left">
        <div className="w-[18px] h-[18px] flex items-center justify-center flex-shrink-0">
          <svg
            className="w-[15px] h-[15px] text-[#A1A1A1] flex-shrink-0"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path fillRule="evenodd" clipRule="evenodd" d="M15 5.5h3.5a2.5 2.5 0 0 1 2.5 2.5v11.5a2.5 2.5 0 0 1-2.5 2.5h-13a2.5 2.5 0 0 1-2.5-2.5V8a2.5 2.5 0 0 1 2.5-2.5H9V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5ZM12 2.8a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM10.48 11.88L8.36 14l2.12 2.12a1.1 1.1 0 0 1-1.56 1.56L6.02 14.78a1.1 1.1 0 0 1 0-1.56l2.9-2.9a1.1 1.1 0 0 1 1.56 1.56ZM13.52 11.88L15.64 14l-2.12 2.12a1.1 1.1 0 0 0 1.56 1.56l2.9-2.9a1.1 1.1 0 0 0 0-1.56l-2.9-2.9a1.1 1.1 0 0 0-1.56 1.56Z" />
          </svg>
        </div>
        <span className="font-['Geist',sans-serif] text-[14px] font-medium leading-[20px] tracking-[-0.0015em] text-[#757575]">
          {summary.integrationsText}
        </span>
      </div>

      {/* Row 4: First Workflow Row */}
      <div className="flex items-center gap-[10px] min-w-0 text-left">
        <div className="w-[18px] h-[18px] flex items-center justify-center flex-shrink-0">
          <svg
            className="w-[15px] h-[15px] text-[#A1A1A1] flex-shrink-0"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M3.95 2.75 H9.05 A1.20 1.20 0 0 1 10.25 3.95 V9.05 A1.20 1.20 0 0 1 9.05 10.25 H3.95 A1.20 1.20 0 0 1 2.75 9.05 V3.95 A1.20 1.20 0 0 1 3.95 2.75 Z M17.50 2.75 A3.75 3.75 0 1 1 17.50 10.25 A3.75 3.75 0 1 1 17.50 2.75 Z M6.99 13.79 L10.21 17.01 A0.70 0.70 0 0 1 10.21 17.99 L6.99 21.21 A0.70 0.70 0 0 1 6.01 21.21 L2.79 17.99 A0.70 0.70 0 0 1 2.79 17.01 L6.01 13.79 A0.70 0.70 0 0 1 6.99 13.79 Z M14.95 13.75 H20.05 A1.20 1.20 0 0 1 21.25 14.95 V20.05 A1.20 1.20 0 0 1 20.05 21.25 H14.95 A1.20 1.20 0 0 1 13.75 20.05 V14.95 A1.20 1.20 0 0 1 14.95 13.75 Z M18.75 15.75 H16.25 A0.50 0.50 0 0 0 15.75 16.25 V18.75 A0.50 0.50 0 0 0 16.25 19.25 H18.75 A0.50 0.50 0 0 0 19.25 18.75 V16.25 A0.50 0.50 0 0 0 18.75 15.75 Z M6.50 5.50 H17.50 V7.50 H6.50 Z M5.50 6.50 H7.50 V17.50 H5.50 Z M6.50 16.50 H14.25 V18.50 H6.50 Z" />
          </svg>
        </div>
        <span className="font-['Geist',sans-serif] text-[14px] font-medium leading-[20px] tracking-[-0.0015em] text-[#757575]">
          {summary.workflowText}
        </span>
      </div>

      {/* Row 5: Invited Teammates & Shareable Link Row */}
      <div className="flex flex-col gap-[8px] min-w-0 text-left">
        <div className="flex items-center gap-[10px] min-w-0">
          <div className="w-[18px] h-[18px] flex items-center justify-center flex-shrink-0">
            <svg
              className="w-[15px] h-[15px] text-[#A1A1A1] flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <span className="font-['Geist',sans-serif] text-[14px] font-medium leading-[20px] tracking-[-0.0015em] text-[#757575]">
            {summary.invitedTeammatesText || "Team: No teammates invited yet"}
          </span>
        </div>

        {summary.shareableInviteLink && (
          <div className="flex items-center justify-between gap-[8px] ml-[28px] pl-[10px] pr-[6px] py-[5px] bg-[#E8E8E8] rounded-[6px] border border-[#DFDFDF]">
            <span className="font-['Geist',sans-serif] text-[12px] font-medium text-[#757575] truncate select-all">
              {summary.shareableInviteLink}
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="font-['Geist',sans-serif] text-[12px] font-medium text-[#282828] hover:text-black px-[8px] py-[2px] bg-white hover:bg-[#FAFAFA] rounded border border-[#D5D5D5] transition-colors flex-shrink-0 cursor-pointer select-none active:scale-[0.98]"
              aria-label="Copy shareable invite link"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
