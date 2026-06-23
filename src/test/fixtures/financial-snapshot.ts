import type { FinancialSnapshot } from "@/types/finance";

export const financialSnapshotFixture: FinancialSnapshot = {
  profile: {
    currency: "PHP",
    monthlyIncome: 85000,
    currentSavings: 120000,
    emergencyFundTarget: 180000,
  },
  expenses: [
    { id: "expense_rent", label: "Rent", amount: 22000, dueDay: 1, isRecurring: true },
    {
      id: "expense_utilities",
      label: "Utilities and internet",
      amount: 6500,
      dueDay: 15,
      isRecurring: true,
    },
  ],
  debts: [
    {
      id: "debt_card",
      label: "Credit card",
      outstandingBalance: 35000,
      minimumPayment: 5000,
      dueDay: 20,
      interestRate: 0.32,
    },
  ],
  goals: [
    {
      id: "goal_emergency",
      label: "Emergency buffer",
      targetAmount: 180000,
      savedAmount: 120000,
      monthlyContribution: 10000,
      targetDate: "2026-12-31",
      priority: "high",
    },
  ],
};
