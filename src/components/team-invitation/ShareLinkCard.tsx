'use client';

import React, { useState } from "react";

interface ShareLinkCardProps {
  inviteLink?: string;
}

export function ShareLinkCard({
  inviteLink = "https://streamline.app/invite/team-workspace-7x9q",
}: ShareLinkCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    let success = false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteLink);
        success = true;
      }
    } catch (err) {
      // Fallback below
    }

    if (!success) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = inviteLink;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        success = true;
      } catch (fallbackErr) {
        console.error("Failed to copy invite link", fallbackErr);
      }
    }

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <div
      className="w-full max-w-full md:max-w-[440px] bg-[#F0F0F0] border border-[#E4E4E4] rounded-[8px] p-[20px] flex items-start gap-[16px] flex-shrink-0 transition-colors"
      style={{
        borderWidth: "0.5px",
        boxSizing: "border-box",
      }}
    >
      {/* PURE WHITE #FFFFFF ICON CONTAINER WITH PURE #282828 BULB ICON */}
      <div
        className="w-[36px] h-[36px] rounded-[8px] bg-white flex items-center justify-center flex-shrink-0 mt-[1px]"
        style={{
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
          boxSizing: "border-box",
        }}
        aria-hidden="true"
      >
        {/* Pure #282828 Streamline Bulb Icon */}
        <svg
          className="w-[18px] h-[18px]"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            fill="#282828"
            d="M14.3 16.2a.6.6 0 0 1-.6.6h-3.4a.6.6 0 0 1-.6-.6L7.4 14.2A5.2 5.2 0 1 1 16.6 14.2Z M10.5 18h3a1 1 0 0 1 1 1v.6a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V19a1 1 0 0 1 1-1Z M11.1 2.4a.9.9 0 0 1 1.8 0v2.2a.9.9 0 0 1-1.8 0Z M2.4 11.1h2.2a.9.9 0 0 1 0 1.8H2.4a.9.9 0 0 1 0-1.8Z M19.4 11.1h2.2a.9.9 0 0 1 0 1.8h-2.2a.9.9 0 0 1 0-1.8Z M5.86 4.59 7.41 6.14a.9.9 0 0 1-1.27 1.27L4.59 5.86a.9.9 0 0 1 1.27-1.27Z M18.14 4.59a.9.9 0 0 1 1.27 1.27L17.86 7.41a.9.9 0 0 1-1.27-1.27Z"
          />
        </svg>
      </div>

      {/* TEXT CONTENT BLOCK */}
      <div className="flex flex-col min-w-0 flex-1">
        <h3 className="font-['Geist',sans-serif] text-[14px] font-medium leading-[18px] tracking-[-0.0015em] text-[#282828] m-0">
          Share the link instead
        </h3>
        <p className="font-['Geist',sans-serif] text-[14px] font-normal leading-[20px] tracking-[-0.0015em] text-[#757575] m-0 mt-[2px]">
          Copy your invite link and share it with your team.
        </p>

        {/* COPY INVITE LINK ACTION BUTTON */}
        <button
          type="button"
          onClick={handleCopy}
          className="self-start mt-[8px] font-['Geist',sans-serif] text-[14px] font-medium leading-[18px] tracking-[-0.0015em] text-[#328EFB] hover:text-[#2575DC] inline-flex items-center gap-[6px] transition-colors cursor-pointer group bg-transparent border-none p-0 outline-none"
          aria-label={copied ? "Invite link copied to clipboard" : "Copy invite link"}
        >
          {copied ? (
            <span className="inline-flex items-center gap-[4px] text-[#16A34A]">
              <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Copied invite link</span>
            </span>
          ) : (
            <>
              {/* Streamline Export Icon from public/icons/export.svg */}
              <svg
                className="w-[14px] h-[14px] text-[#328EFB] transition-transform group-hover:translate-x-[0.5px] group-hover:-translate-y-[0.5px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15.5 4h4.5v4.5M11.5 12.5L20 4" />
              </svg>
              <span>Copy invite link</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
