import { describe, expect, it } from "vitest";
import { buildOnboardingPayload, emptyExpenseRow } from "./onboarding-form";

const base = {
  fullName: "Maria Santos",
  currency: "PHP" as const,
  payFrequency: "monthly" as const,
  monthlyIncome: "40000",
  estimatedVariableExpenses: "8000",
  currentSavings: "15000",
  emergencyFundTarget: "60000",
  expenses: [],
  debts: [],
  goals: [],
};

describe("buildOnboardingPayload", () => {
  it("maps profile scalar fields", () => {
    const out = buildOnboardingPayload({ ...base });
    expect(out.profile).toMatchObject({
      currency: "PHP",
      fullName: "Maria Santos",
      payFrequency: "monthly",
      monthlyIncome: "40000",
      currentSavings: "15000",
      emergencyFundTarget: "60000",
      estimatedVariableExpenses: "8000",
    });
    expect(out.expenses).toEqual([]);
    expect(out.debts).toEqual([]);
    expect(out.goals).toEqual([]);
  });

  it("drops rows with a blank label (skippable lists)", () => {
    const out = buildOnboardingPayload({
      ...base,
      expenses: [
        { label: "Rent", amount: "12000", dueDay: "1", isRecurring: true },
        { ...emptyExpenseRow() },
      ],
    });
    expect(out.expenses).toHaveLength(1);
    expect(out.expenses[0]).toMatchObject({ label: "Rent", amount: "12000", dueDay: "1", isRecurring: true });
  });

  it("maps debt and goal rows by field name", () => {
    const out = buildOnboardingPayload({
      ...base,
      debts: [{ label: "Card", outstandingBalance: "20000", minimumPayment: "2000", dueDay: "5", interestRate: "0.03" }],
      goals: [{ label: "Travel", targetAmount: "50000", savedAmount: "5000", monthlyContribution: "3000", targetDate: "", priority: "high" }],
    });
    expect(out.debts[0]).toMatchObject({ label: "Card", outstandingBalance: "20000", minimumPayment: "2000", dueDay: "5", interestRate: "0.03" });
    expect(out.goals[0]).toMatchObject({ label: "Travel", targetAmount: "50000", priority: "high" });
  });
});
