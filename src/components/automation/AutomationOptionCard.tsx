"use client";

import React from "react";

export interface AutomationOptionCardProps {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
}

export function AutomationOptionCard({
  id,
  title,
  description,
  icon,
  selected = false,
  onClick,
}: AutomationOptionCardProps) {
  return (
    <button
      type="button"
      id={`automation-card-${id}`}
      role="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`w-full max-w-full md:max-w-[440px] h-[80px] rounded-[8px] border transition-all text-left flex items-center flex-shrink-0 cursor-pointer select-none active:scale-[0.99] px-[16px] sm:px-[24px] ${
        selected
          ? "bg-[#F5F5F5] border-[#282828] shadow-sm"
          : "bg-[#F0F0F0] border-[#EAEAEA] hover:border-[#CCCCCC] hover:bg-[#EBEBEB]"
      }`}
      style={{
        boxSizing: "border-box",
      }}
    >
      {/* Icon: 24-28px, solid black, vertically centered */}
      <div className="w-[28px] h-[28px] flex items-center justify-center flex-shrink-0 mr-[12px] sm:mr-[18px]">
        {icon}
      </div>

      {/* Text block: Title + Description */}
      <div className="flex flex-col justify-center min-w-0 flex-1">
        <span className="font-['Geist',sans-serif] text-[14px] font-medium leading-[18px] tracking-[-0.0015em] text-[#282828] truncate block">
          {title}
        </span>
        <span className="font-['Geist',sans-serif] text-[14px] font-medium leading-[18px] tracking-[-0.0015em] text-[#757575] truncate block mt-[2px]">
          {description}
        </span>
      </div>
    </button>
  );
}
