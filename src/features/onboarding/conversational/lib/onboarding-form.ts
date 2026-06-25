import type {
  CooldownPreference,
  CurrencyCode,
  FinancialSnapshot,
  GoalPriority,
  PayFrequency,
} from "@/types/finance";

export interface ExpenseRow {
  label: string;
  amount: string;
  dueDay: string;
  isRecurring: boolean;
}

export interface DebtRow {
  label: string;
  outstandingBalance: string;
  minimumPayment: string;
  dueDay: string;
  interestRate: string;
}

export interface GoalRow {
  label: string;
  targetAmount: string;
  savedAmount: string;
  monthlyContribution: string;
  targetDate: string;
  priority: GoalPriority;
}

export interface OnboardingFormValues {
  fullName: string;
  currency: CurrencyCode;
  payFrequency: PayFrequency;
  monthlyIncome: string;
  estimatedVariableExpenses: string;
  currentSavings: string;
  emergencyBuffer: string;
  cooldownPreference: CooldownPreference;
  intent: string[];
  spendingPainPoints: string[];
  expenses: ExpenseRow[];
  debts: DebtRow[];
  goals: GoalRow[];
}

const hasLabel = (row: { label: string }) => row.label.trim() !== "";

const parseMoney = (value: string): number => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

const hasCompleteGoal = (row: GoalRow): boolean =>
  hasLabel(row) &&
  parseMoney(row.targetAmount) > 0 &&
  parseMoney(row.monthlyContribution) > 0;

export const emptyExpenseRow = (): ExpenseRow => ({
  label: "",
  amount: "",
  dueDay: "1",
  isRecurring: true,
});

export const emptyDebtRow = (): DebtRow => ({
  label: "",
  outstandingBalance: "",
  minimumPayment: "",
  dueDay: "1",
  interestRate: "",
});

export const emptyGoalRow = (): GoalRow => ({
  label: "",
  targetAmount: "",
  savedAmount: "",
  monthlyContribution: "",
  targetDate: "",
  priority: "medium",
});

export function createDefaultValues(): OnboardingFormValues {
  return {
    fullName: "",
    currency: "PHP",
    payFrequency: "monthly",
    monthlyIncome: "",
    estimatedVariableExpenses: "",
    currentSavings: "",
    emergencyBuffer: "",
    cooldownPreference: "balanced",
    intent: [],
    spendingPainPoints: [],
    expenses: [],
    debts: [],
    goals: [],
  };
}

export function buildOnboardingPayload(values: OnboardingFormValues) {
  return {
    profile: {
      currency: values.currency,
      fullName: values.fullName,
      payFrequency: values.payFrequency,
      monthlyIncome: parseMoney(values.monthlyIncome),
      estimatedVariableExpenses: parseMoney(values.estimatedVariableExpenses),
      currentSavings: parseMoney(values.currentSavings),
      emergencyBuffer: parseMoney(values.emergencyBuffer),
      emergencyFundTarget: 0,
      cooldownPreference: values.cooldownPreference,
      intent: values.intent,
      spendingPainPoints: values.spendingPainPoints,
    },
    expenses: values.expenses.filter(hasLabel).map((e) => ({
      label: e.label,
      amount: parseMoney(e.amount),
      dueDay: parseInt(e.dueDay, 10) || 1,
      isRecurring: e.isRecurring,
    })),
    debts: values.debts.filter(hasLabel).map((d) => ({
      label: d.label,
      outstandingBalance: parseMoney(d.outstandingBalance),
      minimumPayment: parseMoney(d.minimumPayment),
      dueDay: parseInt(d.dueDay, 10) || 1,
      interestRate: d.interestRate === "" ? undefined : parseFloat(d.interestRate),
    })),
    goals: values.goals.filter(hasCompleteGoal).map((g) => ({
      label: g.label,
      targetAmount: parseMoney(g.targetAmount),
      savedAmount: parseMoney(g.savedAmount),
      monthlyContribution: parseMoney(g.monthlyContribution),
      targetDate: g.targetDate === "" ? undefined : g.targetDate,
      priority: g.priority,
    })),
  };
}

export function buildSnapshotFromValues(values: OnboardingFormValues): FinancialSnapshot {
  return {
    profile: {
      currency: values.currency,
      fullName: values.fullName || undefined,
      payFrequency: values.payFrequency,
      monthlyIncome: parseMoney(values.monthlyIncome),
      estimatedVariableExpenses: parseMoney(values.estimatedVariableExpenses),
      currentSavings: parseMoney(values.currentSavings),
      emergencyBuffer: parseMoney(values.emergencyBuffer),
      emergencyFundTarget: 0,
      cooldownPreference: values.cooldownPreference,
      intent: values.intent,
      spendingPainPoints: values.spendingPainPoints,
    },
    expenses: values.expenses.filter(hasLabel).map((e) => ({
      id: crypto.randomUUID(),
      label: e.label,
      amount: parseMoney(e.amount),
      dueDay: parseInt(e.dueDay, 10) || 1,
      isRecurring: e.isRecurring,
    })),
    debts: values.debts.filter(hasLabel).map((d) => ({
      id: crypto.randomUUID(),
      label: d.label,
      outstandingBalance: parseMoney(d.outstandingBalance),
      minimumPayment: parseMoney(d.minimumPayment),
      dueDay: parseInt(d.dueDay, 10) || 1,
      interestRate: d.interestRate === "" ? undefined : parseFloat(d.interestRate),
    })),
    goals: values.goals.filter(hasCompleteGoal).map((g) => ({
      id: crypto.randomUUID(),
      label: g.label,
      targetAmount: parseMoney(g.targetAmount),
      savedAmount: parseMoney(g.savedAmount),
      monthlyContribution: parseMoney(g.monthlyContribution),
      targetDate: g.targetDate === "" ? undefined : g.targetDate,
      priority: g.priority,
    })),
  };
}
