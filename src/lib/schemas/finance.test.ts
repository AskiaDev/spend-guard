import { describe, expect, it } from "vitest";
import { financialProfileSchema, purchaseInputSchema } from "./finance";

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

describe("purchaseInputSchema", () => {
  it("accepts PRD purchase decision fields", () => {
    const parsed = purchaseInputSchema.parse({
      itemName: "Phone",
      amount: "25000",
      urgency: "can_wait",
      paymentMethod: "installment",
      downPayment: "5000",
      installmentMonths: "12",
      monthlyPayment: "2500",
      isIncomeGenerating: "true",
      currentAlternativeStillWorks: "false",
    });

    expect(parsed).toMatchObject({
      amount: 25_000,
      downPayment: 5_000,
      installmentMonths: 12,
      monthlyPayment: 2_500,
      isIncomeGenerating: true,
      currentAlternativeStillWorks: false,
    });
  });
});
