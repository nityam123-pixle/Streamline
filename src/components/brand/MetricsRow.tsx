import React from "react";

interface StatItem {
  value: string;
  label: string;
}

const STATS: StatItem[] = [
  { value: "12K", label: "Workflows" },
  { value: "98.7%", label: "Success rate" },
  { value: "100+", label: "Integrations" },
];

export function MetricsRow() {
  return (
    /* Pulled down separator and stats by more 12px (pt-9 = 36px) */
    <div className="pt-8 sm:pt-9 border-t border-[#E4E4E4] w-full grid grid-cols-3 gap-4">
      {STATS.map((stat, idx) => (
        <div key={idx} className="flex flex-col">
          <div className="text-[20px] font-medium text-[#282828] tracking-tight leading-[28px] mb-1">
            {stat.value}
          </div>
          <div className="text-[14px] font-medium text-[#757575] leading-[24px]">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
