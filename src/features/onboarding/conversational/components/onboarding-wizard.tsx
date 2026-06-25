"use client";

import { useCallback, useMemo, useState } from "react";
import { useForm, useWatch, Controller, type Control } from "react-hook-form";
import { useRouter } from "next/navigation";

import { saveFinancialProfileAction } from "@/features/financial-profile/api/save-financial-profile";
import { OnboardingShell } from "../../vault/components/onboarding-shell";
import { GuardianHeroPlayer } from "../../vault/components/guardian-hero-player";
import { VaultButton } from "../../vault/components/primitives/vault-button";

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

// Short progress labels - one word per screen so the dotted ProgressPath stays
// legible at 14 steps. Order matches ONBOARDING_STEPS exactly.
const PROGRESS_LABELS: Record<OnboardingStepId, string> = {
  welcome: "Start",
  intent: "Goals",
  "pain-points": "Habits",
  "setup-intro": "Setup",
  income: "Income",
  savings: "Savings",
  "variable-spend": "Spending",
  buffer: "Buffer",
  commitments: "Bills",
  debts: "Debt",
  goals: "Targets",
  cooldown: "Pause",
  "first-check": "Check",
  summary: "Ready",
};

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

const dangerBannerStyle: React.CSSProperties = {
  background: "color-mix(in srgb, var(--vault-danger) 14%, transparent)",
  border: "1px solid color-mix(in srgb, var(--vault-danger) 45%, transparent)",
  borderRadius: "var(--vault-radius-ctl)",
  color: "var(--vault-danger)",
  fontSize: "0.8rem",
  fontWeight: 500,
  lineHeight: 1.45,
  padding: "10px 14px",
};

// ---- Footer (isolated so a money keystroke never re-renders the wizard/hero) --
//
// Only `income` and `savings` are required (isStepComplete). For those we
// subscribe via useWatch to the SINGLE gating field, so typing re-renders just
// this small button row. Non-required steps never subscribe at all.

const GATE_FIELD: Partial<Record<OnboardingStepId, keyof OnboardingFormValues>> = {
  income: "monthlyIncome",
  savings: "currentSavings",
};

function StepFooter({
  step,
  control,
  onContinue,
  onSkip,
  saving,
  error,
}: {
  step: OnboardingStep;
  control: Control<OnboardingFormValues>;
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
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {error ? (
        <div role="alert" style={dangerBannerStyle}>
          {error}
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
          {step.skippable ? (
            <button
              type="button"
              onClick={onSkip}
              disabled={saving}
              className="conv-skip"
              title={step.skipNote}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--vault-muted)",
                cursor: saving ? "not-allowed" : "pointer",
                fontSize: "0.82rem",
                fontWeight: 600,
                padding: "6px 2px",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              Skip for now
            </button>
          ) : null}
        </div>

        <VaultButton onClick={onContinue} disabled={!canContinue || saving}>
          {saving ? "Building your guardrail..." : "Continue"}
        </VaultButton>
      </div>

      {step.skippable && step.skipNote ? (
        <p
          style={{
            margin: 0,
            fontSize: "0.72rem",
            color: "var(--vault-muted)",
            opacity: 0.75,
            lineHeight: 1.4,
          }}
        >
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

  const progressSteps = useMemo(
    () => ONBOARDING_STEPS.map((s) => ({ id: s.id, label: PROGRESS_LABELS[s.id] })),
    []
  );

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
      progress={<ProgressPath steps={progressSteps} currentIndex={stepIndex} />}
      footer={
        usesFooter ? (
          <StepFooter
            step={step}
            control={control}
            onContinue={handleContinue}
            onSkip={handleSkip}
            saving={saving}
            error={saveError}
          />
        ) : null
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
