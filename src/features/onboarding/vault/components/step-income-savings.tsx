"use client";

import { Controller, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { PAY_FREQUENCY_LABELS, type PayFrequency } from "@/types/finance";
import { type OnboardingFormValues } from "../lib/onboarding-form";
import { VaultField } from "./primitives/vault-field";
import { VaultInput } from "./primitives/vault-input";
import { VaultSelect } from "./primitives/vault-select";

const CURRENCY_OPTIONS = [
  { value: "PHP", label: "PHP - Philippine Peso" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "SGD", label: "SGD - Singapore Dollar" },
];

const PAY_FREQUENCY_OPTIONS = (Object.entries(PAY_FREQUENCY_LABELS) as [PayFrequency, string][]).map(
  ([value, label]) => ({ value, label }),
);

const blockStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
  paddingLeft: 14,
  borderLeft: "2px solid color-mix(in srgb, var(--vault-accent) 25%, transparent)",
};

export function StepIncomeSavings({
  register,
  control,
  errors,
}: {
  register: UseFormRegister<OnboardingFormValues>;
  control: Control<OnboardingFormValues>;
  errors: FieldErrors<OnboardingFormValues>;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* You */}
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <span className="vault-eyebrow">You</span>
        <div style={blockStyle}>
          <VaultField label="Full name" htmlFor="fullName" error={errors.fullName?.message}>
            <VaultInput id="fullName" type="text" placeholder="Your name" {...register("fullName")} />
          </VaultField>

          <VaultField label="Currency" htmlFor="currency" error={errors.currency?.message}>
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

          <VaultField label="Pay frequency" htmlFor="payFrequency" error={errors.payFrequency?.message}>
            <Controller
              name="payFrequency"
              control={control}
              render={({ field }) => (
                <VaultSelect
                  id="payFrequency"
                  value={field.value}
                  onChange={field.onChange}
                  options={PAY_FREQUENCY_OPTIONS}
                />
              )}
            />
          </VaultField>
        </div>
      </section>

      {/* Income */}
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <span className="vault-eyebrow">Income</span>
        <div style={blockStyle}>
          <VaultField label="Monthly income" htmlFor="monthlyIncome" error={errors.monthlyIncome?.message}>
            <VaultInput
              id="monthlyIncome"
              inputMode="decimal"
              placeholder="0.00"
              {...register("monthlyIncome")}
            />
          </VaultField>

          <VaultField
            label="Estimated variable expenses"
            htmlFor="estimatedVariableExpenses"
            error={errors.estimatedVariableExpenses?.message}
          >
            <VaultInput
              id="estimatedVariableExpenses"
              inputMode="decimal"
              placeholder="0.00"
              {...register("estimatedVariableExpenses")}
            />
          </VaultField>
        </div>
      </section>

      {/* Savings */}
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <span className="vault-eyebrow">Savings</span>
        <div style={blockStyle}>
          <VaultField label="Current savings" htmlFor="currentSavings" error={errors.currentSavings?.message}>
            <VaultInput
              id="currentSavings"
              inputMode="decimal"
              placeholder="0.00"
              {...register("currentSavings")}
            />
          </VaultField>

          <VaultField
            label="Emergency fund target"
            htmlFor="emergencyFundTarget"
            error={errors.emergencyFundTarget?.message}
          >
            <VaultInput
              id="emergencyFundTarget"
              inputMode="decimal"
              placeholder="0.00"
              {...register("emergencyFundTarget")}
            />
          </VaultField>
        </div>
      </section>
    </div>
  );
}
