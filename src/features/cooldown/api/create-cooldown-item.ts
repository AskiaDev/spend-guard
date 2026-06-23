"use server";

import { z } from "zod";
import { purchaseInputSchema } from "@/lib/schemas/finance";
import { requireUserId } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action-result";

const cooldownSchema = purchaseInputSchema.extend({
  sourceCheckId: z.string().optional(),
  recheckAt: z.string().min(1),
});

export async function createCooldownItemAction(
  input: unknown
): Promise<ActionResult<null>> {
  const parsed = cooldownSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the cooldown fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { supabase, userId } = await requireUserId();
    const item = parsed.data;
    const { error } = await supabase.from("cooldown_items").insert({
      user_id: userId,
      item_name: item.itemName,
      amount: item.amount,
      urgency: item.urgency,
      payment_method: item.paymentMethod,
      source_check_id: item.sourceCheckId ?? null,
      recheck_at: item.recheckAt,
    });

    if (error) {
      console.error("Unable to create Supabase cooldown item", error);
      return { ok: false, error: "Unable to add this cooldown item." };
    }

    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to create cooldown item.",
    };
  }
}

export async function deleteCooldownItemAction(id: string): Promise<ActionResult<null>> {
  if (!id) {
    return { ok: false, error: "Cooldown item ID is required." };
  }

  try {
    const { supabase, userId } = await requireUserId();
    const { error } = await supabase
      .from("cooldown_items")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Unable to delete Supabase cooldown item", error);
      return { ok: false, error: "Unable to remove this cooldown item." };
    }

    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to remove cooldown item.",
    };
  }
}
