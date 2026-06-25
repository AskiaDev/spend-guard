import { describe, expect, it } from "vitest";

import {
  calculateEmergencyProgress,
  calculateFinancialHealthScore,
  calculateMonthlyFreeCashFlow,
  calculatePurchaseDecision,
  calculateSafeToSpend,
  evaluatePurchase,
} from "./purchase-decision";
import type { FinancialSnapshot, PurchaseInput } from "@/types/finance";

const stableSnapshot: FinancialSnapshot = {
  profile: {
    currency: "PHP",
    monthlyIncome: 90_000,
    currentSavings: 180_000,
    emergencyFundTarget: 150_000,
    emergencyBuffer: 30_000,
    cooldownPreference: "balanced",
    estimatedVariableExpenses: 12_000,
  },
  expenses: [
    { id: "rent", label: "Rent", amount: 22_000, dueDay: 1, isRecurring: true },
    { id: "utilities", label: "Utilities", amount: 6_000, dueDay: 18, isRecurring: true },
    { id: "repair", label: "One-time repair", amount: 5_000, dueDay: 18, isRecurring: false },
  ],
  debts: [
    {
      id: "card",
      label: "Credit card",
      outstandingBalance: 40_000,
      minimumPayment: 6_000,
      dueDay: 20,
      interestRate: 0.32,
    },
  ],
  goals: [
    {
      id: "travel",
      label: "Travel fund",
      targetAmount: 120_000,
      savedAmount: 30_000,
      monthlyContribution: 8_000,
      targetDate: "2026-12-31",
      priority: "medium",
    },
  ],
};

describe("purchase decision compatibility wrapper", () => {
  it("derives PRD safe-to-spend inputs from the current financial snapshot", () => {
    expect(calculateSafeToSpend(stableSnapshot)).toBe(108_000);
  });

  it("calculates free cash flow using estimated variable expenses and minimum debt payments", () => {
    expect(calculateMonthlyFreeCashFlow(stableSnapshot)).toBe(44_000);
  });

  it("keeps legacy emergency progress as a 0-1 ratio and health score as 0-100", () => {
    expect(calculateEmergencyProgress(stableSnapshot)).toBe(1);
    expect(calculateFinancialHealthScore(stableSnapshot)).toBeGreaterThanOrEqual(70);
    expect(calculateFinancialHealthScore(stableSnapshot)).toBeLessThanOrEqual(100);
  });

  it("returns PRD risk-score details with the existing app result shape", () => {
    const purchase: PurchaseInput = {
      itemName: "Replacement keyboard",
      amount: 4_500,
      urgency: "need_this_month",
      paymentMethod: "cash",
    };

    const result = calculatePurchaseDecision(stableSnapshot, purchase);

    expect(result).toMatchObject({
      decision: "SAFE_TO_BUY",
      riskScore: 20,
      safeToSpend: 108_000,
      monthlyFreeCashFlow: 44_000,
      savingsAfterPurchase: 175_500,
      cooldownDays: 3,
    });
    expect(result.reasons).toContain("You have debt due within the next 30 days.");
  });

  it("passes the profile cooldown preference into the cooldown calculation", () => {
    const result = calculatePurchaseDecision(
      {
        ...stableSnapshot,
        profile: {
          ...stableSnapshot.profile,
          cooldownPreference: "strict",
        },
      },
      {
        itemName: "Standing desk",
        amount: 15_000,
        urgency: "can_wait",
        paymentMethod: "cash",
      }
    );

    expect(result.cooldownDays).toBe(14);
  });

  it("uses down payment for savings-after-purchase on non-cash purchases", () => {
    const result = calculatePurchaseDecision(stableSnapshot, {
      itemName: "Laptop",
      amount: 80_000,
      urgency: "can_wait",
      paymentMethod: "installment",
      downPayment: 20_000,
      monthlyPayment: 8_000,
      installmentMonths: 12,
    });

    expect(result.savingsAfterPurchase).toBe(160_000);
    expect(result.riskScore).toBe(45);
    expect(result.decision).toBe("BUY_WITH_CAUTION");
  });
});

