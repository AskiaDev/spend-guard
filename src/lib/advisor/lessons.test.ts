import { describe, expect, it } from "vitest";

import { getEducationalLesson } from "./lessons";

const base = {
  decision: "SAFE_TO_BUY" as const,
  riskScore: 10,
  safeToSpend: 10_000,
  monthlyFreeCashFlow: 20_000,
  emergencyProgress: 1,
  debtPressure: 0,
  goalDelayMonths: 0,
  cooldownDays: 0,
  savingsAfterPurchase: 50_000,
  healthScore: 90,
  reasons: [],
};

describe("getEducationalLesson", () => {
  it("prioritises debt pressure", () => {
    expect(getEducationalLesson({ ...base, debtPressure: 0.3 }).title).toMatch(/debt/i);
  });

  it("teaches the cooldown when one is suggested", () => {
    expect(getEducationalLesson({ ...base, cooldownDays: 30 }).title).toMatch(/cooldown|impulse/i);
  });

  it("teaches emergency funds when the buffer is not full", () => {
    expect(getEducationalLesson({ ...base, emergencyProgress: 0.4 }).title).toMatch(/emergency/i);
  });

  it("falls back to a safe-to-spend lesson when healthy", () => {
    expect(getEducationalLesson(base).title).toMatch(/safe-to-spend|savings/i);
  });

  it("is deterministic", () => {
    expect(getEducationalLesson(base)).toEqual(getEducationalLesson(base));
  });
});
