"use client";

import React from "react";

interface TeamSizeSelectorProps {
  value: string;
  onChange: (size: string) => void;
}

export function TeamSizeSelector({ value, onChange }: TeamSizeSelectorProps) {
  const row1 = ["Just me", "2-10 people", "11-50 people"];
  const row2 = ["51-200 people", "200+ people"];

  return (
    <div className="flex flex-col gap-[8px] w-full min-w-0">
      <label className="font-['Geist',sans-serif] text-[14px] font-medium leading-[16px] tracking-[-0.0015em] text-[#282828] select-none text-left">
        Team size
      </label>

      <div className="flex flex-col gap-[8px] w-full min-w-0">
        {/* Row 1: 3 equal pills */}
        <div className="grid grid-cols-3 gap-[8px] md:gap-[10px] w-full min-w-0">
          {row1.map((size) => {
            const isSelected = value === size;
            return (
              <button
                key={size}
                type="button"
                onClick={() => onChange(isSelected ? "" : size)}
                className={`w-full h-[36px] px-[4px] sm:px-[8px] rounded-[8px] border flex items-center justify-center transition-all cursor-pointer select-none active:scale-[0.99] ${
                  isSelected
                    ? "bg-[#F7F7F7] border-[#282828] text-[#282828] font-medium shadow-sm"
                    : "bg-white border-[#EAEAEA] text-[#757575] hover:border-[#CCCCCC] hover:text-[#282828]"
                }`}
                style={{ boxSizing: "border-box" }}
              >
                <span className="font-['Geist',sans-serif] text-[12.5px] sm:text-[13px] lg:text-[14px] leading-[18px] tracking-[-0.0015em] whitespace-nowrap">
                  {size}
                </span>
              </button>
            );
          })}
        </div>

        {/* Row 2: 2 pills */}
        <div className="flex gap-[8px] md:gap-[10px] w-full min-w-0">
          {row2.map((size) => {
            const isSelected = value === size;
            return (
              <button
                key={size}
                type="button"
                onClick={() => onChange(isSelected ? "" : size)}
                className={`h-[36px] px-[12px] sm:px-[16px] rounded-[8px] border flex items-center justify-center transition-all cursor-pointer select-none active:scale-[0.99] flex-shrink-0 ${
                  isSelected
                    ? "bg-[#F7F7F7] border-[#282828] text-[#282828] font-medium shadow-sm"
                    : "bg-white border-[#EAEAEA] text-[#757575] hover:border-[#CCCCCC] hover:text-[#282828]"
                }`}
                style={{ boxSizing: "border-box" }}
              >
                <span className="font-['Geist',sans-serif] text-[12.5px] sm:text-[13px] lg:text-[14px] leading-[18px] tracking-[-0.0015em] whitespace-nowrap">
                  {size}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
