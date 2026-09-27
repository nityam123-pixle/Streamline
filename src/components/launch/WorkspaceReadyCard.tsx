'use client';

import React from "react";

export function WorkspaceReadyCard() {
  return (
    <div
      className="relative w-[205px] h-[74px] bg-white border border-[#EAEAEA] rounded-[8px] p-[12px] flex items-center gap-[12px] select-none flex-shrink-0"
      style={{
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.04)",
        boxSizing: "border-box",
      }}
    >
      {/* Upward Tooltip Beak (Polygon 1): 20px triangle with 2px radius, pointing up to connector */}
      <div
        className="absolute -top-[7px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[7px] border-b-white z-20 pointer-events-none"
        style={{
          filter: "drop-shadow(0 -1px 0 #EAEAEA)",
        }}
      />

      {/* Icon / Check 28 × 28: green circle with crisp white check */}
      <div
        className="w-[28px] h-[28px] rounded-full bg-[#48BB78] flex items-center justify-center flex-shrink-0"
        style={{
          boxShadow: "inset 0 1px 2px rgba(255, 255, 255, 0.40)",
          boxSizing: "border-box",
        }}
      >
        <svg
          className="w-[14px] h-[14px] text-white flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      {/* Frame 137: Title & Description */}
      <div className="w-[141px] flex flex-col justify-center text-left">
        <span className="font-['Geist',sans-serif] text-[14px] font-medium leading-[18px] tracking-[-0.0015em] text-[#282828] block">
          Workspace Ready
        </span>
        <span className="font-['Geist',sans-serif] text-[12px] font-medium leading-[16px] tracking-[-0.0015em] text-[#6A6A6A] block mt-[2px]">
          Your workspace is all set and ready to go
        </span>
      </div>
    </div>
  );
}
