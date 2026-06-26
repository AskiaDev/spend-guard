"use client";

import { useCallback, useMemo, useState } from "react";
import { useForm, useWatch, Controller, type Control } from "react-hook-form";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { saveFinancialProfileAction } from "@/features/financial-profile/api/save-financial-profile";
import { OnboardingShell } from "../../vault/components/onboarding-shell";
import { GuardianHeroPlayer } from "../../vault/components/guardian-hero-player";
import { Button } from "@/components/ui/button";

import {
  ONBOARDING_STEPS,
  isStepComplete,
  getStepIndex,
  type OnboardingStep,
  type OnboardingStepId,
} from "../config/onboarding-steps";
import {
  createDefaultValues,
  buildOnboardingPayload,
  type OnboardingFormValues,
} from "../lib/onboarding-form";
import { ProgressPath } from "./progress-path";
import { MicroResponse } from "./micro-response";

import { WelcomeStep } from "./steps/welcome-step";
import { SetupIntroStep } from "./steps/setup-intro-step";
import { IntentStep } from "./steps/intent-step";
import { PainPointsStep } from "./steps/pain-points-step";
import { IncomeStep } from "./steps/income-step";
import { SavingsStep } from "./steps/savings-step";
import { VariableSpendStep } from "./steps/variable-spend-step";
import { BufferStep } from "./steps/buffer-step";
import { CommitmentsStep } from "./steps/commitments-step";
import { DebtsStep } from "./steps/debts-step";
import { GoalsStep } from "./steps/goals-step";
import { CooldownStep } from "./steps/cooldown-step";
import { FirstPurchaseCheck } from "./first-purchase-check";
import { OnboardingSummary } from "./onboarding-summary";

// In-voice reflection shown after each input step is answered (BRAND_VOICE.md:
// calm, protective, no shame, no em dash).
const MICRO_RESPONSE: Partial<Record<OnboardingStepId, string>> = {
  intent: "Good to know. We'll keep that front of mind.",
  "pain-points": "Thanks for being honest. We'll watch for those moments.",
  income: "Got it. That is what we'll build everything else around.",
  savings: "Noted. We'll keep this protected, not counted as spendable.",
  "variable-spend": "Helpful. We'll set this aside before calling anything safe.",
  buffer: "Set. This stays protected, no matter what.",
  commitments: "Locked in. This money is spoken for before anything else.",
  debts: "Got it. Your minimum payments will always be reserved.",
  goals: "Nice. We'll protect your targets a little each month.",
  cooldown: "Set. You can change how firm your pause is anytime.",
};

const FIRST_CHECK_INDEX = getStepIndex("first-check");
const SUMMARY_INDEX = getStepIndex("summary");
const COOLDOWN_INDEX = getStepIndex("cooldown");

// ---- Footer (isolated so a money keystroke never re-renders the wizard/hero) --
//
// Only `income` and `savings` are required (isStepComplete). For those we
// subscribe via useWatch to the SINGLE gating field, so typing re-renders just
// this small button row. Non-required steps never subscribe at all.

const GATE_FIELD: Partial<Record<OnboardingStepId, keyof OnboardingFormValues>> = {
  income: "monthlyIncome",
  savings: "currentSavings",
};

function GoBackButton({
  onBack,
  disabled,
}: {
  onBack: () => void;
  disabled: boolean;
}) {
  return (
    <Button variant="ghost" className="text-muted-foreground" onClick={onBack} disabled={disabled}>
      <ArrowLeft size={15} aria-hidden="true" />
      Go Back
    </Button>
  );
}

