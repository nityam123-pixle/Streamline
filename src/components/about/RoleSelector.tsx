"use client";

import React from "react";

const ROLES = [
  ["Founder / CEO", "Product Manager"],
  ["Marketing Manager", "Sales Manager"],
  ["Developer / Engineer", "Operations Manager"],
  ["Customer Success", "Other"],
];

interface RoleSelectorProps {
  value: string;
  onChange: (role: string) => void;
}

export function RoleSelector({ value, onChange }: RoleSelectorProps) {
  return (
    <div className="flex flex-col gap-[8px] w-full min-w-0">
      <label className="font-['Geist',sans-serif] text-[14px] font-medium leading-[16px] tracking-[-0.0015em] text-[#282828] select-none text-left">
        Your role
      </label>

      <div className="flex flex-col gap-[8px] w-full min-w-0">
        {ROLES.map((row, rowIdx) => (
          <div key={rowIdx} className="grid grid-cols-2 gap-[8px] md:gap-[10px] w-full min-w-0">
            {row.map((role) => {
              const isSelected = value === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => onChange(isSelected ? "" : role)}
                  className={`w-full h-[36px] px-[8px] lg:px-[12px] rounded-[8px] border text-left flex items-center justify-start transition-all cursor-pointer select-none active:scale-[0.99] ${
                    isSelected
                      ? "bg-[#F7F7F7] border-[#282828] text-[#282828] font-medium shadow-sm"
                      : "bg-white border-[#EAEAEA] text-[#757575] hover:border-[#CCCCCC] hover:text-[#282828]"
                  }`}
                  style={{ boxSizing: "border-box" }}
                >
                  <span className="font-['Geist',sans-serif] text-[13px] lg:text-[14px] leading-[18px] tracking-[-0.0015em] truncate">
                    {role}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
