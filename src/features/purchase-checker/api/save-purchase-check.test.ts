import { describe, expect, it, vi } from "vitest";
import { savePurchaseCheck } from "./save-purchase-check";

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
      cooldownDays: 7,
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
        down_payment: 5_000,
        is_income_generating: true,
        current_alternative_still_works: false,
        risk_score: 50,
        savings_after_purchase: 15_000,
        cooldown_days: 7,
      })
    );
  });
});
