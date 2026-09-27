'use client';

import React from "react";
import { type MemberSummaryItem } from "@/lib/launch/schemas";

export interface MemberAvatarTheme {
  bg: string;
  border: string;
  text: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

export const MEMBER_AVATAR_THEMES: MemberAvatarTheme[] = [
  {
    // Blue (matches exact SA badge styling)
    bg: "#A9C7FF",
    border: "#82AEFF",
    text: "#2086FF",
    badgeBg: "#E0F2FF",
    badgeBorder: "#82AEFF",
    badgeText: "#2086FF",
  },
  {
    // Green (89EBBA, 58C16C, 4CBD61)
    bg: "#89EBBA",
    border: "#58C16C",
    text: "#15803D",
    badgeBg: "#E8FAF0",
    badgeBorder: "#89EBBA",
    badgeText: "#15803D",
  },
  {
    // Purple / Violet (AF76FF, 7F6EFF)
    bg: "#D7C2FE",
    border: "#AF76FF",
    text: "#7F6EFF",
    badgeBg: "#F3EEFE",
    badgeBorder: "#AF76FF",
    badgeText: "#7F6EFF",
  },
  {
    // Orange / Amber (FFA153, FFCE65)
    bg: "#FFD9BE",
    border: "#FFA153",
    text: "#C2410C",
    badgeBg: "#FFF1E7",
    badgeBorder: "#FFA153",
    badgeText: "#C2410C",
  },
  {
    // Cyan (44CCDD, 05B9F7)
    bg: "#B7F0F7",
    border: "#44CCDD",
    text: "#0284C7",
    badgeBg: "#E0F8FB",
    badgeBorder: "#44CCDD",
    badgeText: "#0284C7",
  },
  {
    // Coral / Pink (FBAAAB, E32B35)
    bg: "#FBAAAB",
    border: "#E32B35",
    text: "#B91C1C",
    badgeBg: "#FEF2F2",
    badgeBorder: "#FBAAAB",
    badgeText: "#B91C1C",
  },
];

export function MemberCard({
  member,
  index = 0,
}: {
  member: MemberSummaryItem;
  index?: number;
}) {
  const theme = MEMBER_AVATAR_THEMES[index % MEMBER_AVATAR_THEMES.length];
  const initial = (member.name || member.email || "M").charAt(0).toUpperCase();

  return (
    <div
      className="w-full flex items-center justify-between gap-[12px] bg-white border border-[#EAEAEA] rounded-[8px] p-[10px] sm:p-[12px] transition-colors"
      style={{ boxSizing: "border-box" }}
    >
      <div className="flex items-center gap-[12px] min-w-0 flex-1">
        {/* Avatar box matching exact SA badge geometry and style */}
        <div
          className="w-[36px] h-[36px] rounded-[8px] border flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: theme.bg,
            borderColor: theme.border,
            boxSizing: "border-box",
          }}
        >
          <span
            className="font-['Geist',sans-serif] text-[14px] font-semibold leading-none tracking-[-0.0015em]"
            style={{ color: theme.text }}
          >
            {initial}
          </span>
        </div>

        {/* Text stack */}
        <div className="flex flex-col min-w-0 text-left flex-1">
          <span className="font-['Geist',sans-serif] text-[14px] font-semibold leading-[18px] tracking-[-0.0015em] text-[#282828] truncate block">
            {member.name || member.email}
          </span>
          <span className="font-['Geist',sans-serif] text-[13px] font-normal leading-[18px] tracking-[-0.0015em] text-[#757575] truncate block mt-[1px]">
            {member.jobTitle ? `${member.jobTitle} • ${member.email}` : member.email}
          </span>
        </div>
      </div>

      {/* Role Badge */}
      <div className="flex items-center flex-shrink-0">
        <span
          className="font-['Geist',sans-serif] text-[11px] font-semibold px-[8px] py-[3px] rounded-[6px] capitalize"
          style={{
            backgroundColor: theme.badgeBg,
            borderColor: theme.badgeBorder,
            borderWidth: "1px",
            color: theme.badgeText,
          }}
        >
          {member.role}
        </span>
      </div>
    </div>
  );
}
