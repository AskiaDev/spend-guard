"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StepProgress } from "@/components/finance/step-progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input, Label, Textarea } from "@/components/ui/form-fields";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PaymentMethod, PurchaseInput, PurchaseUrgency } from "@/types/finance";
import type * as React from "react";

interface PurchaseCheckerWizardProps {
  onRunCheck: (purchase: PurchaseInput) => Promise<unknown>;
}

type IncomeGenerationChoice = "yes" | "no" | "";
type AlternativeWorksChoice = "yes" | "no" | "";

interface PurchaseWizardValues {
  itemName: string;
  amount: number;
  category: string;
  saleDeadline: string;
  location: string;
  reason: string;
  notes: string;
  urgency: PurchaseUrgency;
  alternative: string;
  currentAlternativeWorks: AlternativeWorksChoice;
  incomeGeneration: IncomeGenerationChoice;
  paymentMethod: PaymentMethod;
  downPayment?: number;
  installmentMonths?: number;
  monthlyPayment?: number;
}

type PurchaseWizardErrors = Partial<Record<keyof PurchaseWizardValues, string>>;
type SubmitPhase = "idle" | "validating" | "saving" | "opening";

const steps = [{ label: "Product details" }, { label: "Motivation" }, { label: "Payment" }];

const financedPaymentMethods: PaymentMethod[] = ["installment", "loan", "bnpl"];

const errorIds: Record<keyof PurchaseWizardValues, string> = {
  itemName: "purchase-item-name-error",
  amount: "purchase-amount-error",
  category: "purchase-category-error",
  saleDeadline: "purchase-sale-deadline-error",
  location: "purchase-location-error",
  reason: "purchase-reason-error",
  notes: "purchase-notes-error",
  urgency: "purchase-urgency-error",
  alternative: "purchase-alternative-error",
  currentAlternativeWorks: "purchase-current-alternative-error",
  incomeGeneration: "purchase-income-generation-error",
  paymentMethod: "purchase-payment-method-error",
  downPayment: "purchase-down-payment-error",
  installmentMonths: "purchase-installment-months-error",
  monthlyPayment: "purchase-monthly-payment-error",
};

const paymentOptions: { value: PaymentMethod; label: string; description: string }[] = [
  {
    value: "cash",
    label: "Cash",
    description: "Pay in full today.",
  },
  {
    value: "installment",
    label: "Installment",
    description: "Split the purchase into fixed payments.",
  },
  {
    value: "credit_card",
    label: "Credit card",
    description: "Charge the full amount to a card.",
  },
  {
    value: "loan",
    label: "Loan",
    description: "Use a personal loan or financing plan.",
  },
  {
    value: "bnpl",
    label: "Buy now, pay later",
    description: "Use a pay-later plan.",
  },
];

const failureMessage =
  "We couldn’t analyze this purchase yet. Your details are still here—please try again.";
const submitStatusLabels: Record<Exclude<SubmitPhase, "idle">, string> = {
  validating: "Validating details...",
  saving: "Saving check...",
  opening: "Opening result...",
};

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function positiveNumberOrUndefined(value: unknown): number | undefined {
  return isPositiveNumber(value) ? value : undefined;
}

function nonNegativeNumberOrUndefined(value: unknown): number | undefined {
  return isNonNegativeNumber(value) ? value : undefined;
}

function trimmedStringOrUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isFinancedPaymentMethod(paymentMethod: PaymentMethod) {
  return financedPaymentMethods.includes(paymentMethod);
}

function requiresTerm(paymentMethod: PaymentMethod) {
  return paymentMethod === "installment";
}

function buildPurchaseInput(values: PurchaseWizardValues): PurchaseInput {
  const purchase: PurchaseInput = {
    itemName: values.itemName.trim(),
    amount: values.amount,
    category: values.category,
    urgency: values.urgency,
    paymentMethod: values.paymentMethod,
    currentAlternativeStillWorks: values.currentAlternativeWorks === "yes",
    isIncomeGenerating: values.incomeGeneration === "yes",
  };
  const saleDeadline = trimmedStringOrUndefined(values.saleDeadline);
  const location = trimmedStringOrUndefined(values.location);
  const notes = trimmedStringOrUndefined(values.notes);

  if (saleDeadline) {
    purchase.saleDeadline = saleDeadline;
  }

  if (location) {
    purchase.location = location;
  }

  if (notes) {
    purchase.notes = notes;
  }

  if (isFinancedPaymentMethod(values.paymentMethod)) {
    const downPayment = nonNegativeNumberOrUndefined(values.downPayment);
    const installmentMonths = positiveNumberOrUndefined(values.installmentMonths);
    const monthlyPayment = positiveNumberOrUndefined(values.monthlyPayment);

    if (downPayment) {
      purchase.downPayment = downPayment;
    }

    if (installmentMonths) {
      purchase.installmentMonths = installmentMonths;
    }

    if (monthlyPayment) {
      purchase.monthlyPayment = monthlyPayment;
    }
  }

  return purchase;
}

