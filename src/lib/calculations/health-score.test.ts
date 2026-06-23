import { describe, expect, it } from "vitest";

import { calculateHealthScore, getHealthStatus } from "./health-score";

describe("PRD health score", () => {
  it("applies the section 19.6 weights", () => {
    expect(
      calculateHealthScore({
        emergencyFundProgress: 80,
        debtPressureScore: 70,
        cashFlowScore: 60,
        goalProgressScore: 50,
        purchaseDisciplineScore: 40,
      })
    ).toBe(65);
  });

  it("maps health score status boundaries", () => {
    expect(getHealthStatus(80)).toBe("Strong");
    expect(getHealthStatus(60)).toBe("Stable");
    expect(getHealthStatus(40)).toBe("Caution");
    expect(getHealthStatus(39)).toBe("Risky");
  });
});
