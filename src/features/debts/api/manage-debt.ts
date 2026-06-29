"use server";

import { debtSchema } from "@/lib/schemas/finance";
import { requireUserId } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action-result";

export async function createDebtAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = debtSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the debt fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { supabase, userId } = await requireUserId();
    const debt = parsed.data;
    const { error } = await supabase.from("debts").insert({
      user_id: userId,
      label: debt.label,
      outstanding_balance: debt.outstandingBalance,
      minimum_payment: debt.minimumPayment,
      due_day: debt.dueDay,
      interest_rate: debt.interestRate ?? null,
      payment_cadence: debt.paymentCadence,
      next_due_date: debt.nextDueDate ?? null,
      second_due_day: debt.secondDueDay ?? null,
    });

    if (error) {
      console.error("Unable to create Supabase debt", error);
      return { ok: false, error: "Unable to create this debt." };
    }

    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to create debt.",
    };
  }
}

export async function updateDebtAction(id: string, input: unknown): Promise<ActionResult<null>> {
  if (!id) {
    return { ok: false, error: "Debt ID is required." };
  }

  const parsed = debtSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the debt fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { supabase, userId } = await requireUserId();
    const debt = parsed.data;
    const { error } = await supabase
      .from("debts")
      .update({
        label: debt.label,
        outstanding_balance: debt.outstandingBalance,
        minimum_payment: debt.minimumPayment,
        due_day: debt.dueDay,
        interest_rate: debt.interestRate ?? null,
        payment_cadence: debt.paymentCadence,
        next_due_date: debt.nextDueDate ?? null,
        second_due_day: debt.secondDueDay ?? null,
      })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Unable to update Supabase debt", error);
      return { ok: false, error: "Unable to update this debt." };
    }

    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to update debt.",
    };
  }
}

export async function deleteDebtAction(id: string): Promise<ActionResult<null>> {
  if (!id) {
    return { ok: false, error: "Debt ID is required." };
  }

  try {
    const { supabase, userId } = await requireUserId();
    const { error } = await supabase.from("debts").delete().eq("id", id).eq("user_id", userId);

    if (error) {
      console.error("Unable to delete Supabase debt", error);
      return { ok: false, error: "Unable to delete this debt." };
    }

    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to delete debt.",
    };
  }
}
