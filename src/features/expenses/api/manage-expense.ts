"use server";

import { expenseSchema } from "@/lib/schemas/finance";
import { requireUserId } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action-result";

export async function createExpenseAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = expenseSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the expense fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { supabase, userId } = await requireUserId();
    const expense = parsed.data;
    const { error } = await supabase.from("expenses").insert({
      user_id: userId,
      label: expense.label,
      amount: expense.amount,
      due_day: expense.dueDay,
      is_recurring: expense.isRecurring,
    });

    if (error) {
      console.error("Unable to create Supabase expense", error);
      return { ok: false, error: "Unable to create this expense." };
    }

    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to create expense.",
    };
  }
}

export async function updateExpenseAction(
  id: string,
  input: unknown
): Promise<ActionResult<null>> {
  if (!id) {
    return { ok: false, error: "Expense ID is required." };
  }

  const parsed = expenseSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the expense fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { supabase, userId } = await requireUserId();
    const expense = parsed.data;
    const { error } = await supabase
      .from("expenses")
      .update({
        label: expense.label,
        amount: expense.amount,
        due_day: expense.dueDay,
        is_recurring: expense.isRecurring,
      })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Unable to update Supabase expense", error);
      return { ok: false, error: "Unable to update this expense." };
    }

    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to update expense.",
    };
  }
}

export async function deleteExpenseAction(id: string): Promise<ActionResult<null>> {
  if (!id) {
    return { ok: false, error: "Expense ID is required." };
  }

  try {
    const { supabase, userId } = await requireUserId();
    const { error } = await supabase.from("expenses").delete().eq("id", id).eq("user_id", userId);

    if (error) {
      console.error("Unable to delete Supabase expense", error);
      return { ok: false, error: "Unable to delete this expense." };
    }

    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to delete expense.",
    };
  }
}
