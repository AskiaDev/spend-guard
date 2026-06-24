import { describe, expect, it } from "vitest";

import { buildAdvisorPrompt, buildAdvisorSystemPrompt } from "./prompt";

const result = {
  decision: "WAIT" as const,
  riskScore: 60,
  safeToSpend: 10_000,
  monthlyFreeCashFlow: 20_000,
  emergencyProgress: 0.5,
  debtPressure: 0.1,
  goalDelayMonths: 2,
  cooldownDays: 14,
  savingsAfterPurchase: 5_000,
  healthScore: 60,
  reasons: ["The purchase exceeds safe-to-spend."],
};
const purchase = {
  itemName: "Phone",
  amount: 25_000,
  urgency: "want" as const,
  paymentMethod: "cash" as const,
};

describe("advisor prompt (§21)", () => {
  it("system prompt forbids changing the decision and sets the PHP context", () => {
    const sys = buildAdvisorSystemPrompt();
    expect(sys).toMatch(/never change|never override|do not change/i);
    expect(sys).toContain("₱");
  });

  it("anchors on the decision in the first line and includes key numbers + reasons", () => {
    const prompt = buildAdvisorPrompt(result, purchase);

    expect(prompt.split("\n")[0]).toContain("WAIT");
    expect(prompt).toContain("Phone");
    expect(prompt).toContain("Risk score: 60/100");
    expect(prompt).toContain("The purchase exceeds safe-to-spend.");
    expect(prompt).toContain("Suggested cooldown: 14 days");
  });

  it("is deterministic and omits the cooldown line when there is no cooldown", () => {
    const noCooldown = { ...result, cooldownDays: 0 };
    const a = buildAdvisorPrompt(noCooldown, purchase);
    const b = buildAdvisorPrompt(noCooldown, purchase);

    expect(a).toBe(b);
    expect(a).not.toContain("Suggested cooldown");
  });
});
