"use client";

import React from "react";
import { WelcomeStepVisual } from "./WelcomeStepVisual";

export function WelcomeRightCanvas() {
  return (
    <div
      className="w-full h-full min-h-0 bg-[#F7F7F7] relative flex items-center justify-center overflow-hidden flex-shrink-0"
      style={{ boxSizing: "border-box" }}
    >
      {/* 26px DOT GRID */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, #D9D9D9 0 2px, transparent 2.5px)",
          backgroundSize: "26px 26px",
          backgroundPosition: "0 0",
          opacity: 0.55,
        }}
      />

      <WelcomeStepVisual />
    </div>
  );
}
