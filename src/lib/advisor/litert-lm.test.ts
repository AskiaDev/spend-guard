import { afterEach, describe, expect, it, vi } from "vitest";
import { createLiteRtAdvice } from "./litert-lm";

const result = {
  decision: "WAIT" as const,
  safeToSpend: 10_000,
  monthlyFreeCashFlow: 20_000,
  emergencyProgress: 0.5,
  debtPressure: 0.1,
  goalDelayMonths: 2,
  cooldownDays: 14,
  healthScore: 60,
  reasons: ["The purchase exceeds safe-to-spend."],
};
const purchase = {
  itemName: "Phone",
  amount: 25_000,
  urgency: "want" as const,
  paymentMethod: "cash" as const,
};

afterEach(() => {
  delete window.LiteRTLM;
});

describe("createLiteRtAdvice", () => {
  it("returns generated advisory text when the runtime is available", async () => {
    window.LiteRTLM = { generateText: vi.fn(async () => "  Wait and save first.  ") };

    await expect(createLiteRtAdvice(result, purchase)).resolves.toBe("Wait and save first.");
  });

  it("falls back when generation fails or returns empty text", async () => {
    window.LiteRTLM = { generateText: vi.fn(async () => "   ") };
    await expect(createLiteRtAdvice(result, purchase)).resolves.toBeNull();

    window.LiteRTLM = { generateText: vi.fn(async () => Promise.reject(new Error("failed"))) };
    await expect(createLiteRtAdvice(result, purchase)).resolves.toBeNull();
  });
});
