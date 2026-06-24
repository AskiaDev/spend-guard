import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteFinancialDataAction,
  deleteVoiceSessionsAction,
  updateProfileSettingsAction,
} from "./manage-settings";

vi.mock("@/lib/supabase/server", () => ({ requireUserId: vi.fn() }));

import { requireUserId } from "@/lib/supabase/server";

const mockedRequireUserId = vi.mocked(requireUserId);

describe("settings actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upserts profile settings for the authenticated user", async () => {
    const upsert = vi.fn(async () => ({ error: null }));
    const supabase = { from: vi.fn(() => ({ upsert })) };
    mockedRequireUserId.mockResolvedValueOnce({ supabase, userId: "user-1" } as never);

    const result = await updateProfileSettingsAction({
      currency: "PHP",
      monthlyIncome: 95_000,
      currentSavings: 180_000,
      emergencyFundTarget: 150_000,
      fullName: "  Askia  ",
      payFrequency: "weekly",
      estimatedVariableExpenses: 12_000,
    });

    expect(result).toEqual({ ok: true, data: null });
    expect(supabase.from).toHaveBeenCalledWith("profiles");
    expect(upsert).toHaveBeenCalledWith(
      {
        user_id: "user-1",
        currency: "PHP",
        monthly_income: 95_000,
        current_savings: 180_000,
        emergency_fund_target: 150_000,
        full_name: "Askia",
        pay_frequency: "weekly",
        estimated_variable_expenses: 12_000,
        onboarding_completed: true,
      },
      { onConflict: "user_id" }
    );
  });

  it("rejects invalid settings before auth or database access", async () => {
    const result = await updateProfileSettingsAction({
      currency: "BTC",
      monthlyIncome: -1,
      currentSavings: -1,
      emergencyFundTarget: -1,
      payFrequency: "hourly",
      estimatedVariableExpenses: -1,
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ error: "Check the settings fields." });
    expect(mockedRequireUserId).not.toHaveBeenCalled();
  });

  it("returns a friendly error when profile update fails", async () => {
    const upsert = vi.fn(async () => ({ error: { message: "upsert failed" } }));
    const supabase = { from: vi.fn(() => ({ upsert })) };
    mockedRequireUserId.mockResolvedValueOnce({ supabase, userId: "user-1" } as never);

    const result = await updateProfileSettingsAction({
      currency: "PHP",
      monthlyIncome: 95_000,
      currentSavings: 180_000,
      emergencyFundTarget: 150_000,
      payFrequency: "monthly",
      estimatedVariableExpenses: 0,
    });

    expect(result).toEqual({ ok: false, error: "Unable to update your settings." });
  });

  it("deletes all app financial rows for the authenticated user", async () => {
    const eq = vi.fn(async () => ({ error: null }));
    const remove = vi.fn(() => ({ eq }));
    const supabase = { from: vi.fn(() => ({ delete: remove })) };
    mockedRequireUserId.mockResolvedValueOnce({ supabase, userId: "user-1" } as never);

    const result = await deleteFinancialDataAction();

    expect(result).toEqual({ ok: true, data: null });
    expect(supabase.from).toHaveBeenCalledTimes(9);
    expect(supabase.from).toHaveBeenCalledWith("profiles");
    expect(supabase.from).toHaveBeenCalledWith("expenses");
    expect(supabase.from).toHaveBeenCalledWith("debts");
    expect(supabase.from).toHaveBeenCalledWith("goals");
    expect(supabase.from).toHaveBeenCalledWith("purchase_checks");
    expect(supabase.from).toHaveBeenCalledWith("cooldown_items");
    expect(supabase.from).toHaveBeenCalledWith("weekly_reports");
    expect(supabase.from).toHaveBeenCalledWith("transactions");
    expect(supabase.from).toHaveBeenCalledWith("voice_sessions");
    expect(eq).toHaveBeenCalledTimes(9);
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("returns a friendly error when any data deletion fails", async () => {
    const eq = vi
      .fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: "delete failed" } });
    const remove = vi.fn(() => ({ eq }));
    const supabase = { from: vi.fn(() => ({ delete: remove })) };
    mockedRequireUserId.mockResolvedValueOnce({ supabase, userId: "user-1" } as never);

    const result = await deleteFinancialDataAction();

    expect(result).toEqual({ ok: false, error: "Unable to delete your financial data." });
  });

  it("deletes only voice transcripts for the authenticated user", async () => {
    const eq = vi.fn(async () => ({ error: null }));
    const remove = vi.fn(() => ({ eq }));
    const supabase = { from: vi.fn(() => ({ delete: remove })) };
    mockedRequireUserId.mockResolvedValueOnce({ supabase, userId: "user-1" } as never);

    const result = await deleteVoiceSessionsAction();

    expect(result).toEqual({ ok: true, data: null });
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(supabase.from).toHaveBeenCalledWith("voice_sessions");
    expect(eq).toHaveBeenCalledExactlyOnceWith("user_id", "user-1");
  });

  it("returns a friendly error when transcript deletion fails", async () => {
    const eq = vi.fn(async () => ({ error: { message: "delete failed" } }));
    const remove = vi.fn(() => ({ eq }));
    const supabase = { from: vi.fn(() => ({ delete: remove })) };
    mockedRequireUserId.mockResolvedValueOnce({ supabase, userId: "user-1" } as never);

    const result = await deleteVoiceSessionsAction();

    expect(result).toEqual({ ok: false, error: "Unable to delete your voice transcripts." });
  });

  it("surfaces an error when the user is not authenticated", async () => {
    mockedRequireUserId.mockRejectedValueOnce(new Error("Not authenticated."));

    const result = await deleteVoiceSessionsAction();

    expect(result).toEqual({ ok: false, error: "Not authenticated." });
  });
});
