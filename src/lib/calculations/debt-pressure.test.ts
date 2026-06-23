import { describe, expect, it } from "vitest";

import { calculateDebtPressure, calculateDebtPressureScore } from "./debt-pressure";

describe("debt pressure calculations", () => {
  it("calculates bounded debt pressure from income and minimum payments", () => {
    expect(
      calculateDebtPressure({
        monthlyIncome: 100_000,
        minimumDebtPayments: 20_000,
      })
    ).toBe(0.2);
  });

  it("handles zero-income branches for health-score inputs", () => {
    expect(
      calculateDebtPressure({
        monthlyIncome: 0,
        minimumDebtPayments: 0,
      })
    ).toBe(0);
    expect(
      calculateDebtPressure({
        monthlyIncome: 0,
        minimumDebtPayments: 1,
      })
    ).toBe(1);
    expect(
      calculateDebtPressureScore({
        monthlyIncome: 0,
        minimumDebtPayments: 1,
      })
    ).toBe(0);
  });
});
