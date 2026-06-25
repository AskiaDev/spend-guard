import { describe, expect, it } from "vitest";
import { blendOver, contrastRatio } from "./contrast";

// Effective card bg = 5% white over the vault base.
const cardBg = blendOver("#ffffff", "#0a0e17", 0.05);

describe("vault token contrast meets WCAG AA", () => {
  it("body text on background", () => {
    expect(contrastRatio("#eaf0f7", "#0a0e17")).toBeGreaterThanOrEqual(4.5);
  });
  it("ink on lime primary", () => {
    expect(contrastRatio("#0a0e17", "#c6f24e")).toBeGreaterThanOrEqual(4.5);
  });
  it("muted text on glass card", () => {
    expect(contrastRatio("#9aa6ba", cardBg)).toBeGreaterThanOrEqual(4.5);
  });
  it("safe verdict text on glass card", () => {
    expect(contrastRatio("#5fd08a", cardBg)).toBeGreaterThanOrEqual(3); // large/badge text
  });
  it("risk verdict text on glass card", () => {
    expect(contrastRatio("#ff8585", cardBg)).toBeGreaterThanOrEqual(3);
  });
});
