"use client";

import React from "react";
import { AiAgentIcon } from "./icons";

export function AiAgentHeroCard() {
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
        boxShadow: "0 2px 10px rgba(133, 191, 255, 0.45)",
      }}
    >
      {/* AI Icon Holder (Frame 76): 44 × 44 px, bg #E4E4E4, border 1px solid #EAEAEA, radius 10px, shadow 0 2px 4px rgba(0,0,0,0.04), padding 10px */}
      <div
        className="w-[44px] h-[44px] bg-[#E4E4E4] border border-[#EAEAEA] rounded-[10px] p-[10px] flex items-center justify-center flex-shrink-0"
        style={{
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.04)",
          boxSizing: "border-box",
        }}
      >
        <div className="w-[24px] h-[24px] flex items-center justify-center flex-shrink-0">
          <AiAgentIcon className="w-[24px] h-[24px] text-[#282828]" fill="#282828" />
        </div>
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
