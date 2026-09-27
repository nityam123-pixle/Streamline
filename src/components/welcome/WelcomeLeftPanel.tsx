"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { WelcomeStepContent } from "./WelcomeStepContent";
import { StepProgressFooter } from "./StepProgressFooter";

interface WelcomeLeftPanelProps {
  onContinue?: () => void;
}

export function WelcomeLeftPanel({ onContinue }: WelcomeLeftPanelProps) {
  const router = useRouter();
  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    } else {
      router.push("/about");
    }
  };

  return (
    <div
      className="w-full min-h-[100dvh] md:min-h-0 md:h-full bg-[#F7F7F7] border-b md:border-b-0 md:border-r border-[#EAEAEA] relative flex flex-col justify-between items-center overflow-x-hidden flex-shrink-0"
      style={{
        boxShadow: "2px 0 4px 0 rgba(255, 255, 255, 1)",
        boxSizing: "border-box",
        paddingTop: "clamp(24px, 5vh, 52px)",
        paddingBottom: "clamp(24px, 4vh, 48px)",
        paddingInline: "clamp(20px, 4vw, 64px)",
      }}
    >
      {/* LEFT CONTENT CONTAINER: max 440px on desktop/tablet, 100% on mobile */}
      <div
        className="w-full max-w-full md:max-w-[440px] flex-1 flex flex-col justify-between items-stretch min-w-0"
        style={{ boxSizing: "border-box" }}
      >
        {/* TOP CONTENT AREA */}
        <div className="w-full flex flex-col min-h-0 items-stretch min-w-0">
          {/* STREAMLINE LOGO: width: 124px, height: 32px */}
          <div className="w-[124px] h-[32px] flex-shrink-0 self-start">
            <img
              src="/icons/streamline-logo.svg"
              alt="Streamline"
              width={124}
              height={32}
              className="w-[124px] h-[32px] block select-none"
            />
          </div>

          <WelcomeStepContent onContinue={handleContinue} />
        </div>

        {/* LEFT FOOTER / PROGRESS */}
        <div className="w-full max-w-full md:max-w-[440px] flex-shrink-0 mt-auto pt-6 pb-1">
          <StepProgressFooter currentStep={1} totalSteps={6} />
        </div>
      </div>
    </div>
  );
}
