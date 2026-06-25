import { expect, it } from "vitest";
import { runFirstCheck } from "./first-purchase-check";
import { createDefaultValues } from "../lib/onboarding-form";

it("returns a deterministic verdict for a sample purchase", () => {
  const values = { ...createDefaultValues(), monthlyIncome: "40000", currentSavings: "5000", emergencyBuffer: "10000" };
  const result = runFirstCheck(values, { itemName: "Headphones", amount: 8000, urgency: "want", paymentMethod: "cash" });
  // safeToSpend 0 (savings 5000 - buffer 10000, floored). +30 over safe, +30 breaks buffer, +10 want = 70 -> WAIT
  expect(result.decision).toBe("WAIT");
  expect(result.safeToSpend).toBe(0);
});
