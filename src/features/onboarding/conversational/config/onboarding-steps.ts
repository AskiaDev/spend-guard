import type { OnboardingFormValues } from "../lib/onboarding-form";

export type OnboardingStepId =
  | "welcome"
  | "intent"
  | "pain-points"
  | "setup-intro"
  | "income"
  | "savings"
  | "variable-spend"
  | "buffer"
  | "commitments"
  | "debts"
  | "goals"
  | "cooldown"
  | "first-check"
  | "summary";

export type StepKind =
  | "interstitial"
  | "multi-select"
  | "money"
  | "preset"
  | "builder"
  | "single-select"
  | "check"
  | "summary";

export interface OnboardingStep {
  id: OnboardingStepId;
  kind: StepKind;
  required: boolean;
  skippable: boolean;
  skipNote?: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    kind: "interstitial",
    required: false,
    skippable: false,
  },
  {
    id: "intent",
    kind: "multi-select",
    required: false,
    skippable: true,
    skipNote:
      "That's fine - we'll set up your guardrail with what you give us.",
  },
  {
    id: "pain-points",
    kind: "multi-select",
    required: false,
    skippable: true,
    skipNote:
      "No worries. You can always revisit this in settings.",
  },
  {
    id: "setup-intro",
    kind: "interstitial",
    required: false,
    skippable: false,
  },
  {
    id: "income",
    kind: "money",
    required: true,
    skippable: false,
  },
  {
    id: "savings",
    kind: "money",
    required: true,
    skippable: false,
  },
  {
    id: "variable-spend",
    kind: "money",
    required: false,
    skippable: true,
    skipNote:
      "You can add this later. Until then your safe-to-spend will look a little higher than it really is.",
  },
  {
    id: "buffer",
    kind: "preset",
    required: false,
    skippable: true,
    skipNote:
      "No buffer set. Your safe-to-spend will include money that is meant to stay protected.",
  },
  {
    id: "commitments",
    kind: "builder",
    required: false,
    skippable: true,
    skipNote:
      "You can add bills later. Until then your safe-to-spend will look higher than it really is.",
  },
  {
    id: "debts",
    kind: "builder",
    required: false,
    skippable: true,
    skipNote:
      "You can add debts later. Your guardrail will be less accurate without them.",
  },
  {
    id: "goals",
    kind: "builder",
    required: false,
    skippable: true,
    skipNote:
      "You can add savings goals later. We will not protect any target amounts until then.",
  },
  {
    id: "cooldown",
    kind: "single-select",
    required: false,
    skippable: true,
    skipNote:
      "We will use balanced mode by default. You can change this in settings anytime.",
  },
  {
    id: "first-check",
    kind: "check",
    required: false,
    skippable: true,
    skipNote:
      "Skip the demo for now - head straight to the app and try a real purchase.",
  },
  {
    id: "summary",
    kind: "summary",
    required: false,
    skippable: false,
  },
];

function parseMoney(value: string): number {
  const n = parseFloat(value);
  return isNaN(n) ? NaN : n;
}

export function isStepComplete(
  step: OnboardingStep,
  values: OnboardingFormValues
): boolean {
  if (!step.required) return true;

  if (step.id === "income") {
    const n = parseMoney(values.monthlyIncome);
    return !isNaN(n) && n > 0;
  }

  if (step.id === "savings") {
    const raw = values.currentSavings;
    if (raw === "" || raw === undefined) return false;
    const n = parseMoney(raw);
    return !isNaN(n) && n >= 0;
  }

  return true;
}

export function getStepIndex(id: OnboardingStepId): number {
  return ONBOARDING_STEPS.findIndex((s) => s.id === id);
}
