import { describe, expect, it } from "vitest";

import type { CooldownItem, FinancialSnapshot } from "@/types/finance";
import { calculatePurchaseDecision } from "./purchase-decision";
import { cooldownItemToPurchaseInput, recheckCooldownItem } from "./cooldown-recheck";

// Same item under two very different financial situations.
// Weak: savings 3,000, recurring 10,000, debt 2,000 → safe-to-spend 0 → NOT_RECOMMENDED.
// Stable: savings 180,000 → safe-to-spend 108,000 → SAFE_TO_BUY.
const weakSnapshot: FinancialSnapshot = {
  profile: {
    currency: "PHP",
    monthlyIncome: 30_000,
    currentSavings: 3_000,
    emergencyFundTarget: 50_000,
    emergencyBuffer: 3_000,
    cooldownPreference: "balanced",
    estimatedVariableExpenses: 5_000,
  },
  expenses: [{ id: "rent", label: "Rent", amount: 10_000, dueDay: 1, isRecurring: true }],
  debts: [
    { id: "card", label: "Card", outstandingBalance: 20_000, minimumPayment: 2_000, dueDay: 20 },
  ],
  goals: [],
};

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
  ],
  debts: [
    { id: "card", label: "Card", outstandingBalance: 40_000, minimumPayment: 6_000, dueDay: 20 },
  ],
  goals: [
    {
      id: "travel",
      label: "Travel",
      targetAmount: 120_000,
      savedAmount: 30_000,
      monthlyContribution: 8_000,
      priority: "medium",
    },
  ],
};

function makeItem(overrides: Partial<CooldownItem> = {}): CooldownItem {
  return {
    id: "cooldown_1",
    itemName: "Keyboard",
    amount: 4_500,
    urgency: "need_this_month",
    paymentMethod: "cash",
    addedAt: "2026-06-20T00:00:00.000Z",
    recheckAt: "2026-06-23T00:00:00.000Z",
    ...overrides,
  };
}

describe("cooldownItemToPurchaseInput", () => {
  it("carries the decision-affecting purchase inputs", () => {
    const input = cooldownItemToPurchaseInput(
      makeItem({
        paymentMethod: "installment",
        downPayment: 5_000,
        installmentMonths: 12,
        monthlyPayment: 2_000,
        isIncomeGenerating: true,
        currentAlternativeStillWorks: true,
      })
    );

    expect(input).toMatchObject({
      itemName: "Keyboard",
      amount: 4_500,
      urgency: "need_this_month",
      paymentMethod: "installment",
      downPayment: 5_000,
      installmentMonths: 12,
      monthlyPayment: 2_000,
      isIncomeGenerating: true,
      currentAlternativeStillWorks: true,
    });
  });
});

describe("recheckCooldownItem", () => {
  it("recomputes the decision from the live engine against the fresh snapshot", () => {
    const item = makeItem();
    const result = recheckCooldownItem(item, stableSnapshot);

    expect(result.current).toEqual(
      calculatePurchaseDecision(stableSnapshot, cooldownItemToPurchaseInput(item))
    );
    expect(result.current.decision).toBe("SAFE_TO_BUY");
    expect(result.current.riskScore).toBe(20);
    expect(result.current.safeToSpend).toBe(108_000);
  });

  it("reports an improved decision when finances recovered since added", () => {
    const item = makeItem({
      baselineDecision: "NOT_RECOMMENDED",
      baselineRiskScore: 80,
      baselineSafeToSpend: 0,
    });

    const result = recheckCooldownItem(item, stableSnapshot);

    expect(result.decisionTrend).toBe("improved");
    expect(result.safeToSpendDelta).toBe(108_000);
    expect(result.baselineDecision).toBe("NOT_RECOMMENDED");
    expect(result.baselineRiskScore).toBe(80);
  });

  it("reports a worsened decision when finances deteriorated since added", () => {
    const item = makeItem({
      baselineDecision: "SAFE_TO_BUY",
      baselineRiskScore: 20,
      baselineSafeToSpend: 108_000,
    });

    const result = recheckCooldownItem(item, weakSnapshot);

    expect(result.current.decision).toBe("NOT_RECOMMENDED");
    expect(result.current.safeToSpend).toBe(0);
    expect(result.decisionTrend).toBe("worsened");
    expect(result.safeToSpendDelta).toBe(-108_000);
  });

  it("reports unchanged when the decision rank is the same but still surfaces the safe-to-spend delta", () => {
    const item = makeItem({
      baselineDecision: "SAFE_TO_BUY",
      baselineRiskScore: 20,
      baselineSafeToSpend: 100_000,
    });

    const result = recheckCooldownItem(item, stableSnapshot);

    expect(result.decisionTrend).toBe("unchanged");
    expect(result.safeToSpendDelta).toBe(8_000);
  });

  it("reports unknown trend and null delta when no baseline was stored (legacy rows)", () => {
    const result = recheckCooldownItem(makeItem(), stableSnapshot);

    expect(result.decisionTrend).toBe("unknown");
    expect(result.safeToSpendDelta).toBeNull();
    expect(result.baselineDecision).toBeNull();
  });

  it("derives the price-tier cooldown period from the amount", () => {
    expect(recheckCooldownItem(makeItem({ amount: 1_500 }), stableSnapshot).cooldownDays).toBe(1);
    expect(recheckCooldownItem(makeItem({ amount: 4_500 }), stableSnapshot).cooldownDays).toBe(3);
    expect(recheckCooldownItem(makeItem({ amount: 45_000 }), stableSnapshot).cooldownDays).toBe(7);
    expect(recheckCooldownItem(makeItem({ amount: 80_000 }), stableSnapshot).cooldownDays).toBe(30);
  });

  it("is deterministic for the same item and snapshot", () => {
    const item = makeItem({ baselineDecision: "WAIT", baselineSafeToSpend: 50_000 });

    expect(recheckCooldownItem(item, stableSnapshot)).toEqual(
      recheckCooldownItem(item, stableSnapshot)
    );
  });
});
