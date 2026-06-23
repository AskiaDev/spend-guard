import { describe, expect, it } from "vitest";

import {
  calculateEmergencyBuffer,
  calculateEmergencyFundProgress,
} from "./emergency-fund";

describe("PRD emergency-fund calculations", () => {
  it("calculates emergency fund progress as a bounded percentage", () => {
    expect(
      calculateEmergencyFundProgress({
        currentSavings: 120_000,
        emergencyFundTarget: 180_000,
      })
    ).toBe(67);
    expect(
      calculateEmergencyFundProgress({
        currentSavings: 250_000,
        emergencyFundTarget: 180_000,
      })
    ).toBe(100);
  });

  it("returns zero progress when the target is not positive", () => {
    expect(
      calculateEmergencyFundProgress({
        currentSavings: 10_000,
        emergencyFundTarget: 0,
      })
    ).toBe(0);
  });

  it("derives the snapshot emergency buffer from the PRD protected-savings example", () => {
    expect(
      calculateEmergencyBuffer({
        currentSavings: 24_000,
        emergencyFundTarget: 100_000,
      })
    ).toBe(20_000);
    expect(
      calculateEmergencyBuffer({
        currentSavings: 5_000,
        emergencyFundTarget: 100_000,
      })
    ).toBe(5_000);
  });
});
