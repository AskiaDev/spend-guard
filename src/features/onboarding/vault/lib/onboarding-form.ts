import type { CurrencyCode, GoalPriority, PayFrequency } from "@/types/finance";

export interface ExpenseRow { label: string; amount: string; dueDay: string; isRecurring: boolean }
export interface DebtRow { label: string; outstandingBalance: string; minimumPayment: string; dueDay: string; interestRate: string }
export interface GoalRow { label: string; targetAmount: string; savedAmount: string; monthlyContribution: string; targetDate: string; priority: GoalPriority }

export interface OnboardingFormValues {
  fullName: string;
  currency: CurrencyCode;
  payFrequency: PayFrequency;
  monthlyIncome: string;
  estimatedVariableExpenses: string;
  currentSavings: string;
  emergencyFundTarget: string;
  expenses: ExpenseRow[];
  debts: DebtRow[];
  goals: GoalRow[];
}

export const emptyExpenseRow = (): ExpenseRow => ({ label: "", amount: "", dueDay: "1", isRecurring: true });
export const emptyDebtRow = (): DebtRow => ({ label: "", outstandingBalance: "", minimumPayment: "", dueDay: "1", interestRate: "" });
export const emptyGoalRow = (): GoalRow => ({ label: "", targetAmount: "", savedAmount: "", monthlyContribution: "", targetDate: "", priority: "medium" });

const hasLabel = (row: { label: string }) => row.label.trim() !== "";

export function buildOnboardingPayload(values: OnboardingFormValues) {
  return {
    profile: {
      currency: values.currency,
      fullName: values.fullName,
      payFrequency: values.payFrequency,
      monthlyIncome: values.monthlyIncome,
      estimatedVariableExpenses: values.estimatedVariableExpenses,
      currentSavings: values.currentSavings,
      emergencyFundTarget: values.emergencyFundTarget,
    },
    expenses: values.expenses.filter(hasLabel).map((e) => ({
      label: e.label,
      amount: e.amount,
      dueDay: e.dueDay,
      isRecurring: e.isRecurring,
    })),
    debts: values.debts.filter(hasLabel).map((d) => ({
      label: d.label,
      outstandingBalance: d.outstandingBalance,
      minimumPayment: d.minimumPayment,
      dueDay: d.dueDay,
      interestRate: d.interestRate === "" ? undefined : d.interestRate,
    })),
    goals: values.goals.filter(hasLabel).map((g) => ({
      label: g.label,
      targetAmount: g.targetAmount,
      savedAmount: g.savedAmount,
      monthlyContribution: g.monthlyContribution,
      targetDate: g.targetDate === "" ? undefined : g.targetDate,
      priority: g.priority,
    })),
  };
}
