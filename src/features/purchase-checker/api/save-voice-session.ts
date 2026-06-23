"use server";

import { z } from "zod";
import { requireUserId } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action-result";
import type { Json } from "@/types/database";

const voiceSessionSchema = z.object({
  transcript: z.string().trim().min(1).max(5_000),
  extractedFields: z.object({
    itemName: z.string().optional(),
    amount: z.number().nonnegative().optional(),
    urgency: z.enum(["need_now", "need_this_month", "can_wait", "want"]).optional(),
    paymentMethod: z.enum(["cash", "installment", "credit_card", "loan", "bnpl"]).optional(),
    installmentMonths: z.number().int().positive().optional(),
    monthlyPayment: z.number().nonnegative().optional(),
    requiresConfirmation: z.literal(true),
    confidence: z.number().min(0).max(1),
  }),
});

export async function saveVoiceSessionAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = voiceSessionSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: "Review the voice transcript before confirming it." };
  }

  try {
    const { supabase, userId } = await requireUserId();
    const extractedFields = Object.fromEntries(
      Object.entries(parsed.data.extractedFields).filter((entry) => entry[1] !== undefined)
    ) as Json;
    const { error } = await supabase.from("voice_sessions").insert({
      user_id: userId,
      transcript: parsed.data.transcript,
      extracted_fields: extractedFields,
    });

    if (error) {
      console.error("Unable to save Supabase voice session", error);
      return { ok: false, error: "Unable to save this voice session." };
    }

    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save voice session.",
    };
  }
}
