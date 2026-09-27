"use client";

import React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useOnboardingTransition } from "@/context/OnboardingTransitionContext";
import { StepProgressFooter } from "@/components/welcome/StepProgressFooter";

export function OnboardingShell() {
  const {
    currentStep,
    direction,
    isTransitioning,
    totalSteps,
    goNext,
  } = useOnboardingTransition();

  const shouldReduceMotion = useReducedMotion();
  const isLaunch = currentStep.id === "launch";

  // Left Content Motion Variants
  const leftVariants = {
    enter: (dir: number) => ({
      x: shouldReduceMotion ? 0 : dir * 32,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: shouldReduceMotion ? 0 : dir * -32,
      opacity: 0,
    }),
  };

  // Right Visual Motion Variants (subtle opacity + scale + directional movement)
  const rightVariants = {
    enter: (dir: number) => ({
      x: shouldReduceMotion ? 0 : dir * 16,
      scale: shouldReduceMotion ? 1 : 1.015,
      opacity: 0,
    }),
    center: {
      x: 0,
      scale: 1,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: shouldReduceMotion ? 0 : dir * -16,
      scale: shouldReduceMotion ? 1 : 0.985,
      opacity: 0,
    }),
  };

  const leftTransition = {
    duration: shouldReduceMotion ? 0.15 : 0.4,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  };

  const rightTransition = {
    duration: shouldReduceMotion ? 0.15 : 0.42,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  };

  const handleContinue = (data?: any) => {
    goNext();
  };

  return (
    <main
      className={`w-full min-h-[100dvh] md:h-[100dvh] overflow-y-auto md:overflow-hidden flex flex-col md:grid md:grid-cols-2 ${
        isLaunch ? "bg-[#F7F7F7]" : "bg-[#FAFAFA]"
      } selection:bg-[#282828] selection:text-white`}
    >
      {/* ================= LEFT PANEL ================= */}
      {/* 100% on mobile, 50% on tablet & desktop */}
      <div
        className={`w-full min-h-[100dvh] md:min-h-0 md:h-full ${
          isLaunch ? "bg-[#F7F7F7]" : "bg-[#FAFAFA]"
        } border-b md:border-b-0 md:border-r border-[#EAEAEA] relative flex flex-col justify-between items-center overflow-x-hidden overflow-y-auto md:overflow-y-hidden flex-shrink-0 transition-colors duration-200`}
        style={{
          boxShadow: "2px 0 4px 0 rgba(255, 255, 255, 1)",
          boxSizing: "border-box",
          paddingTop: "clamp(24px, 5vh, 52px)",
          paddingBottom: "clamp(20px, 4vh, 48px)",
          paddingInline: "clamp(20px, 4vw, 64px)",
        }}
      >
        {/* INNER CONTAINER: max 440px on desktop/tablet, 100% on mobile */}
        <div
          className="w-full max-w-full md:max-w-[440px] flex-1 flex flex-col justify-between items-stretch min-w-0"
          style={{ boxSizing: "border-box" }}
        >
          {/* TOP AREA */}
          <div className="w-full flex flex-col min-h-0 items-stretch min-w-0">
            {/* STREAMLINE LOGO - ALWAYS MOUNTED AND STABLE */}
            <div className="w-[124px] h-[32px] flex-shrink-0 self-start">
              <img
                src="/icons/streamline-logo.svg"
                alt="Streamline"
                width={124}
                height={32}
                className="w-[124px] h-[32px] block select-none"
              />
            </div>

            {/* STEP CONTENT SLOT WITH ANIMATEPRESENCE */}
            <div className="w-full min-w-0 relative">
              <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                <motion.div
                  key={currentStep.id}
                  custom={direction}
                  variants={leftVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={leftTransition}
                  className="w-full min-w-0"
                >
                  {currentStep.renderLeftContent({
                    onContinue: handleContinue,
                    isTransitioning,
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* PERSISTENT PROGRESS FOOTER */}
          <div className="w-full max-w-full md:max-w-[440px] flex-shrink-0 mt-auto pt-6 pb-1">
            <StepProgressFooter
              currentStep={currentStep.index}
              totalSteps={totalSteps}
              direction={direction}
            />
          </div>
        </div>
      </div>

      {/* ================= RIGHT PANEL ================= */}
      {/* Hidden on mobile (< 768px), visible on tablet & desktop (>= 768px) */}
      <div
        className={`hidden md:flex w-full h-full min-h-0 ${
          isLaunch ? "bg-[#FAFAFA]" : "bg-[#F7F7F7]"
        } relative items-center justify-center overflow-hidden flex-shrink-0 transition-colors duration-200`}
      >
        {/* 26px DOT GRID - PERSISTENT, NEVER UNMOUNTS, NEVER BLINKS */}
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

        {/* STEP VISUAL SLOT WITH ANIMATEPRESENCE */}
        <div className="w-full h-full relative z-10 flex items-center justify-center min-w-0 min-h-0">
          <AnimatePresence mode="popLayout" custom={direction} initial={false}>
            <motion.div
              key={currentStep.id}
              custom={direction}
              variants={rightVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={rightTransition}
              className="w-full h-full flex items-center justify-center min-w-0 min-h-0"
            >
              {currentStep.renderRightVisual()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
