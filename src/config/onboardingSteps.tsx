import React from "react";
import { WelcomeStepContent } from "@/components/welcome/WelcomeStepContent";
import { WelcomeStepVisual } from "@/components/welcome/WelcomeStepVisual";
import { AboutStepContent } from "@/components/about/AboutStepContent";
import { AboutStepVisual } from "@/components/about/AboutStepVisual";
import { AutomationStepContent } from "@/components/automation/AutomationStepContent";
import { AutomationStepVisual } from "@/components/automation/AutomationStepVisual";
import { ToolsStepContent } from "@/components/tools/ToolsStepContent";
import { ToolsStepVisual } from "@/components/tools/ToolsStepVisual";
import { TeamInvitationStepContent } from "@/components/team-invitation/TeamInvitationStepContent";
import { TeamInvitationStepVisual } from "@/components/team-invitation/TeamInvitationStepVisual";
import { LaunchStepContent } from "@/components/launch/LaunchStepContent";
import { LaunchStepVisual } from "@/components/launch/LaunchStepVisual";

export interface OnboardingStep {
  id: string;
  index: number;
  path: string;
  title: string;
  renderLeftContent: (props: {
    onContinue?: (data?: any) => void;
    isTransitioning?: boolean;
  }) => React.ReactNode;
  renderRightVisual: () => React.ReactNode;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    index: 1,
    path: "/welcome",
    title: "Welcome to Streamline",
    renderLeftContent: (props) => (
      <WelcomeStepContent
        onContinue={props.onContinue}
        isTransitioning={props.isTransitioning}
      />
    ),
    renderRightVisual: () => <WelcomeStepVisual />,
  },
  {
    id: "about",
    index: 2,
    path: "/about",
    title: "Tell us about yourself",
    renderLeftContent: (props) => (
      <AboutStepContent
        onContinue={props.onContinue}
        isTransitioning={props.isTransitioning}
      />
    ),
    renderRightVisual: () => <AboutStepVisual />,
  },
  {
    id: "automation",
    index: 3,
    path: "/automation",
    title: "What will you automate?",
    renderLeftContent: (props) => (
      <AutomationStepContent
        onContinue={props.onContinue}
        isTransitioning={props.isTransitioning}
      />
    ),
    renderRightVisual: () => <AutomationStepVisual />,
  },
  {
    id: "tools",
    index: 4,
    path: "/tools",
    title: "Connect your tools",
    renderLeftContent: (props) => (
      <ToolsStepContent
        onContinue={props.onContinue}
        isTransitioning={props.isTransitioning}
      />
    ),
    renderRightVisual: () => <ToolsStepVisual />,
  },
  {
    id: "team-invitation",
    index: 5,
    path: "/team-invitation",
    title: "Invite your team",
    renderLeftContent: (props) => (
      <TeamInvitationStepContent
        onContinue={props.onContinue}
        isTransitioning={props.isTransitioning}
      />
    ),
    renderRightVisual: () => <TeamInvitationStepVisual />,
  },
  {
    id: "launch",
    index: 6,
    path: "/launch",
    title: "You’re all set!",
    renderLeftContent: (props) => (
      <LaunchStepContent
        onContinue={props.onContinue}
        isTransitioning={props.isTransitioning}
      />
    ),
    renderRightVisual: () => <LaunchStepVisual />,
  },
];

export const TOTAL_ONBOARDING_STEPS = 6;

export function getStepByPath(path: string): OnboardingStep {
  const normalized = path.replace(/\/$/, "").toLowerCase();
  const step = ONBOARDING_STEPS.find((s) => s.path === normalized);
  return step || ONBOARDING_STEPS[0];
}

export function getStepByIndex(index: number): OnboardingStep | undefined {
  return ONBOARDING_STEPS.find((s) => s.index === index);
}
