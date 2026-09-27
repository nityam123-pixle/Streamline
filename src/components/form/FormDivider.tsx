import React from "react";

export function FormDivider() {
  return (
    <div className="relative flex items-center justify-center my-6">
      <div className="border-t border-[#E2E8F0] w-full" />
      <span className="bg-white px-3 text-xs text-[#94A3B8] font-normal absolute">
        Or
      </span>
    </div>
  );
}
