import { describe, expect, it } from "vitest";

import { getCooldownDays } from "./cooldown";
import { calculateCooldownDays } from "./purchase-decision";

describe("PRD cooldown recommendations", () => {
  it("uses price tiers from PRD section 19.5", () => {
    expect(getCooldownDays(1_999)).toBe(1);
    expect(getCooldownDays(2_000)).toBe(3);
    expect(getCooldownDays(9_999)).toBe(3);
    expect(getCooldownDays(10_000)).toBe(7);
    expect(getCooldownDays(49_999)).toBe(7);
    expect(getCooldownDays(50_000)).toBe(30);
  });

  it("keeps the legacy helper signature while ignoring urgency and safe-to-spend", () => {
    expect(
      calculateCooldownDays({
        amount: 50_000,
        safeToSpend: 100_000,
        urgency: "need_now",
      })
    ).toBe(30);
  });
});