describe("PRD purchase risk scoring", () => {
  it("uses exact decision threshold ties", () => {
    expect(
      evaluatePurchase({
        price: 200,
        currentSavings: 100,
        safeToSpend: 100,
        emergencyBuffer: 150,
        upcomingDebt30Days: 0,
        monthlyFreeCashFlow: 1_000,
        paymentMethod: "installment",
        urgency: "need_this_month",
        isIncomeGenerating: false,
        currentAlternativeStillWorks: false,
      })
    ).toMatchObject({ riskScore: 75, decision: "NOT_RECOMMENDED" });

    expect(
      evaluatePurchase({
        price: 200,
        currentSavings: 500,
        safeToSpend: 100,
        emergencyBuffer: 100,
        upcomingDebt30Days: 1,
        monthlyFreeCashFlow: 1_000,
        paymentMethod: "cash",
        urgency: "need_this_month",
        isIncomeGenerating: false,
        currentAlternativeStillWorks: false,
      })
    ).toMatchObject({ riskScore: 50, decision: "WAIT" });

    expect(
      evaluatePurchase({
        price: 200,
        currentSavings: 500,
        safeToSpend: 100,
        emergencyBuffer: 100,
        upcomingDebt30Days: 0,
        monthlyFreeCashFlow: 1_000,
        paymentMethod: "cash",
        urgency: "need_this_month",
        isIncomeGenerating: false,
        currentAlternativeStillWorks: false,
      })
    ).toMatchObject({ riskScore: 30, decision: "BUY_WITH_CAUTION" });
  });

  it("scores installment pressure at the PRD cutoffs", () => {
    expect(
      evaluatePurchase({
        price: 1_000,
        currentSavings: 10_000,
        safeToSpend: 10_000,
        emergencyBuffer: 2_000,
        upcomingDebt30Days: 0,
        monthlyFreeCashFlow: 1_000,
        paymentMethod: "installment",
        urgency: "need_this_month",
        isIncomeGenerating: false,
        currentAlternativeStillWorks: false,
        installmentMonthlyAmount: 150,
      })
    ).toMatchObject({ riskScore: 25, decision: "SAFE_TO_BUY" });

    expect(
      evaluatePurchase({
        price: 1_000,
        currentSavings: 10_000,
        safeToSpend: 10_000,
        emergencyBuffer: 2_000,
        upcomingDebt30Days: 0,
        monthlyFreeCashFlow: 1_000,
        paymentMethod: "installment",
        urgency: "need_this_month",
        isIncomeGenerating: false,
        currentAlternativeStillWorks: false,
        installmentMonthlyAmount: 300,
      })
    ).toMatchObject({ riskScore: 35, decision: "BUY_WITH_CAUTION" });
  });

  it("does not approve new financing when monthly free cash flow is zero or negative", () => {
    const result = evaluatePurchase({
      price: 1_000,
      currentSavings: 10_000,
      safeToSpend: 10_000,
      emergencyBuffer: 2_000,
      upcomingDebt30Days: 0,
      monthlyFreeCashFlow: 0,
      paymentMethod: "installment",
      urgency: "need_this_month",
      isIncomeGenerating: false,
      currentAlternativeStillWorks: false,
      installmentMonthlyAmount: 100,
    });

    expect(result).toMatchObject({ riskScore: 75, decision: "NOT_RECOMMENDED" });
    expect(result.reasons).toContain(
      "There is no monthly free cash flow available for a new payment."
    );
  });

  it("adds want and working-alternative risk while reducing income-generating risk", () => {
    const result = evaluatePurchase({
      price: 3_000,
      currentSavings: 50_000,
      safeToSpend: 50_000,
      emergencyBuffer: 10_000,
      upcomingDebt30Days: 0,
      monthlyFreeCashFlow: 20_000,
      paymentMethod: "cash",
      urgency: "want",
      isIncomeGenerating: true,
      currentAlternativeStillWorks: true,
    });

    expect(result.riskScore).toBe(5);
    expect(result.reasons).toContain("This appears to be a want, not an urgent need.");
    expect(result.reasons).toContain("Your current alternative still works.");
    expect(result.reasons).toContain("This may support your work or income.");
  });
});
