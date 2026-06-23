import { describe, expect, it, vi } from "vitest";
import { markPurchaseCheckStatus, savePurchaseCheck } from "./save-purchase-check";

vi.mock("@/lib/supabase/server", () => ({ requireUserId: vi.fn() }));

describe("savePurchaseCheck", () => {
  it("injects authenticated ownership and returns the database identity", async () => {
    const single = vi.fn(async () => ({
      data: { id: "4fd8e28f-798a-4d71-b279-3ea9473c9ba3", created_at: "2026-06-20T02:00:00Z" },
      error: null,
    }));
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const supabase = { from: vi.fn(() => ({ insert })) };

    const purchase = {
      itemName: "Phone",
      amount: 25_000,
      category: "phone",
      saleDeadline: "2026-07-15",
      location: "Makati showroom",
      notes: "Ask if delivery is included.",
      urgency: "can_wait" as const,
      paymentMethod: "installment" as const,
      downPayment: 5_000,
      isIncomeGenerating: true,
      currentAlternativeStillWorks: false,
    };
    const check = {
      ...purchase,
      decision: "WAIT" as const,
      riskScore: 50,
      safeToSpend: 20_000,
      monthlyFreeCashFlow: 30_000,
      savingsAfterPurchase: 15_000,
      emergencyProgress: 0.5,
      debtPressure: 0.18,
      goalDelayMonths: 3,
      healthScore: 74,
      cooldownDays: 7,
      status: "checked" as const,
      advisorText: "Wait before buying.",
      reasons: ["This would exceed today's safe-to-spend amount."],
    };

    await expect(savePurchaseCheck(supabase as never, "user-1", purchase, check)).resolves.toEqual({
      ok: true,
      data: {
        id: "4fd8e28f-798a-4d71-b279-3ea9473c9ba3",
        createdAt: "2026-06-20T02:00:00Z",
      },
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        item_name: "Phone",
        category: "phone",
        sale_deadline: "2026-07-15",
        location: "Makati showroom",
        notes: "Ask if delivery is included.",
        down_payment: 5_000,
        is_income_generating: true,
        current_alternative_still_works: false,
        risk_score: 50,
        savings_after_purchase: 15_000,
        emergency_fund_progress: 0.5,
        debt_pressure: 0.18,
        goal_delay_months: 3,
        health_score: 74,
        cooldown_days: 7,
        status: "checked",
      })
    );
  });

  it("returns a friendly error when saving the purchase check fails", async () => {
    const single = vi.fn(async () => ({
      data: null,
      error: { message: "insert failed" },
    }));
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const supabase = { from: vi.fn(() => ({ insert })) };
    const purchase = {
      itemName: "Phone",
      amount: 25_000,
      urgency: "can_wait" as const,
      paymentMethod: "cash" as const,
    };
    const check = {
      ...purchase,
      decision: "WAIT" as const,
      riskScore: 50,
      safeToSpend: 20_000,
      monthlyFreeCashFlow: 30_000,
      savingsAfterPurchase: 15_000,
      cooldownDays: 7,
      advisorText: "Wait before buying.",
      reasons: ["This would exceed today's safe-to-spend amount."],
    };

    await expect(savePurchaseCheck(supabase as never, "user-1", purchase, check)).resolves.toEqual({
      ok: false,
      error: "Unable to save this purchase check.",
    });
  });

  it("updates only the authenticated user's purchase-check status", async () => {
    const eqUser = vi.fn(async () => ({ error: null }));
    const eqId = vi.fn(() => ({ eq: eqUser }));
    const update = vi.fn(() => ({ eq: eqId }));
    const supabase = { from: vi.fn(() => ({ update })) };

    await expect(
      markPurchaseCheckStatus(supabase as never, "user-1", "check-1", "bought")
    ).resolves.toEqual({ ok: true, data: null });

    expect(supabase.from).toHaveBeenCalledWith("purchase_checks");
    expect(update).toHaveBeenCalledWith({ status: "bought" });
    expect(eqId).toHaveBeenCalledWith("id", "check-1");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("rejects missing or invalid purchase-check status updates before writing", async () => {
    const update = vi.fn();
    const supabase = { from: vi.fn(() => ({ update })) };

    await expect(
      markPurchaseCheckStatus(supabase as never, "user-1", "", "bought")
    ).resolves.toEqual({ ok: false, error: "Purchase check ID is required." });
    await expect(
      markPurchaseCheckStatus(supabase as never, "user-1", "check-1", "sold" as never)
    ).resolves.toEqual({ ok: false, error: "Check the purchase status." });

    expect(update).not.toHaveBeenCalled();
  });

  it("returns a friendly error when the status update fails", async () => {
    const eqUser = vi.fn(async () => ({ error: { message: "update failed" } }));
    const eqId = vi.fn(() => ({ eq: eqUser }));
    const update = vi.fn(() => ({ eq: eqId }));
    const supabase = { from: vi.fn(() => ({ update })) };

    await expect(
      markPurchaseCheckStatus(supabase as never, "user-1", "check-1", "skipped")
    ).resolves.toEqual({ ok: false, error: "Unable to update this purchase status." });
  });
});
