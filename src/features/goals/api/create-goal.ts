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
      return { ok: false, error: error.message };
    }

    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to create goal.",
    };
  }
}
