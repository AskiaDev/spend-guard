"use server";

import { goalSchema } from "@/lib/schemas/finance";
import { requireUserId } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action-result";

export async function createGoalAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = goalSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the goal fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { supabase, userId } = await requireUserId();
    const goal = parsed.data;
    const { error } = await supabase.from("goals").insert({
      user_id: userId,
      label: goal.label,
      target_amount: goal.targetAmount,
      saved_amount: goal.savedAmount,
      monthly_contribution: goal.monthlyContribution,
      target_date: goal.targetDate ?? null,
      priority: goal.priority,
    });

    if (error) {
      console.error("Unable to create Supabase goal", error);
      return { ok: false, error: "Unable to create this goal." };
    }

    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to create goal.",
    };
  }
}

export async function deleteGoalAction(id: string): Promise<ActionResult<null>> {
  if (!id) {
    return { ok: false, error: "Goal ID is required." };
  }

  try {
    const { supabase, userId } = await requireUserId();
    const { error } = await supabase.from("goals").delete().eq("id", id).eq("user_id", userId);

    if (error) {
      console.error("Unable to delete Supabase goal", error);
      return { ok: false, error: "Unable to delete this goal." };
    }

    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to delete goal.",
    };
  }
}
