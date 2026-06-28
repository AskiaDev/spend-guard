"use server";

import { revalidatePath } from "next/cache";

import { confirmLedgerSchema } from "@/lib/schemas/ledger";
import { requireUserId } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action-result";

export async function confirmLedgerEntriesAction(
  input: unknown
): Promise<ActionResult<{ inserted: number }>> {
  const parsed = confirmLedgerSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the transactions before saving.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { supabase, userId } = await requireUserId();

    const rows = parsed.data.entries.map((entry) => ({
      user_id: userId,
      amount: entry.amount,
      label: entry.counterparty ?? entry.category,
      occurred_at: entry.occurredAt,
      direction: entry.direction,
      category: entry.category,
      counterparty: entry.counterparty,
      source: "image",
      source_ref: entry.sourceRef,
      confidence: entry.confidence,
      status: "confirmed",
    }));

    const { error } = await supabase.from("transactions").insert(rows);

    if (error) {
      console.error("Unable to insert ledger rows", error);
      return { ok: false, error: "Unable to save these transactions." };
    }

    revalidatePath("/");
    return { ok: true, data: { inserted: rows.length } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save transactions.",
    };
  }
}
