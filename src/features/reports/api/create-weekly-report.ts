"use server";

import { z } from "zod";
import { requireUserId } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action-result";

const weeklyReportSchema = z.object({
  weekStart: z.string().min(1),
  summary: z.string().min(1),
  healthScore: z.number().min(0).max(100),
  safeToSpend: z.number().min(0),
});

export async function createWeeklyReportAction(
  input: unknown
): Promise<ActionResult<null>> {
  const parsed = weeklyReportSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the report fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { supabase, userId } = await requireUserId();
    const report = parsed.data;
    const { error } = await supabase.from("weekly_reports").insert({
      user_id: userId,
      week_start: report.weekStart,
      summary: report.summary,
      health_score: report.healthScore,
      safe_to_spend: report.safeToSpend,
    });

    if (error) {
      console.error("Unable to create Supabase weekly report", error);
      return { ok: false, error: "Unable to create this weekly report." };
    }

    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to create weekly report.",
    };
  }
}
