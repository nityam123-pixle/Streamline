'use client';

import React from "react";

export interface TeamInvite {
  id: string;
  email: string;
  role: string;
}

interface TeamInviteRowProps {
  invite: TeamInvite;
  onChangeEmail: (id: string, newEmail: string) => void;
  onChangeRole: (id: string, newRole: string) => void;
  placeholder?: string;
}

export function TeamInviteRow({
  invite,
  onChangeEmail,
  onChangeRole,
  placeholder = "teammate@company.com",
}: TeamInviteRowProps) {
  return (
    <div className="w-full flex items-center gap-[8px] h-[36px] min-w-0 flex-shrink-0">
      {/* EMAIL INPUT FIELD: No background, border #EAEAEA, radius 8px, px-16px, icon #929292, text #A1A1A1 */}
      <div
        className="w-[359px] flex-1 h-[36px] bg-transparent border border-[#EAEAEA] focus-within:border-[#B7B7B7] rounded-[8px] px-[16px] flex items-center gap-[10px] transition-colors min-w-0"
        style={{ boxSizing: "border-box" }}
      >
        {/* Envelope Icon: exact #929292 color from Figma inspector */}
        <svg
          className="w-[16px] h-[16px] flex-shrink-0 text-[#929292]"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
            d="M6.3 3.5h11.4A3.8 3.8 0 0 1 21.5 7.3v9.4a3.8 3.8 0 0 1-3.8 3.8H6.3A3.8 3.8 0 0 1 2.5 16.7V7.3a3.8 3.8 0 0 1 3.8-3.8Zm.2 2.2a1.7 1.7 0 0 0-1.7 1.7v.5c0 .38.2.73.53.93l6.17 3.85a1 1 0 0 0 1 0l6.17-3.85a1.08 1.08 0 0 0 .53-.93v-.5a1.7 1.7 0 0 0-1.7-1.7H6.5Z"
          />
        </svg>

        <input
          type="email"
          value={invite.email}
          onChange={(e) => onChangeEmail(invite.id, e.target.value)}
          placeholder={placeholder}
          className="w-full h-full bg-transparent border-none outline-none font-['Geist',sans-serif] text-[14px] text-[#A1A1A1] focus:text-[#282828] placeholder-[#A1A1A1] leading-[20px] tracking-[-0.0015em] min-w-0"
          aria-label="Teammate email"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {/* ROLE SELECTOR / EDITOR BUTTON: No background, border #EAEAEA, radius 8px, text #A1A1A1 strict */}
      <div className="relative w-[73px] h-[36px] flex-shrink-0">
        <select
          value={invite.role}
          onChange={(e) => onChangeRole(invite.id, e.target.value)}
          className="w-full h-full appearance-none bg-transparent hover:bg-[#FAFAFA] border border-[#EAEAEA] rounded-[8px] font-['Geist',sans-serif] text-[14px] text-[#A1A1A1] font-normal leading-[34px] tracking-[-0.0015em] text-center cursor-pointer outline-none focus:border-[#B7B7B7] transition-colors px-[6px]"
          aria-label="Teammate role"
        >
          <option value="Editor">Editor</option>
          <option value="Admin">Admin</option>
          <option value="Viewer">Viewer</option>
        </select>
      </div>
    </div>
  );
}
