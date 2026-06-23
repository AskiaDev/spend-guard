"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { purchaseInputSchema } from "@/lib/schemas/finance";
import { requireUserId } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action-result";
import type { Database } from "@/types/database";
import type { PurchaseCheck, PurchaseInput } from "@/types/finance";

interface SavedPurchaseCheck {
  id: string;
  createdAt: string;
}

export async function savePurchaseCheck(
  supabase: SupabaseClient<Database>,
  userId: string,
  purchase: PurchaseInput,
  check: Omit<PurchaseCheck, "id" | "createdAt">
): Promise<ActionResult<SavedPurchaseCheck>> {
  const { data, error } = await supabase
    .from("purchase_checks")
    .insert({
      user_id: userId,
      item_name: purchase.itemName,
      amount: purchase.amount,
      urgency: purchase.urgency,
      payment_method: purchase.paymentMethod,
      installment_months: purchase.installmentMonths ?? null,
      monthly_payment: purchase.monthlyPayment ?? null,
      decision: check.decision,
      safe_to_spend: check.safeToSpend,
      monthly_free_cash_flow: check.monthlyFreeCashFlow,
      advisor_text: check.advisorText,
      reasons: check.reasons,
    })
    .select("id, created_at")
    .single();

  if (error) {
    console.error("Unable to save Supabase purchase check", error);
    return { ok: false, error: "Unable to save this purchase check." };
  }

  return { ok: true, data: { id: data.id, createdAt: data.created_at } };
}

export async function savePurchaseCheckAction(
  input: unknown,
  check: Omit<PurchaseCheck, "id" | "createdAt">
): Promise<ActionResult<SavedPurchaseCheck>> {
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
    return await savePurchaseCheck(supabase, userId, parsed.data, check);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save purchase check.",
    };
  }
}
