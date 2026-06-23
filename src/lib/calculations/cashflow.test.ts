import { describe, expect, it } from "vitest";

import {
  calculateMonthlyFreeCashFlow,
  calculateSafeToSpend,
} from "./cashflow";

describe("PRD cash-flow calculations", () => {
  it("calculates safe-to-spend from protected savings and 30-day commitments", () => {
    expect(
      calculateSafeToSpend({
        currentSavings: 120_000,
        emergencyBuffer: 24_000,
        upcomingBills30Days: 32_000,
        upcomingDebt30Days: 9_000,
        reservedGoalAmount: 10_000,
      })
    ).toBe(45_000);
  });

  it("never returns negative safe-to-spend", () => {
    expect(
      calculateSafeToSpend({
        currentSavings: 20_000,
        emergencyBuffer: 20_000,
        upcomingBills30Days: 15_000,
        upcomingDebt30Days: 5_000,
        reservedGoalAmount: 5_000,
      })
    ).toBe(0);
  });

  it("subtracts fixed expenses, estimated variable expenses, and minimum debt payments from income", () => {
    expect(
      calculateMonthlyFreeCashFlow({
        monthlyIncome: 90_000,
        fixedExpenses: 28_000,
        estimatedVariableExpenses: 12_000,
        minimumDebtPayments: 6_000,
      })
    ).toBe(44_000);
  });
});
