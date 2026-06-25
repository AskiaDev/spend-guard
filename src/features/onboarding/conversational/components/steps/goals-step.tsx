"use client";

import type { Control } from "react-hook-form";
import type { OnboardingFormValues } from "../../lib/onboarding-form";
import { ConversationalPrompt } from "../conversational-prompt";
import { GoalBuilder } from "../goal-builder";

const GOAL_EXAMPLES = [
  "Emergency fund",
  "Travel",
  "New laptop",
  "New phone",
];

interface GoalsStepProps {
  control: Control<OnboardingFormValues>;
}

export function GoalsStep({ control }: GoalsStepProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <ConversationalPrompt
        eyebrow="Savings goals"
        headline="What are you saving toward?"
        subtext="Add targets you want to reach - a trip, a cushion, a device. These are separate from your emergency buffer, which is your safety net for the unexpected."
      />
      <GoalBuilder control={control} examples={GOAL_EXAMPLES} />
    </div>
  );
}
