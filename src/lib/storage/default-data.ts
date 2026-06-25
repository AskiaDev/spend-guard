import type { FinancialSnapshot } from "@/types/finance";

export const emptySnapshot: FinancialSnapshot = {
  profile: {
    currency: "PHP",
    monthlyIncome: 0,
    currentSavings: 0,
    emergencyFundTarget: 0,
    emergencyBuffer: 0,
    cooldownPreference: "balanced",
    intent: [],
    spendingPainPoints: [],
    payFrequency: "monthly",
    estimatedVariableExpenses: 0,
  },
  expenses: [],
  debts: [],
  goals: [],
};
