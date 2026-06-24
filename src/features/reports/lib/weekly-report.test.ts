import { describe, expect, it } from "vitest";

import type { FinancialSnapshot, PurchaseCheck } from "@/types/finance";

import { generateWeeklyReportInsights } from "./weekly-report";

const WEEK_START = "2026-06-15"; // Monday

function snapshot(overrides: Partial<FinancialSnapshot["profile"]> = {}, debts: FinancialSnapshot["debts"] = []): FinancialSnapshot {
  return {
    profile: {
      currency: "PHP",
      monthlyIncome: 85000,
      currentSavings: 200000,
      emergencyFundTarget: 100000,
      estimatedVariableExpenses: 10000,
      ...overrides,
    },
    expenses: [],
    debts,
    goals: [],
  };
}

function check(overrides: Partial<PurchaseCheck> = {}): PurchaseCheck {
  return {
    id: "c1",
    itemName: "Item",
    amount: 1000,
    urgency: "want",
    paymentMethod: "cash",
    createdAt: "2026-06-16T10:00:00.000Z", // inside the week
    decision: "SAFE_TO_BUY",
    riskScore: 10,
    safeToSpend: 20000,
    monthlyFreeCashFlow: 10000,
    savingsAfterPurchase: 19000,
    cooldownDays: 0,
    advisorText: "",
    reasons: [],
    status: "checked",
    ...overrides,
  };
}

function generate(checks: PurchaseCheck[], snap = snapshot()) {
  return generateWeeklyReportInsights({
    snapshot: snap,
    checks,
    weekStart: WEEK_START,
    currency: "PHP",
  });
}

describe("generateWeeklyReportInsights", () => {
  it("counts safe buys and skipped checks within the week as good decisions", () => {
    const result = generate([
      check({ id: "a", decision: "SAFE_TO_BUY", status: "bought" }),
      check({ id: "b", decision: "SAFE_TO_BUY", status: "checked" }),
      check({ id: "c", decision: "NOT_RECOMMENDED", status: "skipped" }),
    ]);

    expect(result.goodDecisions).toBe(3);
  });

  it("sums the amount preserved and counts purchases avoided from skipped checks", () => {
    const result = generate([
      check({ id: "a", decision: "WAIT", status: "skipped", amount: 4000 }),
      check({ id: "b", decision: "NOT_RECOMMENDED", status: "skipped", amount: 6000 }),
      check({ id: "c", decision: "SAFE_TO_BUY", status: "bought", amount: 2000 }),
    ]);

    expect(result.purchasesAvoided).toBe(2);
    expect(result.amountPreserved).toBe(10000);
  });

  it("excludes checks created outside the week window", () => {
    const result = generate([
      check({ id: "in", createdAt: "2026-06-16T10:00:00.000Z", decision: "SAFE_TO_BUY" }),
      check({ id: "before", createdAt: "2026-06-01T10:00:00.000Z", decision: "SAFE_TO_BUY" }),
      check({ id: "after", createdAt: "2026-07-01T10:00:00.000Z", decision: "SAFE_TO_BUY" }),
    ]);

    expect(result.goodDecisions).toBe(1);
  });

  it("flags risks when a not-recommended purchase was bought", () => {
    const result = generate([
      check({ id: "risk", decision: "NOT_RECOMMENDED", status: "bought", amount: 30000 }),
    ]);

    expect(result.currentRisks).toMatch(/not recommended/i);
  });

  it("recommends building the emergency fund when it is underfunded", () => {
    const result = generate([], snapshot({ currentSavings: 40000, emergencyFundTarget: 120000 }));

    expect(result.nextBestAction).toMatch(/emergency/i);
  });

  it("recommends reviewing installments when funded but carrying debt", () => {
    const debt = { id: "d", label: "Card", outstandingBalance: 20000, minimumPayment: 2000, dueDay: 10 };
    const result = generate([], snapshot({ currentSavings: 200000, emergencyFundTarget: 100000 }, [debt]));

    expect(result.nextBestAction).toMatch(/installment|debt/i);
  });

  it("recommends running a purchase check when funded and debt-free", () => {
    const result = generate([], snapshot({ currentSavings: 200000, emergencyFundTarget: 100000 }, []));

    expect(result.nextBestAction).toMatch(/purchase check/i);
  });

  it("returns non-empty defaults for an empty week", () => {
    const result = generate([]);

    expect(result.goodDecisions).toBe(0);
    expect(result.purchasesAvoided).toBe(0);
    expect(result.amountPreserved).toBe(0);
    expect(result.improvedItems.length).toBeGreaterThan(0);
    expect(result.currentRisks.length).toBeGreaterThan(0);
    expect(result.goalProgress.length).toBeGreaterThan(0);
    expect(result.narrative.length).toBeGreaterThan(0);
  });

  it("is deterministic for identical inputs", () => {
    const checks = [check({ id: "a", status: "skipped", amount: 1500 })];

    expect(generate(checks)).toEqual(generate(checks));
  });
});
