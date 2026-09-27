import React from "react";

interface IntegrationNodeProps {
  icon: React.ReactNode;
  label?: string;
  className?: string;
}

export function IntegrationNode({ icon, label, className = "" }: IntegrationNodeProps) {
  return (
    <div
      className={`w-[60px] h-[60px] rounded-[10px] bg-white border border-[#EAEAEA] flex items-center justify-center flex-shrink-0 select-none ${className}`}
      style={{
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.04)",
        boxSizing: "border-box",
      }}
      title={label}
    >
      <div className="w-[28px] h-[28px] flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
    </div>
  );
}
