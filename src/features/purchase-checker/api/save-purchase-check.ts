"use server";

import { purchaseInputSchema } from "@/lib/schemas/finance";
import { requireUserId } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action-result";
import type { PurchaseCheck } from "@/types/finance";

export async function savePurchaseCheckAction(
  input: unknown,
  check: Omit<PurchaseCheck, "id" | "createdAt">
): Promise<ActionResult<null>> {
  const parsed = purchaseInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the purchase fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { supabase, userId } = await requireUserId();
    const { error } = await supabase.from("purchase_checks").insert({
      user_id: userId,
      item_name: parsed.data.itemName,
      amount: parsed.data.amount,
      urgency: parsed.data.urgency,
      payment_method: parsed.data.paymentMethod,
      installment_months: parsed.data.installmentMonths ?? null,
      monthly_payment: parsed.data.monthlyPayment ?? null,
      decision: check.decision,
      safe_to_spend: check.safeToSpend,
      monthly_free_cash_flow: check.monthlyFreeCashFlow,
      advisor_text: check.advisorText,
      reasons: check.reasons,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save purchase check.",
    };
  }
}
