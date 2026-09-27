import React from "react";

interface FeatureStepCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

export function FeatureStepCard({ icon, title, subtitle }: FeatureStepCardProps) {
  return (
    <div
      className="w-full max-w-full md:max-w-[398px] min-w-0 h-[80px] bg-[#F0F0F0] border border-[#E4E4E4] rounded-[8px] px-4 md:px-5 py-4 flex items-center gap-[14px] md:gap-[16px] flex-shrink-0"
      style={{ boxSizing: "border-box" }}
    >
      {/* Icon container: 40 × 40, bg #FFFFFF, radius 8px, padding 10px, inside 20 × 20 */}
      <div
        className="w-[40px] h-[40px] bg-white rounded-[8px] p-[10px] flex items-center justify-center flex-shrink-0"
        style={{ boxSizing: "border-box" }}
      >
        <div className="w-[20px] h-[20px] flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
      </div>

      {/* Text column: gap 4px */}
      <div className="flex flex-col gap-[4px] justify-center min-w-0 flex-1">
        <span className="font-['Geist',sans-serif] text-[14px] font-medium leading-[18px] tracking-[-0.0015em] text-[#282828] truncate">
          {title}
        </span>
        <span className="font-['Geist',sans-serif] text-[13px] md:text-[14px] font-medium leading-[18px] tracking-[-0.0015em] text-[#757575] truncate">
          {subtitle}
        </span>
      </div>
    </div>
  );
}
