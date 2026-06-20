import { describe, expect, it } from "vitest";

import {
  calculateCooldownDays,
  calculateEmergencyProgress,
  calculateFinancialHealthScore,
  calculateMonthlyFreeCashFlow,
  calculatePurchaseDecision,
  calculateSafeToSpend,
} from "./purchase-decision";
import type { FinancialSnapshot, PurchaseInput } from "@/types/finance";

const stableSnapshot: FinancialSnapshot = {
  profile: {
    currency: "PHP",
    monthlyIncome: 90000,
    currentSavings: 180000,
    emergencyFundTarget: 150000,
  },
  expenses: [
    { id: "rent", label: "Rent", amount: 22000, dueDay: 1, isRecurring: true },
    { id: "utilities", label: "Utilities", amount: 6000, dueDay: 18, isRecurring: true },
  ],
  debts: [
    {
      id: "card",
      label: "Credit card",
      outstandingBalance: 40000,
      minimumPayment: 6000,
      dueDay: 20,
      interestRate: 0.32,
    },
  ],
  goals: [
    {
      id: "travel",
      label: "Travel fund",
      targetAmount: 120000,
      savedAmount: 30000,
      monthlyContribution: 8000,
      targetDate: "2026-12-31",
      priority: "medium",
    },
  ],
};

describe("finance calculations", () => {
  it("calculates safe-to-spend as savings after emergency buffer, upcoming obligations, and reserved goals", () => {
    expect(calculateSafeToSpend(stableSnapshot)).toBe(18000);
  });

  it("calculates free cash flow from income less recurring expenses, debt minimums, and goal contributions", () => {
    expect(calculateMonthlyFreeCashFlow(stableSnapshot)).toBe(48000);
  });

  it("calculates emergency progress and financial health as bounded values", () => {
    expect(calculateEmergencyProgress(stableSnapshot)).toBe(1);
    expect(calculateFinancialHealthScore(stableSnapshot)).toBeGreaterThanOrEqual(80);
    expect(calculateFinancialHealthScore(stableSnapshot)).toBeLessThanOrEqual(100);
  });

  it("marks a low-impact needed cash purchase as safe to buy", () => {
    const purchase: PurchaseInput = {
      itemName: "Replacement keyboard",
      amount: 4500,
      urgency: "need_this_month",
      paymentMethod: "cash",
    };

    const result = calculatePurchaseDecision(stableSnapshot, purchase);

    expect(result.decision).toBe("SAFE_TO_BUY");
    expect(result.safeToSpend).toBe(18000);
    expect(result.cooldownDays).toBe(0);
    expect(result.reasons).toContain("The purchase fits inside today's safe-to-spend amount.");
  });

  it("recommends waiting when a want exceeds safe-to-spend and slows goals", () => {
    const purchase: PurchaseInput = {
      itemName: "Gaming monitor",
      amount: 36000,
      urgency: "want",
      paymentMethod: "cash",
    };

    const result = calculatePurchaseDecision(stableSnapshot, purchase);

    expect(result.decision).toBe("WAIT");
    expect(result.cooldownDays).toBe(14);
    expect(result.goalDelayMonths).toBe(5);
    expect(result.reasons).toContain("This would exceed today's safe-to-spend amount.");
  });

  it("rejects installment purchases when monthly payments consume the remaining monthly free cash flow", () => {
    const purchase: PurchaseInput = {
      itemName: "Phone upgrade",
      amount: 96000,
      urgency: "want",
      paymentMethod: "installment",
      installmentMonths: 12,
      monthlyPayment: 70000,
    };

    const result = calculatePurchaseDecision(stableSnapshot, purchase);

    expect(result.decision).toBe("NOT_RECOMMENDED");
    expect(result.reasons).toContain("The monthly payment is higher than available monthly free cash flow.");
  });

  it("uses larger cooldowns for wants that are far outside the safe amount", () => {
    expect(calculateCooldownDays({ amount: 5000, safeToSpend: 12000, urgency: "want" })).toBe(3);
    expect(calculateCooldownDays({ amount: 18000, safeToSpend: 12000, urgency: "want" })).toBe(14);
    expect(calculateCooldownDays({ amount: 50000, safeToSpend: 12000, urgency: "want" })).toBe(30);
  });

  it("handles empty targets and missing income without division errors", () => {
    const snapshot: FinancialSnapshot = {
      profile: {
        currency: "PHP",
        monthlyIncome: 0,
        currentSavings: 0,
        emergencyFundTarget: 0,
      },
      expenses: [],
      debts: [],
      goals: [],
    };

    expect(calculateEmergencyProgress(snapshot)).toBe(1);
    expect(calculateFinancialHealthScore(snapshot)).toBe(40);
  });

  it("downgrades a need-now purchase outside safe-to-spend to caution instead of approving it", () => {
    const result = calculatePurchaseDecision(stableSnapshot, {
      itemName: "Urgent repair",
      amount: 24000,
      urgency: "need_now",
      paymentMethod: "cash",
    });

    expect(result.decision).toBe("BUY_WITH_CAUTION");
    expect(result.cooldownDays).toBe(0);
  });

  it("rejects wants when debt pressure is already high", () => {
    const result = calculatePurchaseDecision(
      {
        ...stableSnapshot,
        debts: [
          {
            id: "loan",
            label: "Loan",
            outstandingBalance: 200000,
            minimumPayment: 42000,
            dueDay: 10,
          },
        ],
      },
      {
        itemName: "Camera",
        amount: 5000,
        urgency: "want",
        paymentMethod: "cash",
      }
    );

    expect(result.decision).toBe("NOT_RECOMMENDED");
    expect(result.reasons).toContain("Debt payments are taking a large share of monthly income.");
  });
});
