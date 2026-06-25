import { describe, expect, it } from "vitest";
import { toProfileRow } from "./to-profile-row";

describe("toProfileRow", () => {
  it("maps onboarding profile fields to db columns with server userId", () => {
    const row = toProfileRow("user-123", {
      currency: "PHP",
      monthlyIncome: 40_000,
      currentSavings: 20_000,
      emergencyBuffer: 10_000,
      cooldownPreference: "strict",
      intent: ["stop_impulse"],
      spendingPainPoints: ["forget_bills"],
      emergencyFundTarget: 50_000,
      payFrequency: "monthly",
      estimatedVariableExpenses: 8_000,
      fullName: "  Ada  ",
    });

    expect(row).toMatchObject({
      user_id: "user-123",
      emergency_buffer: 10_000,
      cooldown_preference: "strict",
      intent: ["stop_impulse"],
      spending_pain_points: ["forget_bills"],
      emergency_fund_target: 0,
      full_name: "Ada",
    });
  });
});
