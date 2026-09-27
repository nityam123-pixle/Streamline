import React from "react";
import { WorkflowIcon } from "@/components/icons";
import { WorkflowNode, WorkflowConnector } from "./WorkflowNode";

export function WorkflowCard() {
  return (
    <div
      className="rounded-[16px] bg-[#F0F0F0] border-[0.5px] border-[#E4E4E4] px-3.5 sm:px-4 py-4 sm:py-5 shadow-[inset_0_0_0_0.5px_#E4E4E4]"
      style={{
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3.5">
        <div className="w-7 h-7 rounded-[8px] bg-[#282828] flex items-center justify-center text-white flex-shrink-0 shadow-sm">
          <WorkflowIcon className="w-4 h-4" fill="#FFFFFF" />
        </div>
        <span className="text-[13.5px] font-semibold text-[#282828] tracking-tight">
          Example workflow
        </span>
      </div>

      {/* Connected Workflow Flow with breathing room */}
      <div className="flex items-center justify-between gap-0.5 overflow-x-auto py-0.5 scrollbar-none">
        <WorkflowNode type="webhook" label="Webhook" />
        <WorkflowConnector />
        <WorkflowNode type="ai" label="AI Model" />
        <WorkflowConnector />
        <WorkflowNode type="filter" label="Filter" />
        <WorkflowConnector />
        <WorkflowNode type="email" label="Send Email" />
      </div>
    </div>
  );
}
