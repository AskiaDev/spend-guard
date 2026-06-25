import { z } from "zod";
import { PAY_FREQUENCIES } from "@/types/finance";

const money = z.coerce.number().min(0, "Enter a positive amount.");
const dueDay = z.coerce.number().int().min(1).max(31);
const nonBlankArrayItem = z.string().trim().min(1);
const emptyToUndefined = (value: unknown) =>
  value === "" || value === null || value === undefined ? undefined : value;
const optionalInstallmentMonths = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().min(1).max(60).optional()
);
const optionalMoney = z.preprocess(emptyToUndefined, money.optional());
const optionalTrimmedText = (maxLength: number, message: string) =>
  z.preprocess(
    (value) => {
      if (value === null || value === undefined || value === "") {
        return undefined;
      }

      return typeof value === "string" ? value.trim() : value;
    },
    z.string().min(1, message).max(maxLength).optional()
  );
const optionalRequiredWhenPresentText = (maxLength: number, message: string) =>
  z.preprocess(
    (value) => {
      if (value === null || value === undefined) {
        return undefined;
      }

      return typeof value === "string" ? value.trim() : value;
    },
    z.string().min(1, message).max(maxLength).optional()
  );
const optionalBoolean = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return value;
}, z.boolean().optional());

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

export const payFrequencySchema = z
  .enum(PAY_FREQUENCIES)
  .default("monthly");

export const financialProfileSchema = z.object({
  currency: z.enum(["PHP", "USD", "EUR", "JPY", "SGD"]).default("PHP"),
  monthlyIncome: money,
  currentSavings: money,
  emergencyBuffer: money.default(0),
  cooldownPreference: z.enum(["light", "balanced", "strict"]).default("balanced"),
  intent: z.array(nonBlankArrayItem).default([]),
  spendingPainPoints: z.array(nonBlankArrayItem).default([]),
  emergencyFundTarget: money.default(0),
  fullName: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(120, "Keep the name under 120 characters.").optional()
  ),
  payFrequency: payFrequencySchema,
  estimatedVariableExpenses: money.default(0),
});

export const expenseSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, "Name this expense."),
  amount: money,
  dueDay,
  isRecurring: z.coerce.boolean().default(true),
});

export const debtSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, "Name this debt."),
  outstandingBalance: money,
  minimumPayment: money,
  dueDay,
  interestRate: z.coerce.number().min(0).max(1).optional(),
});

export const goalSchema = z
  .object({
    id: z.string().optional(),
    label: z.string().min(1, "Name this goal."),
    targetAmount: money.refine((value) => value > 0, "Enter a target amount above zero."),
    savedAmount: money,
    monthlyContribution: money.refine(
      (value) => value > 0,
      "Enter a monthly contribution above zero."
    ),
    targetDate: z.preprocess(
      emptyToUndefined,
      z.string().refine(isIsoDate, "Enter a valid target date.").optional()
    ),
    priority: z.enum(["high", "medium", "low"]).default("medium"),
  })
  .superRefine((value, context) => {
    if (value.savedAmount > value.targetAmount) {
      context.addIssue({
        code: "custom",
        path: ["savedAmount"],
        message: "Saved amount cannot exceed the target.",
      });
    }
  });

export const purchaseInputSchema = z
  .object({
    itemName: z.string().min(1, "Name the purchase."),
    amount: money.refine((value) => value > 0, "Enter a purchase amount."),
    category: optionalRequiredWhenPresentText(60, "Choose a category."),
    saleDeadline: z.preprocess(
      emptyToUndefined,
      z.string().refine(isIsoDate, "Enter a valid sale deadline.").optional()
    ),
    location: optionalTrimmedText(120, "Enter a valid location."),
    notes: optionalTrimmedText(1000, "Keep notes under 1000 characters."),
    urgency: z.enum(["need_now", "need_this_month", "can_wait", "want"]),
    paymentMethod: z.enum(["cash", "installment", "credit_card", "loan", "bnpl"]),
    downPayment: optionalMoney,
    installmentMonths: optionalInstallmentMonths,
    monthlyPayment: optionalMoney,
    isIncomeGenerating: optionalBoolean,
    currentAlternativeStillWorks: optionalBoolean,
  })
  .superRefine((value, context) => {
    if (
      ["installment", "loan", "bnpl"].includes(value.paymentMethod) &&
      !value.monthlyPayment
    ) {
      context.addIssue({
        code: "custom",
        path: ["monthlyPayment"],
        message: "Enter the monthly payment for this payment method.",
      });
    }
  });

export type FinancialProfileInput = z.infer<typeof financialProfileSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type DebtInput = z.infer<typeof debtSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
export type PurchaseFormInput = z.infer<typeof purchaseInputSchema>;
