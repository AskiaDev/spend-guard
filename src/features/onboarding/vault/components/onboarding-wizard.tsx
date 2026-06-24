"use client";

import { useState } from "react";
import { useForm, useWatch, type Path } from "react-hook-form";
import { useRouter } from "next/navigation";
import { saveFinancialProfileAction } from "@/features/financial-profile/api/save-financial-profile";
import { financialProfileSchema } from "@/lib/schemas/finance";
import { buildOnboardingPayload, type OnboardingFormValues } from "../lib/onboarding-form";
import { OnboardingShell } from "./onboarding-shell";
import { GuardianHeroPlayer } from "./guardian-hero-player";
import { StepIncomeSavings } from "./step-income-savings";
import { StepCommitments } from "./step-commitments";
import { StepGoals } from "./step-goals";
import { StepReview } from "./step-review";
import { VaultButton } from "./primitives/vault-button";

const LABELS = ["Income & savings", "Commitments", "Goals", "Review"];
const LAST_STEP = LABELS.length - 1;
const REVIEW_STEP = 3;

// The 7 profile fields are the only hard gate (step 0). Steps 1 and 2 are
// skippable: blank or half-filled rows are dropped by the payload builder and
// validated by the server save, so we never block on them client-side.
const PROFILE_FIELDS: Path<OnboardingFormValues>[] = [
  "fullName",
  "currency",
  "payFrequency",
  "monthlyIncome",
  "estimatedVariableExpenses",
  "currentSavings",
  "emergencyFundTarget",
];

const PROFILE_FIELD_SET = new Set<string>(PROFILE_FIELDS);

const DEFAULT_VALUES: OnboardingFormValues = {
  fullName: "",
  currency: "PHP",
  payFrequency: "monthly",
  monthlyIncome: "",
  estimatedVariableExpenses: "",
  currentSavings: "",
  emergencyFundTarget: "",
  expenses: [],
  debts: [],
  goals: [],
};

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    formState: { errors },
    getValues,
    setError,
    clearErrors,
  } = useForm<OnboardingFormValues>({ defaultValues: DEFAULT_VALUES });

  // Live snapshot so the Review summary reflects in-progress edits.
  const watchedValues = useWatch({ control }) as OnboardingFormValues;

  /** Step 0 gate: validate the profile subset, surface field errors, allow/deny advance. */
  function isProfileStepValid(): boolean {
    const values = getValues();
    const result = financialProfileSchema.safeParse({
      fullName: values.fullName,
      currency: values.currency,
      payFrequency: values.payFrequency,
      monthlyIncome: values.monthlyIncome,
      estimatedVariableExpenses: values.estimatedVariableExpenses,
      currentSavings: values.currentSavings,
      emergencyFundTarget: values.emergencyFundTarget,
    });

    clearErrors(PROFILE_FIELDS);

    if (result.success) {
      return true;
    }

    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && PROFILE_FIELD_SET.has(field)) {
        setError(field as Path<OnboardingFormValues>, { message: issue.message });
      }
    }

    return false;
  }

  function handleContinue() {
    if (step === 0 && !isProfileStepValid()) {
      return;
    }
    setStep((current) => Math.min(current + 1, LAST_STEP));
  }

  function handleBack() {
    setSubmitError(null);
    setStep((current) => Math.max(current - 1, 0));
  }

  async function handleSubmit() {
    setSaving(true);
    setSubmitError(null);

    const result = await saveFinancialProfileAction(buildOnboardingPayload(getValues()));

    if (!result.ok) {
      setSubmitError(result.error);
      setSaving(false);
      return;
    }

    router.replace("/");
  }

  const isReview = step === REVIEW_STEP;

  return (
    <OnboardingShell
      step={step + 1}
      labels={LABELS}
      hero={<GuardianHeroPlayer variant={isReview ? "lock" : "loop"} />}
      footer={
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {submitError ? (
            <div
              role="alert"
              style={{
                background: "color-mix(in srgb, var(--vault-danger) 14%, transparent)",
                border: "1px solid color-mix(in srgb, var(--vault-danger) 45%, transparent)",
                borderRadius: "var(--vault-radius-ctl)",
                color: "var(--vault-danger)",
                fontSize: "0.8rem",
                fontWeight: 500,
                padding: "10px 14px",
              }}
            >
              {submitError}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              {step > 0 ? (
                <VaultButton variant="ghost" onClick={handleBack} disabled={saving}>
                  Back
                </VaultButton>
              ) : null}
            </div>

            {isReview ? (
              <VaultButton onClick={handleSubmit} disabled={saving}>
                {saving ? "Sealing the vault..." : "Confirm & finish"}
              </VaultButton>
            ) : (
              <VaultButton onClick={handleContinue}>Continue</VaultButton>
            )}
          </div>
        </div>
      }
    >
      {step === 0 ? (
        <StepIncomeSavings register={register} control={control} errors={errors} />
      ) : null}
      {step === 1 ? (
        <StepCommitments register={register} control={control} errors={errors} />
      ) : null}
      {step === 2 ? (
        <StepGoals register={register} control={control} errors={errors} />
      ) : null}
      {isReview ? (
        <StepReview values={watchedValues} onEdit={(index) => setStep(index)} />
      ) : null}
    </OnboardingShell>
  );
}
