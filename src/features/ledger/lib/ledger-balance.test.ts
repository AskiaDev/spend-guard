import { describe, expect, it } from "vitest";

import { confirmedSavingsDelta } from "./ledger-balance";

describe("confirmedSavingsDelta", () => {
  it("adds income and subtracts expense", () => {
    expect(
      confirmedSavingsDelta([
        { amount: 100, direction: "income" },
        { amount: 30, direction: "expense" },
      ])
    ).toBe(70);
  });

  it("returns 0 for an empty ledger", () => {
    expect(confirmedSavingsDelta([])).toBe(0);
  });

  it("ignores rows with an unknown/null direction", () => {
    expect(
      confirmedSavingsDelta([
        { amount: 100, direction: "income" },
        { amount: 999, direction: null },
      ])
    ).toBe(100);
  });
});
