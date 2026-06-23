import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCooldownItemAction, deleteCooldownItemAction } from "./create-cooldown-item";

vi.mock("@/lib/supabase/server", () => ({ requireUserId: vi.fn() }));

import { requireUserId } from "@/lib/supabase/server";

const mockedRequireUserId = vi.mocked(requireUserId);

describe("cooldown item actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists the baseline and decision-affecting inputs for the authenticated user", async () => {
    const insert = vi.fn(async () => ({ error: null }));
    const supabase = { from: vi.fn(() => ({ insert })) };
    mockedRequireUserId.mockResolvedValueOnce({ supabase, userId: "user-1" } as never);

    const result = await createCooldownItemAction({
      itemName: "Laptop",
      amount: 80_000,
      urgency: "can_wait",
      paymentMethod: "installment",
      downPayment: 20_000,
      installmentMonths: 12,
      monthlyPayment: 8_000,
      isIncomeGenerating: true,
      currentAlternativeStillWorks: false,
      sourceCheckId: "check-1",
      recheckAt: "2026-07-20T00:00:00.000Z",
      baselineDecision: "WAIT",
      baselineRiskScore: 55,
      baselineSafeToSpend: 60_000,
    });

    expect(result).toEqual({ ok: true, data: null });
    expect(supabase.from).toHaveBeenCalledWith("cooldown_items");
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      item_name: "Laptop",
      amount: 80_000,
      urgency: "can_wait",
      payment_method: "installment",
      source_check_id: "check-1",
      recheck_at: "2026-07-20T00:00:00.000Z",
      down_payment: 20_000,
      installment_months: 12,
      monthly_payment: 8_000,
      is_income_generating: true,
      current_alternative_still_works: false,
      baseline_decision: "WAIT",
      baseline_risk_score: 55,
      baseline_safe_to_spend: 60_000,
    });
  });

  it("defaults optional baseline and input fields when omitted (cash, no baseline)", async () => {
    const insert = vi.fn(async () => ({ error: null }));
    const supabase = { from: vi.fn(() => ({ insert })) };
    mockedRequireUserId.mockResolvedValueOnce({ supabase, userId: "user-1" } as never);

    await createCooldownItemAction({
      itemName: "Coffee grinder",
      amount: 4_000,
      urgency: "want",
      paymentMethod: "cash",
      recheckAt: "2026-07-01T00:00:00.000Z",
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        item_name: "Coffee grinder",
        source_check_id: null,
        down_payment: null,
        installment_months: null,
        monthly_payment: null,
        is_income_generating: false,
        current_alternative_still_works: false,
        baseline_decision: null,
        baseline_risk_score: null,
        baseline_safe_to_spend: null,
      })
    );
  });

  it("rejects invalid payloads before auth or database access", async () => {
    const result = await createCooldownItemAction({
      itemName: "",
      amount: 0,
      urgency: "want",
      paymentMethod: "cash",
      recheckAt: "",
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ error: "Check the cooldown fields." });
    expect(mockedRequireUserId).not.toHaveBeenCalled();
  });

  it("returns a friendly error when insertion fails", async () => {
    const insert = vi.fn(async () => ({ error: { message: "insert failed" } }));
    const supabase = { from: vi.fn(() => ({ insert })) };
    mockedRequireUserId.mockResolvedValueOnce({ supabase, userId: "user-1" } as never);

    const result = await createCooldownItemAction({
      itemName: "Laptop",
      amount: 80_000,
      urgency: "can_wait",
      paymentMethod: "cash",
      recheckAt: "2026-07-20T00:00:00.000Z",
    });

    expect(result).toEqual({ ok: false, error: "Unable to add this cooldown item." });
  });

  it("deletes cooldown items only for the authenticated user", async () => {
    const eqUser = vi.fn(async () => ({ error: null }));
    const eqId = vi.fn(() => ({ eq: eqUser }));
    const remove = vi.fn(() => ({ eq: eqId }));
    const supabase = { from: vi.fn(() => ({ delete: remove })) };
    mockedRequireUserId.mockResolvedValueOnce({ supabase, userId: "user-1" } as never);

    const result = await deleteCooldownItemAction("cooldown-1");

    expect(result).toEqual({ ok: true, data: null });
    expect(supabase.from).toHaveBeenCalledWith("cooldown_items");
    expect(eqId).toHaveBeenCalledWith("id", "cooldown-1");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
  });
});
