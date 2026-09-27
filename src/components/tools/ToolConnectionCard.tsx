'use client';

import React, { useState } from "react";

export interface ToolConnectionCardProps {
  id: string;
  name: string;
  category: string;
  icon: React.ReactNode;
  connected?: boolean;
  onToggle?: (id: string) => void;
  initialConnected?: boolean;
}

export function ToolConnectionCard({
  id,
  name,
  category,
  icon,
  connected: controlledConnected,
  onToggle,
  initialConnected = false,
}: ToolConnectionCardProps) {
  const [internalConnected, setInternalConnected] = useState(initialConnected);
  const isConnected =
    controlledConnected !== undefined ? controlledConnected : internalConnected;

  const handleClick = () => {
    if (onToggle) {
      onToggle(id);
    } else {
      setInternalConnected(!internalConnected);
    }
  };

  return (
    <div
      id={`tool-card-${id}`}
      className="w-full max-w-full md:max-w-[440px] h-[80px] bg-[#F0F0F0] border border-[#EAEAEA] rounded-[8px] flex items-center justify-between flex-shrink-0 select-none px-[16px] sm:px-[22px] transition-all hover:border-[#DCDCDC] min-w-0"
      style={{ boxSizing: "border-box" }}
    >
      {/* LEFT & CENTER: Brand Icon + Title & Category */}
      <div className="flex items-center min-w-0 flex-1 mr-[12px] sm:mr-[16px]">
        {/* Brand Icon: vertically centered in 32x32 container */}
        <div className="w-[32px] h-[32px] flex items-center justify-center flex-shrink-0 mr-[12px] sm:mr-[16px]">
          {icon}
        </div>

        {/* Text Stack */}
        <div className="flex flex-col justify-center min-w-0 flex-1">
          <span className="font-['Geist',sans-serif] text-[14px] font-medium leading-[18px] tracking-[-0.0015em] text-[#282828] truncate block">
            {name}
          </span>
          <span className="font-['Geist',sans-serif] text-[14px] font-normal leading-[18px] tracking-[-0.0015em] text-[#757575] truncate block mt-[2px]">
            {category}
          </span>
        </div>
      </div>

      {/* RIGHT: Connect Button */}
      <button
        type="button"
        id={`connect-btn-${id}`}
        aria-pressed={isConnected}
        onClick={handleClick}
        className={`w-[74px] h-[32px] rounded-[8px] flex items-center justify-center flex-shrink-0 cursor-pointer transition-all active:scale-[0.98] ${
          isConnected
            ? "bg-[#EAEAEA] hover:bg-[#E0E0E0] border border-[#D5D5D5]"
            : "bg-[#282828] hover:bg-[#383838] border border-[#383838]"
        }`}
        style={{
          boxSizing: "border-box",
          boxShadow: isConnected
            ? "none"
            : "inset 1px 1px 2px rgba(255, 255, 255, 0.15)",
        }}
      >
        <span
          className={`font-['Geist',sans-serif] text-[12px] font-medium leading-[16px] tracking-[-0.0015em] ${
            isConnected ? "text-[#282828]" : "text-white"
          }`}
        >
          {isConnected ? "Connected" : "Connect"}
        </span>
      </button>
    </div>
  );
}
