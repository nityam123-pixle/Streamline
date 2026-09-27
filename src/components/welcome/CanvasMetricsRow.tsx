import React from "react";

interface MetricCardProps {
  indicatorColor: string;
  value: string;
  label: string;
}

function MetricCard({ indicatorColor, value, label }: MetricCardProps) {
  return (
    <div
      className="w-[148px] h-[60px] bg-white border border-[#EAEAEA] rounded-[8px] p-[12px] flex flex-col justify-between flex-shrink-0"
      style={{
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.04)",
        boxSizing: "border-box",
      }}
    >
      {/* Top row: Indicator + Value */}
      <div className="flex items-center gap-[6px]">
        {/* Indicator: 12 × 12 px, radius 4px, inset shadow */}
        <div
          className="w-[12px] h-[12px] rounded-[4px] flex-shrink-0"
          style={{
            backgroundColor: indicatorColor,
            boxShadow: "inset 0 2px 2px rgba(255, 255, 255, 0.4)",
          }}
        />
        <span className="font-['Geist',sans-serif] text-[12px] font-medium leading-[16px] tracking-[-0.0015em] text-[#282828]">
          {value}
        </span>
      </div>

      {/* Bottom Label */}
      <span className="font-['Geist',sans-serif] text-[12px] font-medium leading-[16px] tracking-[-0.0015em] text-[#757575] truncate">
        {label}
      </span>
    </div>
  );
}

export function CanvasMetricsRow() {
  return (
    <div
      className="w-[468px] h-[60px] flex gap-[12px] flex-shrink-0"
      style={{ boxSizing: "border-box" }}
    >
      <MetricCard
        indicatorColor="#7F6EFF"
        value="12.4k"
        label="Total Generations"
      />
      <MetricCard
        indicatorColor="#4CBD61"
        value="98.7%"
        label="Success Rate"
      />
      <MetricCard
        indicatorColor="#4CD9DE"
        value="$42.80"
        label="AI Cost"
      />
    </div>
  );
}
