import { expect, it } from "vitest";
import { SAMPLE_SNAPSHOT } from "./sample-snapshot";
import { calculatePurchaseDecision } from "@/lib/calculations/purchase-decision";

it("runs the real engine on sample data", () => {
  const result = calculatePurchaseDecision(SAMPLE_SNAPSHOT, {
    itemName: "Sneakers",
    amount: 3000,
    urgency: "want",
    paymentMethod: "cash",
  });
  expect(["SAFE_TO_BUY", "BUY_WITH_CAUTION", "WAIT", "NOT_RECOMMENDED"]).toContain(
    result.decision
  );
});
