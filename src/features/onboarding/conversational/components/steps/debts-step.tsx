"use client";

import type { Control } from "react-hook-form";
import type { OnboardingFormValues } from "../../lib/onboarding-form";
import { ConversationalPrompt } from "../conversational-prompt";
import { DebtBuilder } from "../debt-builder";

const DEBT_EXAMPLES = ["Credit card", "Personal loan", "Car loan"];

interface DebtsStepProps {
  control: Control<OnboardingFormValues>;
}

export function DebtsStep({ control }: DebtsStepProps) {
  return (
    <div className="flex flex-col gap-7">
      <ConversationalPrompt
        eyebrow="Debt payments"
        headline="Any regular payments toward what you owe?"
        subtext="Add your credit cards, loans, or other payment obligations. SpendGuard will reserve your minimum payments so they are always covered."
      />
      <DebtBuilder control={control} examples={DEBT_EXAMPLES} />
    </div>
  );
}