function StepFooter({
  step,
  control,
  onBack,
  onContinue,
  onSkip,
  saving,
  error,
}: {
  step: OnboardingStep;
  control: Control<OnboardingFormValues>;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
  saving: boolean;
  error: string | null;
}) {
  const gateField = GATE_FIELD[step.id];
  // useWatch always runs; for non-gated steps we watch a stable field we never
  // block on, so the hook order is constant and the subscription stays narrow.
  const watched = useWatch({
    control,
    name: gateField ?? "currency",
  });

  // Build a minimal values shape for isStepComplete. Only required steps read a
  // money field; everything else is allowed through regardless of `watched`.
  const canContinue = step.required
    ? isStepComplete(step, {
        ...createDefaultValues(),
        ...(gateField ? { [gateField]: String(watched ?? "") } : {}),
      })
    : true;

  return (
    <div className="flex flex-col gap-[14px]">
      {error ? (
        <div
          role="alert"
          className="bg-destructive/14 border border-destructive/45 rounded-control text-destructive text-[0.8rem] font-medium leading-[1.45] py-[10px] px-[14px]"
        >
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-[10px]">
          <GoBackButton onBack={onBack} disabled={saving} />
          {step.skippable ? (
            <button
              type="button"
              onClick={onSkip}
              disabled={saving}
              className="bg-transparent border-none text-muted-foreground cursor-pointer disabled:cursor-not-allowed text-[0.82rem] font-semibold py-[6px] px-0.5 underline underline-offset-[3px] rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              title={step.skipNote}
            >
              Skip for now
            </button>
          ) : null}
        </div>

        <Button onClick={onContinue} disabled={!canContinue || saving}>
          {saving ? "Building your guardrail..." : "Continue"}
        </Button>
      </div>

      {step.skippable && step.skipNote ? (
        <p className="m-0 text-[0.72rem] text-muted-foreground opacity-75 leading-[1.4]">
          {step.skipNote}
        </p>
      ) : null}
    </div>
  );
}

// ---- Per-step body. Value/onChange steps are wrapped in Controller so RHF
//      isolates their updates to this subtree (no wizard-wide re-render). ----

function StepBody({
  step,
  control,
  getValues,
  onStart,
  onExplore,
  onContinue,
  onCheckDone,
  onEnterApp,
}: {
  step: OnboardingStep;
  control: Control<OnboardingFormValues>;
  getValues: () => OnboardingFormValues;
  onStart: () => void;
  onExplore: () => void;
  onContinue: () => void;
  onCheckDone: () => void;
  onEnterApp: () => void;
}) {
  switch (step.id) {
    case "welcome":
      return <WelcomeStep onStart={onStart} onExplore={onExplore} />;
    case "setup-intro":
      return <SetupIntroStep onContinue={onContinue} />;
    case "intent":
      return (
        <Controller
          control={control}
          name="intent"
          render={({ field }) => <IntentStep value={field.value} onChange={field.onChange} />}
        />
      );
    case "pain-points":
      return (
        <Controller
          control={control}
          name="spendingPainPoints"
          render={({ field }) => (
            <PainPointsStep value={field.value} onChange={field.onChange} />
          )}
        />
      );
    case "income":
      return <IncomeStep control={control} />;
    case "savings":
      return <SavingsStep control={control} />;
    case "variable-spend":
      return <VariableSpendStep control={control} />;
    case "buffer":
      return (
        <Controller
          control={control}
          name="emergencyBuffer"
          render={({ field }) => <BufferStep value={field.value} onChange={field.onChange} />}
        />
      );
    case "commitments":
      return <CommitmentsStep control={control} />;
    case "debts":
      return <DebtsStep control={control} />;
    case "goals":
      return <GoalsStep control={control} />;
    case "cooldown":
      return (
        <Controller
          control={control}
          name="cooldownPreference"
          render={({ field }) => <CooldownStep value={field.value} onChange={field.onChange} />}
        />
      );
    case "first-check":
      return (
        <FirstPurchaseCheck values={getValues()} onDone={onCheckDone} onSkip={onCheckDone} />
      );
    case "summary":
      return <OnboardingSummary values={getValues()} onEnterApp={onEnterApp} />;
    default:
      return null;
  }
}

// ---- Reflection. Reads the answered-state of the current step through a narrow
//      useWatch so a keystroke does not re-render the wizard root. ----

function isAnswered(step: OnboardingStep, value: unknown): boolean {
  switch (step.id) {
    case "intent":
    case "pain-points":
      return Array.isArray(value) && value.length > 0;
    case "income":
    case "savings":
    case "variable-spend":
    case "buffer":
      return typeof value === "string" && value.trim() !== "";
    case "cooldown":
      return Boolean(value);
    default:
      return false;
  }
}

const REFLECTION_FIELD: Partial<Record<OnboardingStepId, keyof OnboardingFormValues>> = {
  intent: "intent",
  "pain-points": "spendingPainPoints",
  income: "monthlyIncome",
  savings: "currentSavings",
  "variable-spend": "estimatedVariableExpenses",
  buffer: "emergencyBuffer",
  cooldown: "cooldownPreference",
};

function StepReflection({
  step,
  control,
}: {
  step: OnboardingStep;
  control: Control<OnboardingFormValues>;
}) {
  const field = REFLECTION_FIELD[step.id];
  const value = useWatch({ control, name: field ?? "currency" });
  const message = MICRO_RESPONSE[step.id];
  if (!field || !message) return null;
  return <MicroResponse show={isAnswered(step, value)}>{message}</MicroResponse>;
}

// ---- Wizard orchestrator ----------------------------------------------------

export default function OnboardingWizard() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { control, getValues } = useForm<OnboardingFormValues>({
    defaultValues: createDefaultValues(),
  });

  const step = ONBOARDING_STEPS[stepIndex];

  // The lock variant marks the signature "sealed" moment on the final screen;
  // memoize the element so wizard re-renders never restart the hero animation.
  const heroVariant = stepIndex >= FIRST_CHECK_INDEX ? "lock" : "loop";
  const hero = useMemo(() => <GuardianHeroPlayer variant={heroVariant} />, [heroVariant]);

  const goToIndex = useCallback((index: number) => {
    setSaveError(null);
    setStepIndex(index);
  }, []);

  const handleStart = useCallback(() => {
    goToIndex(getStepIndex("intent"));
  }, [goToIndex]);

  const handleExplore = useCallback(() => {
    router.push("/explore");
  }, [router]);

  const handleEnterApp = useCallback(() => {
    router.replace("/");
  }, [router]);

  const handleCheckDone = useCallback(() => {
    goToIndex(SUMMARY_INDEX);
  }, [goToIndex]);

  const handleBack = useCallback(() => {
    if (saving) return;
    goToIndex(Math.max(0, stepIndex - 1));
  }, [saving, stepIndex, goToIndex]);

  // Advance one input/interstitial step. Past cooldown we persist first.
  const handleContinue = useCallback(async () => {
    if (saving) return;

    if (stepIndex === COOLDOWN_INDEX) {
      setSaving(true);
      setSaveError(null);
      try {
        const result = await saveFinancialProfileAction(buildOnboardingPayload(getValues()));
        if (!result.ok) {
          setSaveError(result.error);
          setSaving(false);
          return;
        }
      } catch {
        setSaveError("We could not save your setup. Your answers are still here - try again.");
        setSaving(false);
        return;
      }
      setSaving(false);
      goToIndex(FIRST_CHECK_INDEX);
      return;
    }

    goToIndex(Math.min(stepIndex + 1, ONBOARDING_STEPS.length - 1));
  }, [saving, stepIndex, getValues, goToIndex]);

  // Skip advances the same way (still saves when leaving cooldown).
  const handleSkip = handleContinue;

  // Interstitial / check / summary screens own their navigation buttons.
  const usesFooter =
    step.kind !== "interstitial" && step.kind !== "check" && step.kind !== "summary";

  return (
    <OnboardingShell
      step={stepIndex + 1}
      hero={hero}
      progress={<ProgressPath current={stepIndex + 1} total={ONBOARDING_STEPS.length} />}
      footer={
        usesFooter ? (
          <StepFooter
            step={step}
            control={control}
            onBack={handleBack}
            onContinue={handleContinue}
            onSkip={handleSkip}
            saving={saving}
            error={saveError}
          />
        ) : stepIndex > 0 ? (
          <GoBackButton onBack={handleBack} disabled={saving} />
        ) : null
      }
    >
      <div className="flex flex-col gap-5">
        <StepBody
          step={step}
          control={control}
          getValues={getValues}
          onStart={handleStart}
          onExplore={handleExplore}
          onContinue={handleContinue}
          onCheckDone={handleCheckDone}
          onEnterApp={handleEnterApp}
        />
        {usesFooter ? <StepReflection step={step} control={control} /> : null}
      </div>
    </OnboardingShell>
  );
}
