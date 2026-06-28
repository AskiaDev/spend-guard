import { describe, expect, it } from "vitest";

import type { LedgerCandidate } from "@/lib/schemas/ledger";
import { isAutoConfirmEligible } from "./auto-confirm";

const base: LedgerCandidate = {
  occurredAt: "2026-06-15",
  direction: "expense",
  amount: 320,
  counterparty: "McDonald's",
  category: "food",
  confidence: 0.95,
};

describe("isAutoConfirmEligible", () => {
  it("accepts a high-confidence, fully-resolved candidate", () => {
    expect(isAutoConfirmEligible(base)).toBe(true);
  });

  it("rejects below the 0.8 confidence threshold", () => {
    expect(isAutoConfirmEligible({ ...base, confidence: 0.79 })).toBe(false);
  });

  it("rejects uncategorized regardless of confidence", () => {
    expect(isAutoConfirmEligible({ ...base, category: "uncategorized" })).toBe(false);
  });

  it("rejects when the date is missing", () => {
    expect(isAutoConfirmEligible({ ...base, occurredAt: null })).toBe(false);
  });
});
