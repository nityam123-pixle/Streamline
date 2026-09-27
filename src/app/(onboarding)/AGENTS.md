# Onboarding

## Overview

Six step onboarding flow for Streamline workspace owners. Steps collect role, company details, automation targets, selected tools, and team invitations before rendering the setup summary.

## Key files

| File | Owns |
|---|---|
| `src/app/(onboarding)/layout.tsx` | Layout wrapping children in transition provider, rendering shell, and enforcing route authorization |
| `src/lib/onboarding/routing.ts` | Step registry, high watermark progression, and authoritative resume lookup |
| `src/components/onboarding/OnboardingShell.tsx` | Container managing step animations and two column responsive grid |
| `src/context/OnboardingTransitionContext.tsx` | State and transition triggers between consecutive steps |
| `src/config/onboardingSteps.tsx` | Step registry mapping paths to visual and form components |

## Conventions

- The UI matches the approved Figma designs. Wire data into existing forms without altering styles or layout dimensions.
- Preserve animated transitions managed by `OnboardingTransitionContext`.
- Forward skips past unlocked onboarding steps redirect back to the active step; backward navigation remains permitted.
- Modifying earlier step forms preserves downstream progress using high watermark logic.
- Keep Google and GitHub buttons inactive until social auth is added.
- The tools step records selected tools only. Do not label them connected until live OAuth is built.

## Gotchas

- In `layout.tsx`, `children` is marked `sr-only` for accessibility while `OnboardingShell` renders the active step view dynamically.
- Form components must receive and trigger `onContinue` callbacks with typed data payloads.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
