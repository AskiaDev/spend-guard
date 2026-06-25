import { describe, expect, it } from "vitest";
import {
  buildOnboardingPayload,
  buildSnapshotFromValues,
  createDefaultValues,
} from "./onboarding-form";

describe("buildOnboardingPayload", () => {
  it("drops blank rows and carries the new fields", () => {
    const values = {
      ...createDefaultValues(),
      currency: "PHP" as const,
      monthlyIncome: "40000",
      currentSavings: "20000",
      emergencyBuffer: "10000",
      cooldownPreference: "strict" as const,
      intent: ["stop_impulse"],
      spendingPainPoints: ["forget_bills"],
      expenses: [
        { label: "Rent", amount: "12000", dueDay: "1", isRecurring: true },
        { label: "", amount: "", dueDay: "", isRecurring: true },
      ],
    };

    const payload = buildOnboardingPayload(values);
    expect(payload.profile.emergencyBuffer).toBe(10000);
    expect(payload.profile.cooldownPreference).toBe("strict");
    expect(payload.expenses).toHaveLength(1);
  });

  it("drops incomplete optional goal rows", () => {
    const payload = buildOnboardingPayload({
      ...createDefaultValues(),
      monthlyIncome: "40000",
      currentSavings: "20000",
      goals: [
        {
          label: "Travel",
          targetAmount: "",
          savedAmount: "",
          monthlyContribution: "",
          targetDate: "",
          priority: "medium",
        },
      ],
    });

    expect(payload.goals).toEqual([]);
  });
});

describe("buildSnapshotFromValues", () => {
  it("produces a numeric FinancialSnapshot", () => {
    const snapshot = buildSnapshotFromValues({
      ...createDefaultValues(),
      monthlyIncome: "40000",
      currentSavings: "20000",
      emergencyBuffer: "10000",
      cooldownPreference: "balanced",
    });
    expect(snapshot.profile.currentSavings).toBe(20000);
    expect(snapshot.profile.emergencyBuffer).toBe(10000);
    expect(snapshot.expenses).toEqual([]);
  });
});
