'use client';

import React from "react";

interface BenefitItem {
  id: string;
  heading: string;
  description: string;
}

const BENEFITS_DATA: BenefitItem[] = [
  {
    id: "benefit-1",
    heading: "Shared workflow templates",
    description:
      "Save time by sharing reusable automation templates across your team-no need to rebuild the same logic twice.",
  },
  {
    id: "benefit-2",
    heading: "Real-time collaboration",
    description:
      "Work together on automation in real time-edit, comment, and iterate without version conflicts or handoffs.",
  },
  {
    id: "benefit-3",
    heading: "Unified team insights",
    description:
      "Get a single view of performance across all workflows-track adoption, bottlenecks, and impact in one place.",
  },
];

export function TeamInvitationStepVisual() {
  return (
    <div
      className="w-full h-full min-h-0 relative flex items-center justify-center p-[20px] select-none"
      style={{ boxSizing: "border-box" }}
    >
      {/* WHY INVITE YOUR TEAM CARD: 440 × 401px, 12px radius, #FFFFFF, border #EAEAEA, shadow 0 3px 6px rgba(0,0,0,0.04) */}
      <div
        className="w-full max-w-[440px] h-[401px] bg-white border border-[#EAEAEA] rounded-[12px] flex flex-col overflow-hidden z-10 transition-transform duration-150 flex-shrink-0"
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
            Why Invite Your Team?
          </h2>
        </div>

        {/* CONTENT SECTION: Frame 119, 440 × 339px, 28px padding all around, 24px gap between rows */}
        <div
          className="w-full h-[339px] flex flex-col p-[28px] gap-[24px] flex-shrink-0"
          style={{ boxSizing: "border-box" }}
        >
          {BENEFITS_DATA.map((benefit) => (
            <div
              key={benefit.id}
              className="w-full max-w-[384px] h-[78px] flex items-start gap-[12px] min-w-0 flex-shrink-0"
              style={{ boxSizing: "border-box" }}
            >
              {/* Frame 113: 18 × 18px Icon Container, 6px radius, #F0F0F0 bg, with inner #757575 shaded squircle */}
              <div
                className="w-[18px] h-[18px] rounded-[6px] bg-[#F0F0F0] p-[2px] flex items-center justify-center flex-shrink-0 mt-[1px]"
                style={{ boxSizing: "border-box" }}
                aria-hidden="true"
              >
                <div
                  className="w-[14px] h-[14px] rounded-[4px]"
                  style={{
                    background: "linear-gradient(180deg, #9C9C9C 0%, #757575 100%)",
                    boxShadow:
                      "inset 0 0.5px 1px rgba(255, 255, 255, 0.35), 0 0.5px 1.5px rgba(0, 0, 0, 0.12)",
                  }}
                />
              </div>

              {/* Frame 115: 354 × 78px Content Block, itemSpacing 6px */}
              <div className="w-[354px] flex flex-col gap-[6px] min-w-0 flex-1">
                <span className="font-['Geist',sans-serif] text-[14px] font-medium leading-[18px] tracking-[-0.0015em] text-[#282828] block">
                  {benefit.heading}
                </span>
                <span className="font-['Geist',sans-serif] text-[14px] font-normal leading-[20px] tracking-[-0.0015em] text-[#757575] block">
                  {benefit.description}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
