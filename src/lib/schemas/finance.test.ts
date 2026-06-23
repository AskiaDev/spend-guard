import { describe, expect, it } from "vitest";
import { financialProfileSchema } from "./finance";

describe("financialProfileSchema", () => {
  it("parses profile completeness fields and applies safe defaults", () => {
    expect(
      financialProfileSchema.parse({
        currency: "PHP",
        monthlyIncome: 90_000,
        currentSavings: 130_000,
        emergencyFundTarget: 240_000,
      })
    ).toEqual({
      currency: "PHP",
      monthlyIncome: 90_000,
      currentSavings: 130_000,
      emergencyFundTarget: 240_000,
      fullName: undefined,
      payFrequency: "monthly",
      estimatedVariableExpenses: 0,
    });

    expect(
      financialProfileSchema.parse({
        currency: "PHP",
        monthlyIncome: 90_000,
        currentSavings: 130_000,
        emergencyFundTarget: 240_000,
        fullName: "  Askia  ",
        payFrequency: "biweekly",
        estimatedVariableExpenses: 12_000,
      })
    ).toMatchObject({
      fullName: "Askia",
      payFrequency: "biweekly",
      estimatedVariableExpenses: 12_000,
    });
  });

  it("rejects unsupported pay frequency and negative variable expenses", () => {
    expect(() =>
      financialProfileSchema.parse({
        currency: "PHP",
        monthlyIncome: 90_000,
        currentSavings: 130_000,
        emergencyFundTarget: 240_000,
        payFrequency: "quarterly",
        estimatedVariableExpenses: 0,
      })
    ).toThrow();

    expect(() =>
      financialProfileSchema.parse({
        currency: "PHP",
        monthlyIncome: 90_000,
        currentSavings: 130_000,
        emergencyFundTarget: 240_000,
        payFrequency: "monthly",
        estimatedVariableExpenses: -1,
      })
    ).toThrow();
  });
});
