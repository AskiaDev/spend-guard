import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  upsert: vi.fn(),
  profileUpdateEq: vi.fn(),
  deleteEq: vi.fn(),
  insert: vi.fn(),
  requireUserId: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ requireUserId: mocks.requireUserId }));

import { saveFinancialProfileAction } from "./save-financial-profile";

describe("saveFinancialProfileAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upsert.mockResolvedValue({ error: null });
    mocks.profileUpdateEq.mockResolvedValue({ error: null });
    mocks.deleteEq.mockResolvedValue({ error: null });
    mocks.insert.mockResolvedValue({ error: null });
    const supabase = {
      from: vi.fn((table: string) =>
        table === "profiles"
          ? { upsert: mocks.upsert, update: () => ({ eq: mocks.profileUpdateEq }) }
          : { delete: () => ({ eq: mocks.deleteEq }), insert: mocks.insert }
      ),
    };
    mocks.requireUserId.mockResolvedValue({ supabase, userId: "user-1" });
  });

  it("updates an existing profile through the unique user_id constraint", async () => {
    await expect(
      saveFinancialProfileAction({
        profile: {
          currency: "PHP",
          monthlyIncome: 90_000,
          currentSavings: 180_000,
          emergencyFundTarget: 150_000,
        },
        expenses: [],
        debts: [],
        goals: [],
      })
    ).resolves.toEqual({ ok: true, data: null });

    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        monthly_income: 90_000,
        emergency_buffer: 0,
        cooldown_preference: "balanced",
        intent: [],
        spending_pain_points: [],
        emergency_fund_target: 0,
        full_name: null,
        pay_frequency: "monthly",
        estimated_variable_expenses: 0,
      }),
      { onConflict: "user_id" }
    );
    expect(mocks.profileUpdateEq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("persists profile completeness fields and marks onboarding complete", async () => {
    await expect(
      saveFinancialProfileAction({
        profile: {
          currency: "PHP",
          monthlyIncome: 90_000,
          currentSavings: 180_000,
          emergencyBuffer: 100_000,
          cooldownPreference: "strict",
          intent: ["stop_impulse"],
          spendingPainPoints: ["forget_bills"],
          emergencyFundTarget: 150_000,
          fullName: "  Askia  ",
          payFrequency: "weekly",
          estimatedVariableExpenses: 12_000,
        },
        expenses: [],
        debts: [],
        goals: [],
      })
    ).resolves.toEqual({ ok: true, data: null });

    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        emergency_buffer: 100_000,
        cooldown_preference: "strict",
        intent: ["stop_impulse"],
        spending_pain_points: ["forget_bills"],
        emergency_fund_target: 0,
        full_name: "Askia",
        pay_frequency: "weekly",
        estimated_variable_expenses: 12_000,
      }),
      { onConflict: "user_id" }
    );
    expect(mocks.profileUpdateEq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("rejects invalid setup before accessing Supabase", async () => {
    await expect(saveFinancialProfileAction({ profile: {} })).resolves.toMatchObject({
      ok: false,
      error: "Check the profile fields.",
    });
    expect(mocks.requireUserId).not.toHaveBeenCalled();
  });

  it("returns a safe error when profile upsert fails", async () => {
    mocks.upsert.mockResolvedValueOnce({ error: { message: "constraint details" } });

    await expect(
      saveFinancialProfileAction({
        profile: {
          currency: "PHP",
          monthlyIncome: 1,
          currentSavings: 1,
          emergencyFundTarget: 1,
        },
        expenses: [],
        debts: [],
        goals: [],
      })
    ).resolves.toEqual({ ok: false, error: "Unable to save your financial profile." });
  });

  it("stops when old setup rows cannot be deleted", async () => {
    mocks.deleteEq.mockResolvedValueOnce({ error: { message: "delete failed" } });

    await expect(
      saveFinancialProfileAction({
        profile: {
          currency: "PHP",
          monthlyIncome: 1,
          currentSavings: 1,
          emergencyFundTarget: 1,
        },
        expenses: [],
        debts: [],
        goals: [],
      })
    ).resolves.toEqual({ ok: false, error: "Unable to replace your financial setup." });
  });

  it("inserts populated expense, debt, and goal rows", async () => {
    const result = await saveFinancialProfileAction({
      profile: {
        currency: "PHP",
        monthlyIncome: 90_000,
        currentSavings: 180_000,
        emergencyFundTarget: 150_000,
      },
      expenses: [
        { label: "Rent", amount: 28_000, dueDay: 1, isRecurring: true },
      ],
      debts: [
        {
          label: "Card",
          outstandingBalance: 20_000,
          minimumPayment: 2_000,
          dueDay: 15,
          interestRate: 0.2,
        },
      ],
      goals: [
        {
          label: "Buffer",
          targetAmount: 150_000,
          savedAmount: 20_000,
          monthlyContribution: 8_000,
          targetDate: "2026-12-31",
          priority: "high",
        },
      ],
    });

    expect(result).toEqual({ ok: true, data: null });
    expect(mocks.insert).toHaveBeenCalledTimes(3);
    expect(mocks.insert).toHaveBeenCalledWith([
      expect.objectContaining({ user_id: "user-1", label: "Rent" }),
    ]);
  });

  it("reports a populated-row insert failure", async () => {
    mocks.insert.mockResolvedValueOnce({ error: { message: "insert failed" } });

    await expect(
      saveFinancialProfileAction({
        profile: {
          currency: "PHP",
          monthlyIncome: 1,
          currentSavings: 1,
          emergencyFundTarget: 1,
        },
        expenses: [{ label: "Rent", amount: 1, dueDay: 1, isRecurring: true }],
        debts: [],
        goals: [],
      })
    ).resolves.toEqual({ ok: false, error: "Unable to save your financial setup." });

    expect(mocks.profileUpdateEq).not.toHaveBeenCalled();
  });

  it("reports a completion flag failure after setup rows are saved", async () => {
    mocks.profileUpdateEq.mockResolvedValueOnce({ error: { message: "update failed" } });

    await expect(
      saveFinancialProfileAction({
        profile: {
          currency: "PHP",
          monthlyIncome: 1,
          currentSavings: 1,
          emergencyFundTarget: 1,
        },
        expenses: [],
        debts: [],
        goals: [],
      })
    ).resolves.toEqual({ ok: false, error: "Unable to finish your financial profile." });
  });
});
