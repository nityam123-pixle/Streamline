"use client";

import React, { useState, useEffect } from "react";
import { AutomationOptionCard } from "./AutomationOptionCard";
import {
  SalesTagIcon,
  MegaphoneIcon,
  TargetIcon,
  BarChartIcon,
  UsersIcon,
  WalletIcon,
} from "./AutomationIcons";
import {
  getAutomationPreferencesAction,
  updateAutomationPreferencesAction,
} from "@/actions/automation";

interface AutomationStepContentProps {
  initialData?: {
    automationAreas?: string[];
  };
  onContinue?: (data?: { automationAreas: string[] }) => void;
  isTransitioning?: boolean;
}

interface OptionItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const AUTOMATION_OPTIONS: OptionItem[] = [
  {
    id: "sales",
    title: "Sales Automation",
    description: "Lead generation, outreach, CRM sync",
    icon: <SalesTagIcon className="w-[24px] h-[24px]" fill="#000000" />,
  },
  {
    id: "marketing",
    title: "Marketing Ops",
    description: "Campaigns, content, analytics",
    icon: <MegaphoneIcon className="w-[24px] h-[24px]" fill="#000000" />,
  },
  {
    id: "support",
    title: "Customer Support",
    description: "Ticket routing, responses, escalations",
    icon: <TargetIcon className="w-[24px] h-[24px]" fill="#000000" />,
  },
  {
    id: "data",
    title: "Data & Reporting",
    description: "Enrichment, sync, automated reports",
    icon: <BarChartIcon className="w-[24px] h-[24px]" fill="#000000" />,
  },
  {
    id: "hr",
    title: "HR & Recruiting",
    description: "Candidate tracking, onboarding, comms",
    icon: <UsersIcon className="w-[24px] h-[24px]" fill="#000000" />,
  },
  {
    id: "finance",
    title: "Finance & Billing",
    description: "Invoices, payments, reconciliation",
    icon: <WalletIcon className="w-[24px] h-[24px]" fill="#000000" />,
  },
];

export function AutomationStepContent({
  initialData,
  onContinue,
  isTransitioning,
}: AutomationStepContentProps) {
  // Support multi-selection
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialData?.automationAreas || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load existing persisted preferences on mount
  useEffect(() => {
    let isMounted = true;
    async function loadPreferences() {
      try {
        const res = await getAutomationPreferencesAction();
        if (isMounted && res.success && res.automationAreas && res.automationAreas.length > 0) {
          setSelectedIds((prev) => (prev.length === 0 ? res.automationAreas! : prev));
        }
      } catch {
        // Silently fallback to initial state
      }
    }
    loadPreferences();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleOption = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handleContinue = async () => {
    setErrorMessage(null);

    if (selectedIds.length === 0) {
      setErrorMessage("Please select at least one automation area");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateAutomationPreferencesAction({
        automationAreas: selectedIds,
      });

      if (!result.success) {
        setErrorMessage(
          result.error || "Failed to save automation preferences. Please try again."
        );
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);

      if (onContinue) {
        onContinue({
          automationAreas: selectedIds,
        });
      }
    } catch {
      setErrorMessage("An unexpected error occurred while saving. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="flex flex-col w-full items-stretch min-w-0"
      style={{
        marginTop: "clamp(24px, 5.5vh, 64px)",
        gap: "clamp(12px, 1.8vh, 18px)",
      }}
    >
      {/* HEADING BLOCK */}
      <div className="w-full max-w-full md:max-w-[440px] flex flex-col gap-[6px] flex-shrink-0 min-w-0 text-left">
        <h1 className="font-['Geist',sans-serif] text-[24px] font-semibold leading-[30px] tracking-[-0.0015em] text-[#282828] m-0">
          What will you automate?
        </h1>
        <p className="font-['Geist',sans-serif] text-[14px] font-medium leading-[20px] tracking-[-0.0015em] text-[#757575] m-0 max-w-[440px]">
          Pick one or more areas — we’ll recommend the best templates
          <br className="hidden sm:inline" /> and integrations
        </p>
      </div>

      {/* ERROR MESSAGE IF ANY */}
      {errorMessage && (
        <div
          role="alert"
          className="w-full max-w-full md:max-w-[440px] p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-medium text-left"
        >
          {errorMessage}
        </div>
      )}

      {/* 6 AUTOMATION OPTION CARDS STACK */}
      <div className="flex flex-col gap-[10px] w-full min-w-0 flex-shrink-0">
        {AUTOMATION_OPTIONS.map((option) => (
          <AutomationOptionCard
            key={option.id}
            id={option.id}
            title={option.title}
            description={option.description}
            icon={option.icon}
            selected={selectedIds.includes(option.id)}
            onClick={() => toggleOption(option.id)}
          />
        ))}
      </div>

      {/* LOOKS GOOD BUTTON */}
      <button
        type="button"
        id="looks-good-continue-btn"
        disabled={isTransitioning || isSubmitting}
        onClick={handleContinue}
        className="w-full max-w-full md:max-w-[440px] h-[36px] bg-[#282828] hover:bg-[#383838] border border-[#B7B7B7] rounded-[8px] px-[10px] flex items-center justify-center transition-all cursor-pointer active:scale-[0.99] flex-shrink-0 mt-[8px] disabled:opacity-80 disabled:cursor-not-allowed"
        style={{
          boxShadow: "inset 2px 2px 4px rgba(255, 255, 255, 0.20)",
          boxSizing: "border-box",
        }}
      >
        <span className="font-['Geist',sans-serif] text-[14px] font-medium leading-[16px] tracking-[-0.0015em] text-white">
          {isSubmitting ? "Saving..." : "Looks good"}
        </span>
      </button>
    </div>
  );
}
