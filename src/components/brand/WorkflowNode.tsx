import React from "react";

export type NodeType = "webhook" | "ai" | "filter" | "email";

interface WorkflowNodeProps {
  type: NodeType;
  label: string;
}

const NODE_CONFIG: Record<
  NodeType,
  {
    bg: string;
    border: string;
    shadow: string;
    iconBg: string;
  }
> = {
  webhook: {
    bg: "bg-[#EBF5FF]",
    border: "border-[#70B6FF]",
    shadow: "inset 0 1px 1px rgba(255, 255, 255, 0.7), inset 0 -1px 2px rgba(50, 143, 251, 0.15)",
    iconBg: "bg-[#328FFB]",
  },
  ai: {
    bg: "bg-[#EDE9FE]",
    border: "border-[#C4B5FD]",
    shadow: "inset 0 1px 1px rgba(255, 255, 255, 0.7), inset 0 -1px 2px rgba(139, 92, 246, 0.15)",
    iconBg: "bg-[#8B5CF6]",
  },
  filter: {
    bg: "bg-[#FFF0E5]",
    border: "border-[#FDBA74]",
    shadow: "inset 0 1px 1px rgba(255, 255, 255, 0.7), inset 0 -1px 2px rgba(249, 115, 22, 0.15)",
    iconBg: "bg-[#F97316]",
  },
  email: {
    bg: "bg-[#E0FFF0]",
    border: "border-[#4DB885]",
    shadow: "inset 0 1px 1px rgba(255, 255, 255, 0.7), inset 0 -1px 2px rgba(77, 184, 133, 0.2)",
    iconBg: "bg-[#4DB885]",
  },
};

export function WorkflowNode({ type, label }: WorkflowNodeProps) {
  const config = NODE_CONFIG[type];

  return (
    <div
      className={`h-8 px-2 sm:px-2.5 rounded-[8px] border-[0.5px] ${config.bg} ${config.border} flex items-center gap-1.5 text-[11.5px] sm:text-xs font-medium text-[#282828] flex-shrink-0 cursor-default transition-transform hover:-translate-y-0.5`}
      style={{ boxShadow: config.shadow }}
    >
      <div
        className={`w-2 h-2 rounded-[2px] ${config.iconBg} flex-shrink-0`}
        style={{
          boxShadow: "inset 0 1px 1px rgba(255,255,255,0.45), inset 0 -1px 1px rgba(0,0,0,0.3)",
        }}
      />
      <span className="whitespace-nowrap">{label}</span>
    </div>
  );
}

export function WorkflowConnector() {
  return (
    <div className="flex items-center flex-shrink-0 px-0.5">
      <svg width="12" height="6" viewBox="0 0 12 6" fill="none">
        <line x1="2" y1="3" x2="10" y2="3" stroke="#A1A1AA" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="2" cy="3" r="1.6" fill="#A1A1AA" />
        <circle cx="10" cy="3" r="1.6" fill="#A1A1AA" />
      </svg>
    </div>
  );
}
