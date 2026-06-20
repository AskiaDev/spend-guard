import { z } from "zod";

const money = z.coerce.number().min(0, "Enter a positive amount.");
const dueDay = z.coerce.number().int().min(1).max(31);
const emptyToUndefined = (value: unknown) =>
  value === "" || value === null || value === undefined ? undefined : value;
const optionalInstallmentMonths = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().min(1).max(60).optional()
);
const optionalMoney = z.preprocess(emptyToUndefined, money.optional());

export const financialProfileSchema = z.object({
  currency: z.enum(["PHP", "USD", "EUR", "JPY", "SGD"]).default("PHP"),
  monthlyIncome: money,
  currentSavings: money,
  emergencyFundTarget: money,
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

export const goalSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, "Name this goal."),
  targetAmount: money,
  savedAmount: money,
  monthlyContribution: money,
  targetDate: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
});

export const purchaseInputSchema = z
  .object({
    itemName: z.string().min(1, "Name the purchase."),
    amount: money.refine((value) => value > 0, "Enter a purchase amount."),
    urgency: z.enum(["need_now", "need_this_month", "can_wait", "want"]),
    paymentMethod: z.enum(["cash", "installment", "credit_card", "loan", "bnpl"]),
    installmentMonths: optionalInstallmentMonths,
    monthlyPayment: optionalMoney,
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
