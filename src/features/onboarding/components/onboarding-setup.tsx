"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { InlineNotice } from "@/components/feedback/inline-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, Input, Label, Select } from "@/components/ui/form-fields";
import { createId, formatCurrency } from "@/lib/utils";
import {
  PAY_FREQUENCIES,
  PAY_FREQUENCY_LABELS,
  type CurrencyCode,
  type FinancialSnapshot,
  type GoalPriority,
  type PayFrequency,
} from "@/types/finance";

interface OnboardingSetupProps {
  snapshot: FinancialSnapshot;
  isHydrated: boolean;
  onSave: (payload: FinancialSnapshot) => Promise<void>;
}

type StepId = "income" | "savings" | "expenses" | "debt" | "goals" | "review";

interface OnboardingFormValues {
  currency: CurrencyCode;
  fullName: string;
  payFrequency: PayFrequency;
  monthlyIncome: number;
  estimatedVariableExpenses: number;
  currentSavings: number;
  emergencyFundTarget: number;
  housingExpense: number;
  utilitiesExpense: number;
  foodTransportExpense: number;
  debtLabel: string;
  debtBalance: number;
  debtMinimumPayment: number;
  goalEmergency: boolean;
  goalPhone: boolean;
  goalTravel: boolean;
  goalDebtPayoff: boolean;
}

const steps: Array<{ id: StepId; label: string; title: string }> = [
  { id: "income", label: "Income", title: "Income" },
  { id: "savings", label: "Savings", title: "Savings" },
  { id: "expenses", label: "Expenses", title: "Expenses" },
  { id: "debt", label: "Debt", title: "Debt" },
  { id: "goals", label: "Goals", title: "Goals" },
  { id: "review", label: "Review", title: "Review your setup" },
];

const currencySchema = z.enum(["PHP", "USD", "EUR", "JPY", "SGD"]);
const payFrequencySchema = z.enum(PAY_FREQUENCIES);
const money = z.coerce.number().min(0, "Enter a positive amount.");
const incomeSchema = z.object({
  currency: currencySchema,
  fullName: z.string().trim().max(120, "Keep the name under 120 characters.").optional(),
  payFrequency: payFrequencySchema,
  monthlyIncome: money,
  estimatedVariableExpenses: money,
});
const savingsSchema = z.object({
  currentSavings: money,
  emergencyFundTarget: money,
});
const expensesSchema = z.object({
  housingExpense: money,
  utilitiesExpense: money,
  foodTransportExpense: money,
});
const debtSchema = z.object({
  debtLabel: z.string().optional(),
  debtBalance: money,
  debtMinimumPayment: money,
});
const goalsSchema = z.object({
  goalEmergency: z.coerce.boolean(),
  goalPhone: z.coerce.boolean(),
  goalTravel: z.coerce.boolean(),
  goalDebtPayoff: z.coerce.boolean(),
});

const stepSchemas = [
  incomeSchema,
  savingsSchema,
  expensesSchema,
  debtSchema,
  goalsSchema,
] as const;

const stepFieldNames: Array<Array<keyof OnboardingFormValues>> = [
  ["currency", "fullName", "payFrequency", "monthlyIncome", "estimatedVariableExpenses"],
  ["currentSavings", "emergencyFundTarget"],
  ["housingExpense", "utilitiesExpense", "foodTransportExpense"],
  ["debtLabel", "debtBalance", "debtMinimumPayment"],
  ["goalEmergency", "goalPhone", "goalTravel", "goalDebtPayoff"],
];

const defaultTargetDate = "2026-12-31";

