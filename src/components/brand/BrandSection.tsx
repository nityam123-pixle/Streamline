import React from "react";
import { BrandLogo } from "./BrandLogo";
import { TrustBadge } from "./TrustBadge";
import { FeatureBulletList } from "./FeatureBulletList";
import { WorkflowCard } from "./WorkflowCard";
import { MetricsRow } from "./MetricsRow";

export function BrandSection() {
  return (
    /* Logo positioned WAY UP near top with pt-14 sm:pt-16; stats positioned at bottom, pulled down */
    <div className="w-full min-h-screen bg-[#F7F7F7] flex flex-col justify-between items-center pt-12 sm:pt-16 pb-8 sm:pb-10 px-6 sm:px-10 lg:px-16 border-b lg:border-b-0 lg:border-r border-[#EAEAEA]">
      <div className="w-full max-w-[440px] flex flex-col justify-between flex-1">
        
        {/* Frame 29 Top: Brand Logo (Positioned high up at top) */}
        <div className="mb-8 sm:mb-12">
          <BrandLogo />
        </div>

        {/* Frame 28: Value Proposition Core Stack */}
        <div className="my-auto py-4">
          
          {/* Frame 5: Trust Badge Pill */}
          <div className="mb-6">
            <TrustBadge />
          </div>

          {/* Frame 27: Content & Workflow */}
          <div>
            {/* Headline with Brand #282828 */}
            <h1 className="text-[34px] sm:text-[37px] font-bold text-[#282828] tracking-[-0.035em] leading-[1.16] mb-3.5">
              Automate smarter.<br />
              Scale faster.
            </h1>

            {/* Subtext with Brand #757575 / #6A6A6A */}
            <p className="text-[14px] text-[#757575] leading-[1.6] mb-6 font-normal max-w-[400px]">
              Build powerful AI automation workflows that connect your entire stack — no code required.
            </p>

            {/* Feature Bullets */}
            <div className="mb-8">
              <FeatureBulletList />
            </div>

            {/* Example Workflow Card (Background #F0F0F0, border 0.5px #E4E4E4 inside) */}
            <WorkflowCard />
          </div>

        </div>

        {/* Frame 33 Bottom: Metrics Row (Pulled down by more 12px) */}
        <div className="mt-8 sm:mt-10 pt-2">
          <MetricsRow />
        </div>

      </div>
    </div>
  );
}
