"use client";

import type { Control } from "react-hook-form";
import type { OnboardingFormValues } from "../../lib/onboarding-form";
import { ConversationalPrompt } from "../conversational-prompt";
import { CommitmentBuilder } from "../commitment-builder";

const COMMITMENT_EXAMPLES = [
  "Rent",
  "Internet",
  "Phone",
  "Electricity",
  "Groceries",
  "Transport",
];

interface CommitmentsStepProps {
  control: Control<OnboardingFormValues>;
}

export function CommitmentsStep({ control }: CommitmentsStepProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <ConversationalPrompt
        eyebrow="Fixed expenses"
        headline="What money is already spoken for?"
        subtext="Add anything that hits your account on a schedule - rent, subscriptions, utilities. SpendGuard will protect this before calling anything safe to spend."
      />
      <CommitmentBuilder control={control} examples={COMMITMENT_EXAMPLES} />
    </div>
  );
}
