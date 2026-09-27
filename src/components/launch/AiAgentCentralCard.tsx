'use client';

import React from "react";

export function AiAgentCentralCard() {
  return (
    <div
      className="w-[136px] h-[126px] rounded-[12px] p-[12px] flex flex-col items-center gap-[12px] select-none flex-shrink-0 relative"
      style={{
        boxSizing: "border-box",
        border: "1.5px solid transparent",
        background: `
          linear-gradient(#FFFFFF, #FFFFFF) padding-box,
          linear-gradient(to bottom left, #282828 0%, rgba(40, 40, 40, 0) 100%) border-box,
          linear-gradient(to top right, rgba(50, 142, 251, 0.5) 0%, rgba(50, 142, 251, 0) 100%) border-box
        `,
        boxShadow: "0 2px 20px rgba(133, 191, 255, 0.45)",
      }}
    >
      {/* AI Icon Holder (Frame 76): 44 × 44px, bg #E4E4E4, border 1px solid #EAEAEA, radius 10px, shadow 0 2px 4px rgba(0,0,0,0.04) */}
      <div
        className="w-[44px] h-[44px] bg-[#E4E4E4] border border-[#EAEAEA] rounded-[10px] p-[10px] flex items-center justify-center flex-shrink-0"
        style={{
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.04)",
          boxSizing: "border-box",
        }}
      >
        <svg
          className="w-[24px] h-[24px] text-[#282828] flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8L12 2Z"
            fill="#282828"
          />
        </svg>
      </div>

      {/* Frame 77: AI Agent Title & Subtitle */}
      <div className="w-[112px] flex flex-col items-center text-center">
        <h3 className="font-['Geist',sans-serif] text-[14px] font-medium leading-[18px] tracking-[-0.0015em] text-[#000000] text-center m-0">
          AI Agent
        </h3>
        <p className="w-[112px] font-['Geist',sans-serif] text-[11px] font-medium leading-[14px] tracking-[-0.0015em] text-[#6A6A6A] text-center m-0 mt-[2px]">
          Understands, decides and automates
        </p>
      </div>
    </div>
  );
}
