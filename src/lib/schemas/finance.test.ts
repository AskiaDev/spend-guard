import { describe, expect, it } from "vitest";
import { debtSchema, expenseSchema, financialProfileSchema, purchaseInputSchema } from "./finance";

describe("financialProfileSchema", () => {
  const baseProfile = {
    currency: "PHP",
    monthlyIncome: 40_000,
    currentSavings: 20_000,
    emergencyBuffer: 10_000,
    cooldownPreference: "strict",
    intent: ["stop_impulse"],
    spendingPainPoints: ["only_check_balance"],
    emergencyFundTarget: 0,
    payFrequency: "monthly",
    estimatedVariableExpenses: 8_000,
  };

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
      emergencyBuffer: 0,
      cooldownPreference: "balanced",
      intent: [],
      spendingPainPoints: [],
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

  it("parses new onboarding profile fields", () => {
    const parsed = financialProfileSchema.parse(baseProfile);

    expect(parsed.emergencyBuffer).toBe(10_000);
    expect(parsed.cooldownPreference).toBe("strict");
    expect(parsed.intent).toEqual(["stop_impulse"]);
    expect(parsed.spendingPainPoints).toEqual(["only_check_balance"]);
  });

  it("defaults cooldownPreference to balanced and arrays to empty when omitted", () => {
    const parsed = financialProfileSchema.parse({
      currency: baseProfile.currency,
      monthlyIncome: baseProfile.monthlyIncome,
      currentSavings: baseProfile.currentSavings,
      emergencyBuffer: 0,
      emergencyFundTarget: baseProfile.emergencyFundTarget,
      payFrequency: baseProfile.payFrequency,
      estimatedVariableExpenses: baseProfile.estimatedVariableExpenses,
    });

    expect(parsed.emergencyBuffer).toBe(0);
    expect(parsed.cooldownPreference).toBe("balanced");
    expect(parsed.intent).toEqual([]);
    expect(parsed.spendingPainPoints).toEqual([]);
  });

  it("trims profile array items and rejects blank entries", () => {
    const parsed = financialProfileSchema.parse({
      ...baseProfile,
      intent: ["  stop_impulse  "],
      spendingPainPoints: ["  only_check_balance  "],
    });

    expect(parsed.intent).toEqual(["stop_impulse"]);
    expect(parsed.spendingPainPoints).toEqual(["only_check_balance"]);

    expect(() =>
      financialProfileSchema.parse({
        ...baseProfile,
        intent: ["   "],
      })
    ).toThrow();

    expect(() =>
      financialProfileSchema.parse({
        ...baseProfile,
        spendingPainPoints: ["   "],
      })
    ).toThrow();
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
      category: "phone",
      saleDeadline: "2026-07-15",
      location: "  Makati showroom  ",
      notes: "  Ask if the store includes delivery.  ",
      downPayment: "5000",
      installmentMonths: "12",
      monthlyPayment: "2500",
      isIncomeGenerating: "true",
      currentAlternativeStillWorks: "false",
    });

    expect(parsed).toMatchObject({
      amount: 25_000,
      category: "phone",
      saleDeadline: "2026-07-15",
      location: "Makati showroom",
      notes: "Ask if the store includes delivery.",
      downPayment: 5_000,
      installmentMonths: 12,
      monthlyPayment: 2_500,
      isIncomeGenerating: true,
      currentAlternativeStillWorks: false,
    });
  });

  it("rejects invalid manual-check metadata", () => {
    expect(() =>
      purchaseInputSchema.parse({
        itemName: "Phone",
        amount: 25_000,
        urgency: "can_wait",
        paymentMethod: "cash",
        category: "",
      })
    ).toThrow();

    expect(() =>
      purchaseInputSchema.parse({
        itemName: "Phone",
        amount: 25_000,
        urgency: "can_wait",
        paymentMethod: "cash",
        saleDeadline: "07/15/2026",
      })
    ).toThrow();

    expect(() =>
      purchaseInputSchema.parse({
        itemName: "Phone",
        amount: 25_000,
        urgency: "can_wait",
        paymentMethod: "cash",
        location: "x".repeat(121),
      })
    ).toThrow();
  });
});

describe("recurring payment schemas", () => {
  it("defaults expenses and debts to monthly cadence", () => {
    expect(
      expenseSchema.parse({ label: "Rent", amount: 10_000, dueDay: 1, isRecurring: true })
    ).toMatchObject({ paymentCadence: "monthly" });
    expect(
      debtSchema.parse({
        label: "Atome",
        outstandingBalance: 10_900,
        minimumPayment: 3_800,
        dueDay: 6,
      })
    ).toMatchObject({ paymentCadence: "monthly" });
  });

  it("requires a next due date for biweekly recurring rows", () => {
    expect(
      debtSchema.parse({
        label: "Atome",
        outstandingBalance: 10_900,
        minimumPayment: 3_800,
        dueDay: 6,
        paymentCadence: "biweekly",
        nextDueDate: "2026-07-06",
      })
    ).toMatchObject({ paymentCadence: "biweekly", nextDueDate: "2026-07-06" });

    expect(() =>
      expenseSchema.parse({
        label: "Therapy",
        amount: 2_000,
        dueDay: 6,
        isRecurring: true,
        paymentCadence: "biweekly",
      })
    ).toThrow();
  });

  it("requires two different due days for semi-monthly rows", () => {
    expect(
      expenseSchema.parse({
        label: "Rent",
        amount: 14_000,
        dueDay: 1,
        secondDueDay: 15,
        isRecurring: true,
        paymentCadence: "semi_monthly",
      })
    ).toMatchObject({ paymentCadence: "semi_monthly", dueDay: 1, secondDueDay: 15 });

    expect(() =>
      debtSchema.parse({
        label: "Loan",
        outstandingBalance: 30_000,
        minimumPayment: 2_000,
        dueDay: 1,
        secondDueDay: 1,
        paymentCadence: "semi_monthly",
      })
    ).toThrow();
  });
});
