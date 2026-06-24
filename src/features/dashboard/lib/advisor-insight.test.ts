import { describe, expect, it } from "vitest";

import type { FinancialSnapshot } from "@/types/finance";

import { describeHealthStatus, generateAdvisorInsight } from "./advisor-insight";

function snapshot(overrides: Partial<FinancialSnapshot["profile"]> = {}): FinancialSnapshot {
  return {
    profile: {
      currency: "PHP",
      monthlyIncome: 60000,
      currentSavings: 120000,
      emergencyFundTarget: 120000,
      estimatedVariableExpenses: 8000,
      ...overrides,
    },
    expenses: [],
    debts: [],
    goals: [],
  };
}

const baseMetrics = { safeToSpend: 20000, monthlyFreeCashFlow: 10000, healthScore: 82 };

describe("generateAdvisorInsight", () => {
  it("produces the Strong-band title for a high health score", () => {
    const insight = generateAdvisorInsight({ metrics: baseMetrics, snapshot: snapshot() });

    expect(insight.title).toBe("You're ahead of the guardrail");
  });

  it("produces the Stable-band title for a mid health score", () => {
    const insight = generateAdvisorInsight({
      metrics: { ...baseMetrics, healthScore: 65 },
      snapshot: snapshot(),
    });

    expect(insight.title).toBe("Keep the guardrail active");
  });

  it("produces the Caution-band title for a low-mid health score", () => {
    const insight = generateAdvisorInsight({
      metrics: { ...baseMetrics, healthScore: 45 },
      snapshot: snapshot(),
    });

    expect(insight.title).toBe("Tighten before the next want");
  });

  it("produces the Risky-band title and a hold message when cash flow is negative", () => {
    const insight = generateAdvisorInsight({
      metrics: { ...baseMetrics, healthScore: 25, monthlyFreeCashFlow: -2000 },
      snapshot: snapshot({ currentSavings: 10000 }),
    });

    expect(insight.title).toBe("Protect your buffer first");
    expect(insight.body).toMatch(/free cash flow is tight/i);
  });

  it("points spare cash flow at the emergency target when it is underfunded", () => {
    const insight = generateAdvisorInsight({
      metrics: baseMetrics,
      snapshot: snapshot({ currentSavings: 60000, emergencyFundTarget: 120000 }),
    });

    expect(insight.body).toMatch(/emergency target/i);
  });

  it("affirms room for planned spending when funded, positive, and debt-free", () => {
    const insight = generateAdvisorInsight({ metrics: baseMetrics, snapshot: snapshot() });

    expect(insight.body).toMatch(/room for planned spending/i);
  });

  it("nudges clearing upcoming debt when funded and positive but still carrying debt", () => {
    const withDebt: FinancialSnapshot = {
      ...snapshot(),
      debts: [
        { id: "d", label: "Card", outstandingBalance: 10000, minimumPayment: 1000, dueDay: 5 },
      ],
    };

    const insight = generateAdvisorInsight({ metrics: baseMetrics, snapshot: withDebt });

    expect(insight.body).toMatch(/clear upcoming debt first/i);
  });

  it("is deterministic for identical inputs", () => {
    const input = { metrics: baseMetrics, snapshot: snapshot() };

    expect(generateAdvisorInsight(input)).toEqual(generateAdvisorInsight(input));
  });

  it("tolerates a profile without estimated variable expenses", () => {
    const profileSnapshot = snapshot({ estimatedVariableExpenses: undefined });

    expect(() => generateAdvisorInsight({ metrics: baseMetrics, snapshot: profileSnapshot })).not.toThrow();
  });
});

describe("describeHealthStatus", () => {
  it("returns a distinct one-line description per band", () => {
    const descriptions = [
      describeHealthStatus("Strong"),
      describeHealthStatus("Stable"),
      describeHealthStatus("Caution"),
      describeHealthStatus("Risky"),
    ];

    expect(new Set(descriptions).size).toBe(4);
    descriptions.forEach((line) => expect(line.length).toBeGreaterThan(0));
  });
});