export function OnboardingSetup({ snapshot, isHydrated, onSave }: OnboardingSetupProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [setupError, setSetupError] = useState<string | null>(null);
  const {
    register,
    control,
    getValues,
    setError,
    clearErrors,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingFormValues>({
    defaultValues: buildDefaultValues(snapshot),
  });
  const currency = useWatch({ control, name: "currency" }) ?? snapshot.profile.currency;
  const expenseValues = useWatch({
    control,
    name: ["housingExpense", "utilitiesExpense", "foodTransportExpense"],
  });
  const expenseTotal = useMemo(
    () => expenseValues.reduce((total, value) => total + toNumber(value), 0),
    [expenseValues]
  );
  const currentStep = steps[activeStep];
  const isLastStep = activeStep === steps.length - 1;

  function validateStep(stepIndex: number) {
    if (stepIndex >= stepSchemas.length) {
      return true;
    }

    const schema = stepSchemas[stepIndex];
    const fieldNames = stepFieldNames[stepIndex];
    const values = getValues();
    const result = schema.safeParse(values);

    clearErrors(fieldNames);

    if (result.success) {
      return true;
    }

    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof OnboardingFormValues | undefined;

      if (field) {
        setError(field, { type: "manual", message: issue.message });
      }
    }

    return false;
  }

  function continueToNextStep() {
    setSetupError(null);

    if (!validateStep(activeStep)) {
      return;
    }

    setActiveStep((step) => Math.min(step + 1, steps.length - 1));
  }

  function goBack() {
    setSetupError(null);
    setActiveStep((step) => Math.max(step - 1, 0));
  }

  const submit = handleSubmit(async () => {
    setSetupError(null);

    for (let stepIndex = 0; stepIndex < stepSchemas.length; stepIndex += 1) {
      if (!validateStep(stepIndex)) {
        setActiveStep(stepIndex);
        return;
      }
    }

    try {
      await onSave(buildSnapshotPayload(getValues()));
    } catch {
      setSetupError("We couldn’t save setup. Your details are still here—please try again.");
    }
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="grid size-10 place-items-center rounded-control bg-safe/10 text-safe">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </div>
        <div>
          <CardTitle>Financial Profile</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Six local steps build the deterministic profile used by purchase checks.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5 lg:grid-cols-[14rem_1fr]" onSubmit={submit} noValidate>
          <StepList activeStep={activeStep} variant="desktop" />
          <div className="grid gap-5">
            <StepList activeStep={activeStep} variant="mobile" />

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
              <section
                aria-labelledby={`onboarding-step-${currentStep.id}`}
                className="grid gap-5 rounded-card border border-border bg-muted/20 p-5"
              >
                <div className="grid gap-2">
                  <p className="text-xs font-semibold uppercase tracking-normal text-primary">
                    Step {activeStep + 1} of {steps.length}
                  </p>
                  <h2
                    id={`onboarding-step-${currentStep.id}`}
                    className="text-2xl font-semibold text-foreground"
                  >
                    {currentStep.title}
                  </h2>
                </div>

                {activeStep === 0 ? (
                  <IncomeStep register={register} errors={errors} />
                ) : null}
                {activeStep === 1 ? (
                  <SavingsStep register={register} errors={errors} currency={currency} />
                ) : null}
                {activeStep === 2 ? (
                  <ExpensesStep
                    register={register}
                    errors={errors}
                    currency={currency}
                    expenseTotal={expenseTotal}
                  />
                ) : null}
                {activeStep === 3 ? <DebtStep register={register} errors={errors} /> : null}
                {activeStep === 4 ? <GoalsStep register={register} /> : null}
                {activeStep === 5 ? (
                  <ReviewStep values={getValues()} currency={currency} expenseTotal={expenseTotal} />
                ) : null}
              </section>

              <div className="hidden rounded-card border border-border bg-surface p-4 shadow-card xl:block">
                <Image
                  src="/illustrations/setup.svg"
                  alt="Person setting up a financial profile"
                  width={320}
                  height={220}
                  loading="eager"
                  className="h-auto w-full"
                />
                <p className="mt-3 text-sm leading-6 text-muted">
                  Your setup stays local and feeds the deterministic SpendGuard rules.
                </p>
              </div>
            </div>

            {setupError ? <InlineNotice tone="error">{setupError}</InlineNotice> : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button type="button" variant="secondary" onClick={goBack} disabled={activeStep === 0}>
                <ArrowLeft aria-hidden="true" className="size-4" />
                Back
              </Button>
              {isLastStep ? (
                <Button
                  type="submit"
                  disabled={!isHydrated || isSubmitting}
                  isLoading={isSubmitting}
                  loadingText="Saving setup..."
                >
                  <CheckCircle2 aria-hidden="true" className="size-4" />
                  Finish Setup
                </Button>
              ) : (
                <Button type="button" onClick={continueToNextStep}>
                  Continue
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function StepList({ activeStep, variant }: { activeStep: number; variant: "desktop" | "mobile" }) {
  return (
    <ol
      aria-label={`${variant} onboarding steps`}
      className={
        variant === "desktop"
          ? "hidden gap-2 lg:grid"
          : "flex gap-2 overflow-x-auto pb-1 lg:hidden"
      }
    >
      {steps.map((step, index) => (
        <li key={`${variant}-${step.id}`} className={variant === "mobile" ? "shrink-0" : undefined}>
          <span
            className={
              index === activeStep
                ? "inline-flex rounded-control bg-primary px-3 py-2 text-sm font-semibold text-white"
                : "inline-flex rounded-control bg-surface px-3 py-2 text-sm font-semibold text-muted ring-1 ring-border"
            }
          >
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function IncomeStep({
  register,
  errors,
}: {
  register: ReturnType<typeof useForm<OnboardingFormValues>>["register"];
  errors: ReturnType<typeof useForm<OnboardingFormValues>>["formState"]["errors"];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor="full-name">Full name</Label>
        <Input id="full-name" autoComplete="name" {...register("fullName")} />
        <FieldError>{errors.fullName?.message}</FieldError>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="currency">Currency</Label>
        <Select id="currency" {...register("currency")}>
          <option value="PHP">PHP</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="JPY">JPY</option>
          <option value="SGD">SGD</option>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="pay-frequency">Pay frequency</Label>
        <Select id="pay-frequency" {...register("payFrequency")}>
          {PAY_FREQUENCIES.map((frequency) => (
            <option key={frequency} value={frequency}>
              {PAY_FREQUENCY_LABELS[frequency]}
            </option>
          ))}
        </Select>
      </div>
      <NumberField
        id="monthly-income"
        label="Monthly income"
        registration={register("monthlyIncome")}
        error={errors.monthlyIncome?.message}
      />
      <NumberField
        id="estimated-variable-expenses"
        label="Estimated variable expenses"
        registration={register("estimatedVariableExpenses")}
        error={errors.estimatedVariableExpenses?.message}
      />
    </div>
  );
}

function SavingsStep({
  register,
  errors,
  currency,
}: {
  register: ReturnType<typeof useForm<OnboardingFormValues>>["register"];
  errors: ReturnType<typeof useForm<OnboardingFormValues>>["formState"]["errors"];
  currency: CurrencyCode;
}) {
  return (
    <div className="grid gap-5">
      <div className="rounded-control border border-primary/20 bg-blue-50 p-4 text-sm text-muted">
        <p className="font-semibold text-primary">Recommended emergency target</p>
        <p className="mt-1">
          Aim for at least three months of core expenses before flexible purchases.
        </p>
      </div>
      <div
        role="group"
        aria-label="Optional savings breakdown"
        className="grid gap-4 sm:grid-cols-2"
      >
        <NumberField
          id="current-savings"
          label="Current savings"
          registration={register("currentSavings")}
          error={errors.currentSavings?.message}
        />
        <NumberField
          id="emergency-target"
          label="Emergency fund target"
          registration={register("emergencyFundTarget")}
          error={errors.emergencyFundTarget?.message}
        />
      </div>
      <p className="text-xs text-muted">
        Savings are stored in {currency}; SpendGuard never sends these values to a server.
      </p>
    </div>
  );
}

function ExpensesStep({
  register,
  errors,
  currency,
  expenseTotal,
}: {
  register: ReturnType<typeof useForm<OnboardingFormValues>>["register"];
  errors: ReturnType<typeof useForm<OnboardingFormValues>>["formState"]["errors"];
  currency: CurrencyCode;
  expenseTotal: number;
}) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberField
          id="housing"
          label="Housing"
          registration={register("housingExpense")}
          error={errors.housingExpense?.message}
        />
        <NumberField
          id="utilities"
          label="Utilities and internet"
          registration={register("utilitiesExpense")}
          error={errors.utilitiesExpense?.message}
        />
        <NumberField
          id="food-transport"
          label="Food and transport"
          registration={register("foodTransportExpense")}
          error={errors.foodTransportExpense?.message}
        />
      </div>
      <p className="rounded-control border border-border bg-surface p-3 text-sm font-semibold text-foreground">
        Expense category sum: {formatCurrency(expenseTotal, currency)}
      </p>
    </div>
  );
}

function DebtStep({
  register,
  errors,
}: {
  register: ReturnType<typeof useForm<OnboardingFormValues>>["register"];
  errors: ReturnType<typeof useForm<OnboardingFormValues>>["formState"]["errors"];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="grid gap-2">
        <Label htmlFor="debt-name">Debt name</Label>
        <Input id="debt-name" {...register("debtLabel")} />
      </div>
      <NumberField
        id="debt-balance"
        label="Outstanding balance"
        registration={register("debtBalance")}
        error={errors.debtBalance?.message}
      />
      <NumberField
        id="debt-minimum"
        label="Minimum monthly payment"
        registration={register("debtMinimumPayment")}
        error={errors.debtMinimumPayment?.message}
      />
    </div>
  );
}

function GoalsStep({
  register,
}: {
  register: ReturnType<typeof useForm<OnboardingFormValues>>["register"];
}) {
  const options: Array<{ name: keyof OnboardingFormValues; label: string }> = [
    { name: "goalEmergency", label: "Emergency buffer" },
    { name: "goalPhone", label: "Phone upgrade fund" },
    { name: "goalTravel", label: "Travel fund" },
    { name: "goalDebtPayoff", label: "Debt payoff buffer" },
  ];

  return (
    <fieldset className="grid gap-3" aria-label="Goal options">
      <legend className="sr-only">Goal options</legend>
      {options.map((option) => (
        <label
          key={option.name}
          className="flex items-center gap-3 rounded-control border border-border bg-surface p-3 text-sm font-semibold text-foreground"
        >
          <input type="checkbox" className="size-4 accent-primary" {...register(option.name)} />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}

function ReviewStep({
  values,
  currency,
  expenseTotal,
}: {
  values: OnboardingFormValues;
  currency: CurrencyCode;
  expenseTotal: number;
}) {
  return (
    <div className="grid gap-4 text-sm">
      <ReviewRow label="Full name" value={values.fullName.trim() || "Not provided"} />
      <ReviewRow label="Pay frequency" value={formatPayFrequency(values.payFrequency)} />
      <ReviewRow label="Monthly income" value={formatCurrency(toNumber(values.monthlyIncome), currency)} />
      <ReviewRow
        label="Estimated variable expenses"
        value={formatCurrency(toNumber(values.estimatedVariableExpenses), currency)}
      />
      <ReviewRow label="Current savings" value={formatCurrency(toNumber(values.currentSavings), currency)} />
      <ReviewRow label="Emergency target" value={formatCurrency(toNumber(values.emergencyFundTarget), currency)} />
      <ReviewRow label="Expense category sum" value={formatCurrency(expenseTotal, currency)} />
      <ReviewRow label="Debt minimum" value={formatCurrency(toNumber(values.debtMinimumPayment), currency)} />
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-control border border-border bg-surface p-3">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

function NumberField({
  id,
  label,
  registration,
  error,
}: {
  id: string;
  label: string;
  registration: ReturnType<ReturnType<typeof useForm<OnboardingFormValues>>["register"]>;
  error?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" min="0" {...registration} />
      <FieldError>{error}</FieldError>
    </div>
  );
}

function buildDefaultValues(snapshot: FinancialSnapshot): OnboardingFormValues {
  const fixedExpenses = snapshot.expenses.reduce((total, expense) => total + expense.amount, 0);
  const debt = snapshot.debts[0];

  return {
    currency: snapshot.profile.currency,
    fullName: snapshot.profile.fullName ?? "",
    payFrequency: snapshot.profile.payFrequency ?? "monthly",
    monthlyIncome: snapshot.profile.monthlyIncome,
    estimatedVariableExpenses: snapshot.profile.estimatedVariableExpenses ?? 0,
    currentSavings: snapshot.profile.currentSavings,
    emergencyFundTarget: snapshot.profile.emergencyFundTarget,
    housingExpense: fixedExpenses,
    utilitiesExpense: 0,
    foodTransportExpense: 0,
    debtLabel: debt?.label ?? "Credit card",
    debtBalance: debt?.outstandingBalance ?? 0,
    debtMinimumPayment: debt?.minimumPayment ?? 0,
    goalEmergency: true,
    goalPhone: false,
    goalTravel: false,
    goalDebtPayoff: false,
  };
}

function buildSnapshotPayload(values: OnboardingFormValues): FinancialSnapshot {
  const profile = {
    currency: values.currency,
    fullName: values.fullName.trim() || undefined,
    payFrequency: values.payFrequency,
    monthlyIncome: toNumber(values.monthlyIncome),
    estimatedVariableExpenses: toNumber(values.estimatedVariableExpenses),
    currentSavings: toNumber(values.currentSavings),
    emergencyFundTarget: toNumber(values.emergencyFundTarget),
  };
  const expenses = [
    { label: "Housing", amount: toNumber(values.housingExpense), dueDay: 1 },
    {
      label: "Utilities and internet",
      amount: toNumber(values.utilitiesExpense),
      dueDay: 15,
    },
    {
      label: "Food and transport",
      amount: toNumber(values.foodTransportExpense),
      dueDay: 20,
    },
  ]
    .filter((expense) => expense.amount > 0)
    .map((expense) => ({
      id: createId("expense"),
      label: expense.label,
      amount: expense.amount,
      dueDay: expense.dueDay,
      isRecurring: true,
    }));
  const debts =
    toNumber(values.debtBalance) > 0 || toNumber(values.debtMinimumPayment) > 0
      ? [
          {
            id: createId("debt"),
            label: values.debtLabel.trim() || "Debt",
            outstandingBalance: toNumber(values.debtBalance),
            minimumPayment: toNumber(values.debtMinimumPayment),
            dueDay: 15,
            interestRate: 0.24,
          },
        ]
      : [];

  return {
    profile,
    expenses,
    debts,
    goals: buildGoals(values, profile),
  };
}

function buildGoals(
  values: OnboardingFormValues,
  profile: FinancialSnapshot["profile"]
): FinancialSnapshot["goals"] {
  const goalDefinitions: Array<{
    enabled: boolean;
    label: string;
    targetAmount: number;
    savedAmount: number;
    monthlyContribution: number;
    priority: GoalPriority;
  }> = [
    {
      enabled: values.goalEmergency,
      label: "Emergency buffer",
      targetAmount: profile.emergencyFundTarget,
      savedAmount: profile.currentSavings,
      monthlyContribution: Math.max(1000, Math.ceil(profile.emergencyFundTarget / 18 / 500) * 500),
      priority: "high",
    },
    {
      enabled: values.goalPhone,
      label: "Phone upgrade fund",
      targetAmount: 25000,
      savedAmount: 0,
      monthlyContribution: 5000,
      priority: "medium",
    },
    {
      enabled: values.goalTravel,
      label: "Travel fund",
      targetAmount: 50000,
      savedAmount: 0,
      monthlyContribution: 7500,
      priority: "medium",
    },
    {
      enabled: values.goalDebtPayoff,
      label: "Debt payoff buffer",
      targetAmount: toNumber(values.debtBalance),
      savedAmount: 0,
      monthlyContribution: toNumber(values.debtMinimumPayment),
      priority: "high",
    },
  ];

  return goalDefinitions
    .filter((goal) => goal.enabled && goal.targetAmount > 0)
    .map((goal) => ({
      id: createId("goal"),
      label: goal.label,
      targetAmount: goal.targetAmount,
      savedAmount: goal.savedAmount,
      monthlyContribution: goal.monthlyContribution,
      targetDate: defaultTargetDate,
      priority: goal.priority,
    }));
}

function toNumber(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatPayFrequency(value: PayFrequency) {
  return PAY_FREQUENCY_LABELS[value];
}
