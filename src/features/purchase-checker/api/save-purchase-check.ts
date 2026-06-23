"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { purchaseInputSchema } from "@/lib/schemas/finance";
import { requireUserId } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action-result";
import type { Database } from "@/types/database";
import { PURCHASE_CHECK_STATUSES } from "@/types/finance";
import type { PurchaseCheck, PurchaseCheckStatus, PurchaseInput } from "@/types/finance";

interface SavedPurchaseCheck {
  id: string;
  createdAt: string;
}

const purchaseCheckStatusSchema = z.enum(PURCHASE_CHECK_STATUSES);

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
      category: purchase.category ?? null,
      sale_deadline: purchase.saleDeadline ?? null,
      location: purchase.location ?? null,
      notes: purchase.notes ?? null,
      urgency: purchase.urgency,
      payment_method: purchase.paymentMethod,
      down_payment: purchase.downPayment ?? null,
      installment_months: purchase.installmentMonths ?? null,
      monthly_payment: purchase.monthlyPayment ?? null,
      is_income_generating: purchase.isIncomeGenerating ?? false,
      current_alternative_still_works: purchase.currentAlternativeStillWorks ?? false,
      decision: check.decision,
      risk_score: check.riskScore,
      safe_to_spend: check.safeToSpend,
      monthly_free_cash_flow: check.monthlyFreeCashFlow,
      savings_after_purchase: check.savingsAfterPurchase,
      emergency_fund_progress: check.emergencyProgress ?? 0,
      debt_pressure: check.debtPressure ?? 0,
      goal_delay_months: check.goalDelayMonths ?? 0,
      health_score: check.healthScore ?? 0,
      cooldown_days: check.cooldownDays,
      status: check.status ?? "checked",
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

export async function markPurchaseCheckStatus(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string,
  status: PurchaseCheckStatus
): Promise<ActionResult<null>> {
  if (!id) {
    return { ok: false, error: "Purchase check ID is required." };
  }

  const parsedStatus = purchaseCheckStatusSchema.safeParse(status);

  if (!parsedStatus.success) {
    return { ok: false, error: "Check the purchase status." };
  }

  const { error } = await supabase
    .from("purchase_checks")
    .update({ status: parsedStatus.data })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("Unable to update Supabase purchase check status", error);
    return { ok: false, error: "Unable to update this purchase status." };
  }

  return { ok: true, data: null };
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

export async function markPurchaseCheckStatusAction(
  id: string,
  status: PurchaseCheckStatus
): Promise<ActionResult<null>> {
  try {
    const { supabase, userId } = await requireUserId();
    return await markPurchaseCheckStatus(supabase, userId, id, status);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to update purchase status.",
    };
  }
}
