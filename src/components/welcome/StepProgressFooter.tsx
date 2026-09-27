"use client";

import React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

interface StepProgressFooterProps {
  currentStep?: number;
  totalSteps?: number;
  direction?: number;
}

export function StepProgressFooter({
  currentStep = 1,
  totalSteps = 6,
  direction = 1,
}: StepProgressFooterProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      className="w-full max-w-full md:max-w-[440px] min-w-0 h-[22px] flex items-center justify-between flex-shrink-0"
      style={{ boxSizing: "border-box" }}
    >
      {/* Progress track with animated active pill: width 84px, height 22px */}
      <div className="w-[84px] h-[22px] flex items-center gap-[6px] flex-shrink-0">
        {Array.from({ length: totalSteps }).map((_, idx) => {
          const stepNum = idx + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;

          if (isActive) {
            return (
              <motion.div
                key="active-slot"
                layoutId="activeStepPill"
                className="w-[24px] h-[6px] bg-[#282828] rounded-full flex-shrink-0"
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
                }
              />
            );
          }

          return (
            <motion.div
              key={idx}
              className="w-[6px] h-[6px] rounded-full flex-shrink-0"
              animate={{
                backgroundColor: isCompleted ? "#A1A1A1" : "#E5E5E5",
              }}
              transition={{ duration: 0.25 }}
            />
          );
        })}
      </div>

      {/* Step label with subtle micro-slide transition: "Step X of Y" */}
      <div className="relative h-[16px] overflow-hidden flex items-center justify-end">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={currentStep}
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: direction > 0 ? 4 : -4 }
            }
            animate={{ opacity: 1, y: 0 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: direction > 0 ? -4 : 4 }
            }
            transition={{
              duration: 0.2,
              ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
            }}
            className="font-['Geist',sans-serif] text-[14px] font-medium leading-[16px] tracking-[-0.0015em] text-[#757575] text-right whitespace-nowrap block"
          >
            Step {currentStep} of {totalSteps}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}
