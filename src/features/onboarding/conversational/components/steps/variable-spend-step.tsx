"use client";

import { Controller, useWatch, type Control } from "react-hook-form";
import type { OnboardingFormValues } from "../../lib/onboarding-form";
import { ConversationalPrompt } from "../conversational-prompt";
import { MoneyInput } from "../money-input";

export function VariableSpendStep({ control }: { control: Control<OnboardingFormValues> }) {
  const currency = useWatch({ control, name: "currency" }) ?? "PHP";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <ConversationalPrompt
        eyebrow="Variable spending"
        headline="What do you typically spend on day-to-day?"
        subtext="Think groceries, transport, eating out, subscriptions - money that varies month to month."
        why="SpendGuard sets this aside before calculating what is safe for a new purchase."
      />

      <Controller
        name="estimatedVariableExpenses"
        control={control}
        render={({ field }) => (
          <MoneyInput
            id="estimatedVariableExpenses"
            label="Estimated variable expenses"
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
