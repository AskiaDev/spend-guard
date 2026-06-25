"use client";

import { Controller, useWatch, type Control } from "react-hook-form";
import type { OnboardingFormValues } from "../../lib/onboarding-form";
import { VaultField } from "../../../vault/components/primitives/vault-field";
import { VaultSelect } from "../../../vault/components/primitives/vault-select";
import { ConversationalPrompt } from "../conversational-prompt";
import { MoneyInput } from "../money-input";

const CURRENCY_OPTIONS = [
  { value: "PHP", label: "PHP - Philippine Peso" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "SGD", label: "SGD - Singapore Dollar" },
];

export function IncomeStep({ control }: { control: Control<OnboardingFormValues> }) {
  const currency = useWatch({ control, name: "currency" }) ?? "PHP";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <ConversationalPrompt
        eyebrow="Income"
        headline="What comes in each month?"
        subtext="Use your take-home pay - the amount that actually reaches your account."
        why="SpendGuard uses this to calculate what is safely available after your commitments are covered."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Controller
          name="monthlyIncome"
          control={control}
          render={({ field }) => (
            <MoneyInput
              id="monthlyIncome"
              label="Monthly income"
              value={field.value}
              onChange={field.onChange}
              currency={currency}
              autoFocus
            />
          )}
        />

        <VaultField label="Currency" htmlFor="currency">
          <Controller
            name="currency"
            control={control}
            render={({ field }) => (
              <VaultSelect
                id="currency"
                value={field.value}
                onChange={field.onChange}
                options={CURRENCY_OPTIONS}
              />
            )}
          />
        </VaultField>
      </div>
    </div>
  );
}