export function PurchaseCheckerWizard({ onRunCheck }: PurchaseCheckerWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<PurchaseWizardErrors>({});
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>("idle");
  const submitInFlightRef = useRef(false);

  const {
    control,
    getValues,
    handleSubmit,
    register,
    watch,
    formState: { isSubmitting },
  } = useForm<PurchaseWizardValues>({
    defaultValues: {
      itemName: "",
      amount: Number.NaN,
      category: "",
      saleDeadline: "",
      location: "",
      reason: "",
      notes: "",
      urgency: "want",
      alternative: "",
      currentAlternativeWorks: "",
      incomeGeneration: "",
      paymentMethod: "cash",
      downPayment: undefined,
      installmentMonths: undefined,
      monthlyPayment: undefined,
    },
    shouldUnregister: false,
  });

  const paymentMethod = watch("paymentMethod");
  const showPaymentSchedule = isFinancedPaymentMethod(paymentMethod);
  const submitStatus =
    submitPhase === "idle" ? null : submitStatusLabels[submitPhase];
  const isSubmitBusy = isSubmitting || submitPhase !== "idle";
  const submitLoadingText = submitStatus ?? "Validating details...";

  useEffect(() => {
    if (currentStep === 3) {
      router.prefetch("/checker/result");
    }
  }, [currentStep, router]);

  function validateStepOne() {
    const values = getValues();
    const nextErrors: PurchaseWizardErrors = {};

    if (!values.itemName.trim()) {
      nextErrors.itemName = "Name the product.";
    }

    if (!isPositiveNumber(values.amount)) {
      nextErrors.amount = "Enter a positive price.";
    }

    if (!values.category) {
      nextErrors.category = "Choose a category.";
    }

    if (values.saleDeadline && !isIsoDate(values.saleDeadline)) {
      nextErrors.saleDeadline = "Enter a valid sale deadline.";
    }

    if (values.location.trim().length > 120) {
      nextErrors.location = "Keep the location under 120 characters.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateStepTwo() {
    const values = getValues();
    const nextErrors: PurchaseWizardErrors = {};

    if (!values.reason.trim()) {
      nextErrors.reason = "Add why you are considering this purchase.";
    }

    if (values.notes.trim().length > 1000) {
      nextErrors.notes = "Keep notes under 1000 characters.";
    }

    if (!values.alternative.trim()) {
      nextErrors.alternative = "Add the best alternative.";
    }

    if (!values.currentAlternativeWorks) {
      nextErrors.currentAlternativeWorks = "Choose whether the current alternative still works.";
    }

    if (!values.incomeGeneration) {
      nextErrors.incomeGeneration = "Choose whether this can generate income.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateStepThree() {
    const values = getValues();
    const nextErrors: PurchaseWizardErrors = {};

    if (isFinancedPaymentMethod(values.paymentMethod)) {
      if (
        values.downPayment !== undefined &&
        !Number.isNaN(values.downPayment) &&
        !isNonNegativeNumber(values.downPayment)
      ) {
        nextErrors.downPayment = "Enter a non-negative down payment.";
      }

      if (!isPositiveNumber(values.monthlyPayment)) {
        nextErrors.monthlyPayment = "Enter the monthly payment for this payment method.";
      }

      if (requiresTerm(values.paymentMethod) && !isPositiveNumber(values.installmentMonths)) {
        nextErrors.installmentMonths = "Enter the payment term in months.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function continueFromStepOne() {
    setAnalysisError(null);
    setDraftMessage(null);

    if (validateStepOne()) {
      setCurrentStep(2);
    }
  }

  function continueFromStepTwo() {
    setAnalysisError(null);
    setDraftMessage(null);

    if (validateStepTwo()) {
      setCurrentStep(3);
    }
  }

  function goBack() {
    setAnalysisError(null);
    setDraftMessage(null);
    setErrors({});
    setCurrentStep((step) => Math.max(1, step - 1));
  }

  async function submit(values: PurchaseWizardValues) {
    if (currentStep === 1) {
      continueFromStepOne();
      return;
    }

    if (currentStep === 2) {
      continueFromStepTwo();
      return;
    }

    setDraftMessage(null);
    setAnalysisError(null);

    if (submitInFlightRef.current) {
      return;
    }

    submitInFlightRef.current = true;
    setSubmitPhase("validating");

    if (!validateStepThree()) {
      submitInFlightRef.current = false;
      setSubmitPhase("idle");
      return;
    }

    try {
      setSubmitPhase("saving");
      await onRunCheck(buildPurchaseInput(values));
      setSubmitPhase("opening");
      router.push("/checker/result");
    } catch {
      submitInFlightRef.current = false;
      setSubmitPhase("idle");
      setAnalysisError(failureMessage);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="grid gap-4">
          <div>
            <CardTitle>Purchase checker</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Answer a few questions, then run a focused affordability check.
            </p>
          </div>
          <StepProgress steps={steps} currentStep={currentStep} />
        </div>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5" onSubmit={handleSubmit(submit)} noValidate>
          {currentStep === 1 ? (
            <section className="grid gap-4" aria-labelledby="purchase-checker-step-one">
              <div>
                <h2 id="purchase-checker-step-one" className="text-lg font-semibold text-foreground">
                  Product details
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start with the basic purchase facts so the check has a stable input.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="purchase-product-name">Product name</Label>
                <Input
                  id="purchase-product-name"
                  aria-describedby={errors.itemName ? errorIds.itemName : undefined}
                  aria-invalid={errors.itemName ? "true" : undefined}
                  placeholder="iPhone Pro Max 1TB"
                  {...register("itemName")}
                />
                <FieldErrorText id={errorIds.itemName}>{errors.itemName}</FieldErrorText>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="purchase-price">Price</Label>
                  <Input
                    id="purchase-price"
                    aria-describedby={errors.amount ? errorIds.amount : undefined}
                    aria-invalid={errors.amount ? "true" : undefined}
                    min="0"
                    placeholder="170000"
                    type="number"
                    {...register("amount", { valueAsNumber: true })}
                  />
                  <FieldErrorText id={errorIds.amount}>{errors.amount}</FieldErrorText>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="purchase-category">Category</Label>
                  <Controller
                    control={control}
                    name="category"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          id="purchase-category"
                          className="w-full"
                          aria-describedby={errors.category ? errorIds.category : undefined}
                          aria-invalid={errors.category ? "true" : undefined}
                          onBlur={field.onBlur}
                        >
                          <SelectValue placeholder="Choose a category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="electronics">Electronics</SelectItem>
                          <SelectItem value="appliance">Appliance</SelectItem>
                          <SelectItem value="travel">Travel</SelectItem>
                          <SelectItem value="home">Home</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldErrorText id={errorIds.category}>{errors.category}</FieldErrorText>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="purchase-sale-deadline">Sale deadline</Label>
                  <Controller
                    control={control}
                    name="saleDeadline"
                    render={({ field }) => (
                      <DatePicker
                        id="purchase-sale-deadline"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        ariaInvalid={errors.saleDeadline ? true : undefined}
                        ariaDescribedBy={
                          errors.saleDeadline ? errorIds.saleDeadline : undefined
                        }
                      />
                    )}
                  />
                  <FieldErrorText id={errorIds.saleDeadline}>
                    {errors.saleDeadline}
                  </FieldErrorText>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="purchase-location">Location</Label>
                  <Input
                    id="purchase-location"
                    aria-describedby={errors.location ? errorIds.location : undefined}
                    aria-invalid={errors.location ? "true" : undefined}
                    placeholder="Makati showroom"
                    {...register("location")}
                  />
                  <FieldErrorText id={errorIds.location}>{errors.location}</FieldErrorText>
                </div>
              </div>
            </section>
          ) : null}

          {currentStep === 2 ? (
            <section className="grid gap-4" aria-labelledby="purchase-checker-step-two">
              <div>
                <h2 id="purchase-checker-step-two" className="text-lg font-semibold text-foreground">
                  Motivation
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Capture the why, timing, and fallback before choosing how to pay.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="purchase-reason">Reason for purchase</Label>
                <Textarea
                  id="purchase-reason"
                  aria-describedby={errors.reason ? errorIds.reason : undefined}
                  aria-invalid={errors.reason ? "true" : undefined}
                  placeholder="work and family photos"
                  {...register("reason")}
                />
                <FieldErrorText id={errorIds.reason}>{errors.reason}</FieldErrorText>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="purchase-notes">Notes</Label>
                <Textarea
                  id="purchase-notes"
                  aria-describedby={errors.notes ? errorIds.notes : undefined}
                  aria-invalid={errors.notes ? "true" : undefined}
                  placeholder="delivery, warranty, discount details"
                  {...register("notes")}
                />
                <FieldErrorText id={errorIds.notes}>{errors.notes}</FieldErrorText>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="purchase-urgency">Urgency</Label>
                  <Controller
                    control={control}
                    name="urgency"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="purchase-urgency" className="w-full" onBlur={field.onBlur}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="need_now">Need now</SelectItem>
                          <SelectItem value="need_this_month">Need this month</SelectItem>
                          <SelectItem value="can_wait">Can wait</SelectItem>
                          <SelectItem value="want">Want</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="purchase-alternative">Best alternative</Label>
                  <Textarea
                    id="purchase-alternative"
                    aria-describedby={errors.alternative ? errorIds.alternative : undefined}
                    aria-invalid={errors.alternative ? "true" : undefined}
                    placeholder="keep current phone"
                    {...register("alternative")}
                  />
                  <FieldErrorText id={errorIds.alternative}>{errors.alternative}</FieldErrorText>
                </div>
              </div>

              <fieldset
                aria-describedby={
                  errors.currentAlternativeWorks ? errorIds.currentAlternativeWorks : undefined
                }
                aria-invalid={errors.currentAlternativeWorks ? "true" : undefined}
                className="grid gap-3"
              >
                <legend className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                  Current alternative
                </legend>
                <Controller
                  control={control}
                  name="currentAlternativeWorks"
                  render={({ field }) => (
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid gap-3 md:grid-cols-2"
                    >
                      <RadioCard
                        description="The current option can still cover the need."
                        label="Yes, it still works"
                        value="yes"
                      />
                      <RadioCard
                        description="The current option no longer covers the need."
                        label="No, it does not work"
                        value="no"
                      />
                    </RadioGroup>
                  )}
                />
                <FieldErrorText id={errorIds.currentAlternativeWorks}>
                  {errors.currentAlternativeWorks}
                </FieldErrorText>
              </fieldset>

              <fieldset
                aria-describedby={
                  errors.incomeGeneration ? errorIds.incomeGeneration : undefined
                }
                aria-invalid={errors.incomeGeneration ? "true" : undefined}
                className="grid gap-3"
              >
                <legend className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                  Income generation
                </legend>
                <Controller
                  control={control}
                  name="incomeGeneration"
                  render={({ field }) => (
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid gap-3 md:grid-cols-2"
                    >
                      <RadioCard
                        description="This purchase may directly support earning money."
                        label="Yes, this can generate income"
                        value="yes"
                      />
                      <RadioCard
                        description="This is mainly for personal use or quality of life."
                        label="No, this is personal use"
                        value="no"
                      />
                    </RadioGroup>
                  )}
                />
                <FieldErrorText id={errorIds.incomeGeneration}>
                  {errors.incomeGeneration}
                </FieldErrorText>
              </fieldset>
            </section>
          ) : null}

          {currentStep === 3 ? (
            <section className="grid gap-4" aria-labelledby="purchase-checker-step-three">
              <div>
                <h2 id="purchase-checker-step-three" className="text-lg font-semibold text-foreground">
                  Payment
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose the payment method and add any recurring payment details.
                </p>
              </div>

              <div className="grid gap-4 rounded-control border border-primary/15 bg-primary/5 p-4 md:grid-cols-[auto_1fr] md:items-center">
                <Image
                  src="/illustrations/payment-info.svg"
                  alt="Person entering payment details"
                  width={220}
                  height={180}
                  loading="eager"
                  className="hidden h-auto w-36 md:block"
                />
                <p className="text-sm leading-6 text-muted-foreground">
                  Payment method changes the real monthly risk. Add installment, loan, or
                  buy-now-pay-later amounts before SpendGuard analyzes the purchase.
                </p>
              </div>

              <fieldset className="grid gap-3">
                <legend className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                  Payment method
                </legend>
                <Controller
                  control={control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid gap-3 lg:grid-cols-5 md:grid-cols-2"
                    >
                      {paymentOptions.map((option) => (
                        <RadioCard
                          key={option.value}
                          description={option.description}
                          label={option.label}
                          value={option.value}
                        />
                      ))}
                    </RadioGroup>
                  )}
                />
              </fieldset>

              {showPaymentSchedule ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="purchase-down-payment">Down payment</Label>
                    <Input
                      id="purchase-down-payment"
                      aria-describedby={errors.downPayment ? errorIds.downPayment : undefined}
                      aria-invalid={errors.downPayment ? "true" : undefined}
                      min="0"
                      placeholder="26000"
                      type="number"
                      {...register("downPayment", { valueAsNumber: true })}
                    />
                    <FieldErrorText id={errorIds.downPayment}>
                      {errors.downPayment}
                    </FieldErrorText>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="purchase-monthly-payment">Monthly payment</Label>
                    <Input
                      id="purchase-monthly-payment"
                      aria-describedby={errors.monthlyPayment ? errorIds.monthlyPayment : undefined}
                      aria-invalid={errors.monthlyPayment ? "true" : undefined}
                      min="0"
                      placeholder="6000"
                      type="number"
                      {...register("monthlyPayment", { valueAsNumber: true })}
                    />
                    <FieldErrorText id={errorIds.monthlyPayment}>
                      {errors.monthlyPayment}
                    </FieldErrorText>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="purchase-installment-months">Term (months)</Label>
                    <Input
                      id="purchase-installment-months"
                      aria-describedby={
                        errors.installmentMonths ? errorIds.installmentMonths : undefined
                      }
                      aria-invalid={errors.installmentMonths ? "true" : undefined}
                      min="1"
                      placeholder="24"
                      type="number"
                      {...register("installmentMonths", { valueAsNumber: true })}
                    />
                    <FieldErrorText id={errorIds.installmentMonths}>
                      {errors.installmentMonths}
                    </FieldErrorText>
                  </div>
                </div>
              ) : null}

              {analysisError ? (
                <p
                  className="rounded-control border border-risk/30 bg-risk/10 px-3 py-2 text-sm font-medium text-risk"
                  role="alert"
                >
                  {analysisError}
                </p>
              ) : null}

              {draftMessage ? (
                <p
                  aria-live="polite"
                  className="rounded-control border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
                  role="status"
                >
                  {draftMessage}
                </p>
              ) : null}

              {submitStatus ? (
                <p
                  aria-live="polite"
                  className="rounded-control border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-medium text-primary"
                  role="status"
                >
                  {submitStatus}
                </p>
              ) : null}
            </section>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              {currentStep > 1 ? (
                <Button type="button" variant="ghost" onClick={goBack}>
                  Back
                </Button>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {currentStep === 3 ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setAnalysisError(null);
                    setDraftMessage("Draft saved in this form until you leave the page.");
                  }}
                >
                  Save Draft
                </Button>
              ) : null}

              {currentStep === 1 ? (
                <Button type="button" onClick={continueFromStepOne}>
                  Continue
                </Button>
              ) : null}

              {currentStep === 2 ? (
                <Button type="button" onClick={continueFromStepTwo}>
                  Continue
                </Button>
              ) : null}

              {currentStep === 3 ? (
                <Button
                  type="submit"
                  disabled={isSubmitBusy}
                  isLoading={isSubmitBusy}
                  loadingText={submitLoadingText}
                >
                  Analyze Purchase
                </Button>
              ) : null}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function FieldErrorText({ children, id }: { children?: React.ReactNode; id: string }) {
  if (!children) {
    return null;
  }

  return (
    <p id={id} className="text-xs font-medium text-risk">
      {children}
    </p>
  );
}

interface RadioCardProps {
  description: string;
  label: string;
  value: string;
}

function RadioCard({ description, label, value }: RadioCardProps) {
  return (
    <label className="grid cursor-pointer gap-2 rounded-control border border-input bg-card/40 p-3 text-sm shadow-sm transition hover:border-primary/60 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
      <span className="flex items-center gap-2 font-semibold text-foreground">
        <RadioGroupItem value={value} aria-label={label} />
        {label}
      </span>
      <span className="text-xs leading-5 text-muted-foreground">{description}</span>
    </label>
  );
}
