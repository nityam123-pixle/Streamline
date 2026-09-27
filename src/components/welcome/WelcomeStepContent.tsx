"use client";

import React from "react";
import { FeatureStepCard } from "./FeatureStepCard";
import { WorkflowIcon, SparkleAiIcon, TrackIcon } from "./icons";

interface WelcomeStepContentProps {
  onContinue?: () => void;
  isTransitioning?: boolean;
}

export function WelcomeStepContent({ onContinue, isTransitioning }: WelcomeStepContentProps) {
  return (
    <div
      className="flex flex-col w-full items-stretch min-w-0"
      style={{
        marginTop: "clamp(32px, 9vh, 124px)",
        gap: "clamp(20px, 3.8vh, 44px)",
      }}
    >
      {/* WELCOME HEADING BLOCK */}
      <div
        className="w-full max-w-full md:max-w-[373px] flex flex-col gap-[12px] flex-shrink-0 min-w-0"
        style={{ boxSizing: "border-box" }}
      >
        <h1 className="w-full max-w-full md:max-w-[268px] font-['Geist',sans-serif] text-[24px] font-semibold leading-[32px] tracking-[-0.0015em] text-[#282828] text-left m-0">
          Welcome to Streamline
        </h1>
        <p className="w-full max-w-full md:max-w-[373px] font-['Geist',sans-serif] text-[14px] font-medium leading-[16px] tracking-[-0.0015em] text-[#757575] m-0">
          The AI-Powered automation platform that runs your workflow, so you don’t have to.
        </p>
      </div>

      {/* FEATURE SECTION: 3 feature cards + setup prompt + continue CTA */}
      <div
        className="w-full max-w-full md:max-w-[398px] flex flex-col flex-shrink-0 items-stretch min-w-0"
        style={{
          gap: "clamp(12px, 2.2vh, 24px)",
          boxSizing: "border-box",
        }}
      >
        {/* CARD 1: Automate */}
        <FeatureStepCard
          icon={<WorkflowIcon className="w-[20px] h-[20px] text-[#282828]" fill="#282828" />}
          title="Automate"
          subtitle="Workflows in minutes"
        />

        {/* CARD 2: Use AI */}
        <FeatureStepCard
          icon={<SparkleAiIcon className="w-[20px] h-[20px] text-[#282828]" fill="#282828" />}
          title="Use AI"
          subtitle="GPT-5.6, Claude and more"
        />

        {/* CARD 3: Track */}
        <FeatureStepCard
          icon={<TrackIcon className="w-[20px] h-[20px] text-[#282828]" fill="#282828" />}
          title="Track"
          subtitle="Runs, costs & insights"
        />

        {/* SETUP TEXT */}
        <div className="w-full font-['Geist',sans-serif] text-[14px] font-medium leading-[16px] tracking-[-0.0015em] text-[#757575] text-center flex-shrink-0 mt-1">
          Setup takes about 3 minutes. Let’s go!
        </div>

        {/* CONTINUE BUTTON */}
        <button
          type="button"
          disabled={isTransitioning}
          onClick={onContinue}
          className="w-full h-[36px] bg-[#2C2D2C] hover:bg-[#383838] border border-[#B7B7B7] rounded-[8px] px-[10px] flex items-center justify-center transition-all cursor-pointer active:scale-[0.99] flex-shrink-0 disabled:opacity-80 disabled:cursor-not-allowed"
          style={{
            boxShadow: "inset 2px 2px 4px rgba(255, 255, 255, 0.20)",
            boxSizing: "border-box",
          }}
        >
          <span className="font-['Geist',sans-serif] text-[14px] font-medium leading-[16px] tracking-[-0.0015em] text-white">
            Continue
          </span>
        </button>
      </div>
    </div>
  );
}
