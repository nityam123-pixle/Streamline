'use client';

import React, { useState, useEffect } from "react";
import { ToolConnectionCard } from "./ToolConnectionCard";
import {
  HubSpotIcon,
  SalesforceIcon,
  SlackBrandIcon,
  GmailBrandIcon,
  NotionBrandIcon,
  StripeBrandIcon,
} from "./ToolBrandIcons";
import { getToolsAction, updateToolsAction } from "@/actions/tools";

interface ToolsStepContentProps {
  initialData?: {
    selectedTools?: string[];
  };
  onContinue?: (data?: { selectedTools: string[] }) => void;
  isTransitioning?: boolean;
}

interface ToolItem {
  id: string;
  name: string;
  category: string;
  icon: React.ReactNode;
}

const TOOLS_DATA: ToolItem[] = [
  {
    id: "hubspot",
    name: "HubSpot",
    category: "CRM",
    icon: <HubSpotIcon className="w-[28px] h-[28px]" />,
  },
  {
    id: "salesforce",
    name: "Salesforce",
    category: "CRM",
    icon: <SalesforceIcon className="w-[30px] h-[22px]" />,
  },
  {
    id: "slack",
    name: "Slack",
    category: "Communication",
    icon: <SlackBrandIcon className="w-[26px] h-[26px]" />,
  },
  {
    id: "gmail",
    name: "Gmail",
    category: "CRM",
    icon: <GmailBrandIcon className="w-[26px] h-[20px]" />,
  },
  {
    id: "notion",
    name: "Notion",
    category: "Productivity",
    icon: <NotionBrandIcon className="w-[24px] h-[24px]" />,
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "Finance",
    icon: <StripeBrandIcon className="w-[24px] h-[24px]" />,
  },
];

export function ToolsStepContent({
  initialData,
  onContinue,
  isTransitioning,
}: ToolsStepContentProps) {
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>(
    initialData?.selectedTools || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load existing persisted tools on mount
  useEffect(() => {
    let isMounted = true;
    async function loadTools() {
      try {
        const res = await getToolsAction();
        if (
          isMounted &&
          res.success &&
          res.selectedTools &&
          res.selectedTools.length > 0
        ) {
          setSelectedToolIds((prev) =>
            prev.length === 0 ? res.selectedTools! : prev
          );
        }
      } catch {
        // Silently fallback to initial state
      }
    }
    loadTools();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleTool = (id: string) => {
    setSelectedToolIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handleContinue = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await updateToolsAction({
        selectedTools: selectedToolIds,
      });

      if (!result.success) {
        setErrorMessage(
          result.error || "Failed to save selected tools. Please try again."
        );
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);

      if (onContinue) {
        onContinue({
          selectedTools: selectedToolIds,
        });
      }
    } catch {
      setErrorMessage(
        "An unexpected error occurred while saving. Please try again."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="flex flex-col w-full items-stretch min-w-0"
      style={{
        marginTop: "clamp(24px, 5.5vh, 64px)",
      }}
    >
      {/* HEADING BLOCK: Exactly aligned with Step 3 */}
      <div className="w-full max-w-full md:max-w-[440px] flex flex-col gap-[6px] flex-shrink-0 min-w-0 text-left">
        <h1 className="font-['Geist',sans-serif] text-[24px] font-semibold leading-[30px] tracking-[-0.0015em] text-[#282828] m-0">
          Connect your tools
        </h1>
        <p className="font-['Geist',sans-serif] text-[14px] font-medium leading-[20px] tracking-[-0.0015em] text-[#757575] m-0 max-w-[440px]">
          Connect the tools you already use. You can always add more later.
        </p>
      </div>

      {/* ERROR MESSAGE IF ANY */}
      {errorMessage && (
        <div
          role="alert"
          className="w-full max-w-full md:max-w-[440px] p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-medium text-left mt-3"
        >
          {errorMessage}
        </div>
      )}

      {/* 6 TOOL CONNECTION CARDS STACK: Exactly aligned with Step 3 */}
      <div
        className="flex flex-col gap-[10px] w-full min-w-0 flex-shrink-0"
        style={{
          marginTop: "clamp(20px, 3.8vh, 39px)",
        }}
      >
        {TOOLS_DATA.map((tool) => (
          <ToolConnectionCard
            key={tool.id}
            id={tool.id}
            name={tool.name}
            category={tool.category}
            icon={tool.icon}
            connected={selectedToolIds.includes(tool.id)}
            onToggle={toggleTool}
          />
        ))}
      </div>

      {/* ACTION BUTTON: Dynamic label based on selection */}
      <button
        type="button"
        id="skip-for-now-btn"
        disabled={isTransitioning || isSubmitting}
        onClick={handleContinue}
        className="w-full max-w-full md:max-w-[440px] h-[36px] bg-[#282828] hover:bg-[#383838] border border-[#B7B7B7] rounded-[8px] px-[10px] flex items-center justify-center transition-all cursor-pointer active:scale-[0.99] flex-shrink-0 disabled:opacity-80 disabled:cursor-not-allowed"
        style={{
          marginTop: "clamp(18px, 2.6vh, 27px)",
          boxShadow: "inset 2px 2px 4px rgba(255, 255, 255, 0.20)",
          boxSizing: "border-box",
        }}
      >
        <span className="font-['Geist',sans-serif] text-[14px] font-medium leading-[16px] tracking-[-0.0015em] text-white">
          {isSubmitting
            ? "Saving..."
            : selectedToolIds.length > 0
            ? "Continue"
            : "Skip for now"}
        </span>
      </button>
    </div>
  );
}
