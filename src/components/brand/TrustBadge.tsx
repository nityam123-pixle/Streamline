"use client";

import React from "react";
import { motion } from "framer-motion";

export function TrustBadge() {
  return (
    <div className="inline-flex items-center self-start gap-2 h-[30px] px-3 py-1.5 rounded-[8px] bg-[#FFFFFF] border border-[#E4E4E4] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* Two-layer Green Indicator with Butter-Smooth Continuous Pulse */}
      <div className="relative flex items-center justify-center w-2.5 h-2.5 flex-shrink-0">

        {/* Seamless Radar Wave: starts at opacity 0, blooms to 0.6, fades to 0 (ZERO jitter on loop) */}
        <motion.span
          className="absolute w-2.5 h-2.5 rounded-full bg-[#4DB885] pointer-events-none"
          animate={{
            scale: [1, 2.4],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 2.0,
            repeat: Infinity,
            ease: "easeOut",
            times: [0, 0.22, 1],
          }}
        />

        {/* Seamless Ambient Halo Breathing: matching start & end values for 100% continuity */}
        <motion.span
          className="absolute w-2.5 h-2.5 rounded-full bg-[#4DB885] pointer-events-none"
          animate={{
            scale: [1, 1.35, 1],
            opacity: [0.25, 0.08, 0.25],
          }}
          transition={{
            duration: 2.0,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Outer Static Dot Frame: 10px x 10px, radius 99, fill #E0FFF0 */}
        <span className="relative w-2.5 h-2.5 rounded-full bg-[#E0FFF0] flex items-center justify-center">
          {/* Inner Core Dot: 6px x 6px, radius 99, fill #4DB885 */}
          <span className="w-1.5 h-1.5 rounded-full bg-[#4DB885]" />
        </span>
      </div>

      {/* Label Text with strict #757575 color from Figma inspector */}
      <span className="text-[13px] font-medium text-[#757575] tracking-tight whitespace-nowrap leading-none">
        Trusted by 3,000+ teams worldwide
      </span>
    </div>
  );
}
