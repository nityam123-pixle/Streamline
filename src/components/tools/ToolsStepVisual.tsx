'use client';

import React from "react";
import { TipIndicatorIcon } from "./ToolBrandIcons";

interface TipItem {
  id: string;
  heading: string;
  description: string;
}

const TIPS_DATA: TipItem[] = [
  {
    id: "tip-1",
    heading: "Use an admin or owner account",
    description:
      "Make sure the account you connect has the right permissions - limited access may block key features.",
  },
  {
    id: "tip-2",
    heading: "Start with one workflow before scaling",
    description:
      "Test your connection with a simple automation first to make sure data flows correctly.",
  },
  {
    id: "tip-3",
    heading: "Review permissions carefully",
    description:
      "Only grant access to the data and actions your workflows actually need - you can expand later.",
  },
];

export function ToolsStepVisual() {
  return (
    <div
      className="w-full h-full min-h-0 relative flex items-center justify-center p-[20px] select-none"
      style={{ boxSizing: "border-box" }}
    >
      {/* TOOLS CONNECTING TIPS CARD: 440 × 347px, 12px radius, #FFFFFF, border #EAEAEA, shadow 0 3px 6px rgba(0,0,0,0.04) */}
      <div
        className="w-full max-w-[440px] min-h-[347px] bg-white border border-[#EAEAEA] rounded-[12px] flex flex-col overflow-hidden z-10 transition-transform duration-150"
        style={{
          boxShadow: "0 3px 6px rgba(0, 0, 0, 0.04)",
          boxSizing: "border-box",
        }}
      >
        {/* HEADER: Frame 112, 440 × 62px, 1px border bottom, centered text */}
        <div
          className="w-full h-[62px] border-b border-[#EAEAEA] flex items-center justify-center px-[20px] flex-shrink-0"
          style={{ boxSizing: "border-box" }}
        >
          <h2 className="font-['Geist',sans-serif] text-[14px] font-medium leading-[18px] tracking-[-0.0015em] text-[#282828] text-center m-0">
            Tools Connecting Tips
          </h2>
        </div>

        {/* CONTENT SECTION: Frame 119, 440 × 285px, 28px padding all around, 24px gap between rows */}
        <div
          className="w-full flex-1 flex flex-col p-[28px] gap-[24px]"
          style={{ boxSizing: "border-box" }}
        >
          {TIPS_DATA.map((tip) => (
            <div
              key={tip.id}
              className="w-full flex items-start gap-[12px] min-w-0"
              style={{ boxSizing: "border-box" }}
            >
              {/* Frame 113: 18 × 18px Icon Box, 6px radius, #F0F0F0 bg, with inner #757575 shaded squircle */}
              <TipIndicatorIcon />

              {/* Frame 115: Text Block, itemSpacing 6px */}
              <div className="flex flex-col min-w-0 flex-1 gap-[6px]">
                <span className="font-['Geist',sans-serif] text-[14px] font-medium leading-[18px] tracking-[-0.0015em] text-[#282828] block">
                  {tip.heading}
                </span>
                <span className="font-['Geist',sans-serif] text-[14px] font-normal leading-[20px] tracking-[-0.0015em] text-[#757575] block">
                  {tip.description}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
