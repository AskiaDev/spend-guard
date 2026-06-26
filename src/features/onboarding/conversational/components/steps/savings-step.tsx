"use client";

import { Controller, useWatch, type Control } from "react-hook-form";
import type { OnboardingFormValues } from "../../lib/onboarding-form";
import { ConversationalPrompt } from "../conversational-prompt";
import { MoneyInput } from "../money-input";

export function SavingsStep({ control }: { control: Control<OnboardingFormValues> }) {
  const currency = useWatch({ control, name: "currency" }) ?? "PHP";

  return (
    <div className="flex flex-col gap-7">
      <ConversationalPrompt
        eyebrow="Savings"
        headline="How much do you have saved right now?"
        subtext="Include money set aside for emergencies or goals - not money already reserved for bills."
        why="This helps SpendGuard protect your savings from being counted as safe-to-spend."
      />

      <Controller
        name="currentSavings"
        control={control}
        render={({ field }) => (
          <MoneyInput
            id="currentSavings"
            label="Current savings"
            value={field.value}
            onChange={field.onChange}
            currency={currency}
            autoFocus
          />
        )}
      />
    </div>
  );
}
