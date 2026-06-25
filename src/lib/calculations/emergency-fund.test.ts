import { describe, expect, it } from "vitest";

import {
  calculateEmergencyBuffer,
  calculateEmergencyFundProgress,
} from "./emergency-fund";

describe("PRD emergency-fund calculations", () => {
  describe("calculateEmergencyBuffer", () => {
    it("returns the chosen buffer", () => {
      expect(calculateEmergencyBuffer({ currentSavings: 8000, emergencyBuffer: 10000 })).toBe(
        10000
      );
    });

    it("does not cap the buffer at current savings", () => {
      expect(calculateEmergencyBuffer({ currentSavings: 3000, emergencyBuffer: 20000 })).toBe(
        20000
      );
    });

    it("clamps a negative buffer to zero", () => {
      expect(calculateEmergencyBuffer({ currentSavings: 5000, emergencyBuffer: -100 })).toBe(0);
    });
  });

  describe("calculateEmergencyFundProgress", () => {
    it("is zero when the buffer is zero", () => {
      expect(calculateEmergencyFundProgress({ currentSavings: 5000, emergencyBuffer: 0 })).toBe(0);
    });

    it("is the savings-to-buffer ratio, capped at 100", () => {
      expect(calculateEmergencyFundProgress({ currentSavings: 5000, emergencyBuffer: 10000 })).toBe(
        50
      );
      expect(
        calculateEmergencyFundProgress({ currentSavings: 12000, emergencyBuffer: 10000 })
      ).toBe(100);
    });
  });
});
