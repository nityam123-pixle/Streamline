"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  OnboardingStep,
  ONBOARDING_STEPS,
  getStepByPath,
  getStepByIndex,
  TOTAL_ONBOARDING_STEPS,
} from "@/config/onboardingSteps";

interface OnboardingTransitionContextValue {
  currentStep: OnboardingStep;
  direction: number;
  isTransitioning: boolean;
  totalSteps: number;
  goToStep: (target: string | number) => void;
  goNext: () => void;
  goBack: () => void;
}

const OnboardingTransitionContext = createContext<
  OnboardingTransitionContextValue | undefined
>(undefined);

export function OnboardingProvider({
  children,
  initialPath,
}: {
  children: React.ReactNode;
  initialPath?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Determine initial step
  const startingStep = getStepByPath(initialPath || pathname || "/welcome");
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(startingStep);
  const [direction, setDirection] = useState<number>(1);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentStepRef = useRef<OnboardingStep>(currentStep);
  const isTransitioningRef = useRef<boolean>(isTransitioning);

  // Keep refs in sync with state
  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  useEffect(() => {
    isTransitioningRef.current = isTransitioning;
  }, [isTransitioning]);

  // Clean up timer ONLY on provider unmount
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  const triggerTransition = useCallback((targetStep: OnboardingStep, dir: number) => {
    setDirection(dir);
    setIsTransitioning(true);
    setCurrentStep(targetStep);

    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }

    transitionTimerRef.current = setTimeout(() => {
      setIsTransitioning(false);
      transitionTimerRef.current = null;
    }, 450);
  }, []);

  // Sync state if pathname changes externally (e.g. Next.js router or direct navigation)
  useEffect(() => {
    const stepFromPath = getStepByPath(pathname || "/welcome");
    if (stepFromPath.id !== currentStepRef.current.id && !isTransitioningRef.current) {
      const dir = stepFromPath.index > currentStepRef.current.index ? 1 : -1;
      triggerTransition(stepFromPath, dir);
    }
  }, [pathname, triggerTransition]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const targetStep = getStepByPath(path);
      if (targetStep.id !== currentStepRef.current.id) {
        const dir = targetStep.index > currentStepRef.current.index ? 1 : -1;
        triggerTransition(targetStep, dir);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [triggerTransition]);

  const goToStep = useCallback(
    (target: string | number) => {
      if (isTransitioningRef.current) return;

      let targetStep: OnboardingStep | undefined;
      if (typeof target === "number") {
        targetStep = getStepByIndex(target);
      } else {
        targetStep = getStepByPath(target);
      }

      if (!targetStep || targetStep.id === currentStepRef.current.id) return;

      const dir = targetStep.index > currentStepRef.current.index ? 1 : -1;
      triggerTransition(targetStep, dir);

      // Update URL and sync with router without full page reload
      try {
        window.history.pushState(null, "", targetStep.path);
        router.replace(targetStep.path, { scroll: false });
      } catch (err) {
        router.push(targetStep.path, { scroll: false });
      }
    },
    [router, triggerTransition]
  );

  const goNext = useCallback(() => {
    goToStep(currentStepRef.current.index + 1);
  }, [goToStep]);

  const goBack = useCallback(() => {
    goToStep(currentStepRef.current.index - 1);
  }, [goToStep]);

  return (
    <OnboardingTransitionContext.Provider
      value={{
        currentStep,
        direction,
        isTransitioning,
        totalSteps: TOTAL_ONBOARDING_STEPS,
        goToStep,
        goNext,
        goBack,
      }}
    >
      {children}
    </OnboardingTransitionContext.Provider>
  );
}

export function useOnboardingTransition() {
  const context = useContext(OnboardingTransitionContext);
  if (!context) {
    throw new Error(
      "useOnboardingTransition must be used within an OnboardingProvider"
    );
  }
  return context;
}
