import type { FinancialSnapshot } from "@/types/finance";

/**
 * A realistic PHP financial profile used exclusively by the ExploreSandbox.
 * It is a read-only constant - never saved, never tied to a real user account.
 *
 * Profile basis: mid-career professional, solo earner, one car loan,
 * one emergency fund goal, two fixed recurring expenses.
 */
export const SAMPLE_SNAPSHOT: FinancialSnapshot = {
  profile: {
    currency: "PHP",
    monthlyIncome: 45000,
    currentSavings: 30000,
    emergencyFundTarget: 135000, // 3 months of income
    emergencyBuffer: 10000,
    cooldownPreference: "balanced",
    payFrequency: "monthly",
    estimatedVariableExpenses: 5000,
  },
  expenses: [
    {
      id: "sample-expense-rent",
      label: "Rent",
      amount: 10000,
      dueDay: 1,
      isRecurring: true,
    },
    {
      id: "sample-expense-utilities",
      label: "Utilities and internet",
      amount: 3000,
      dueDay: 15,
      isRecurring: true,
    },
  ],
  debts: [
    {
      id: "sample-debt-car",
      label: "Car loan",
      outstandingBalance: 180000,
      minimumPayment: 4500,
      dueDay: 10,
      interestRate: 8.5,
    },
  ],
  goals: [
    {
      id: "sample-goal-emergency",
      label: "Emergency fund",
      targetAmount: 135000,
      savedAmount: 30000,
      monthlyContribution: 2000,
      priority: "high",
    },
  ],
};
