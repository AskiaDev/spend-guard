"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { mapFinancialWorkspaceRows } from "@/lib/supabase/finance-mappers";
import { requireUserId } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action-result";
import type { Database } from "@/types/database";
import type { FinancialWorkspace } from "@/types/finance";

export async function loadFinancialWorkspace(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<ActionResult<FinancialWorkspace>> {
  const [profile, expenses, debts, goals, purchaseChecks, cooldownItems, weeklyReports] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("expenses").select("*").eq("user_id", userId).order("due_day"),
      supabase.from("debts").select("*").eq("user_id", userId).order("due_day"),
      supabase.from("goals").select("*").eq("user_id", userId).order("created_at"),
      supabase
        .from("purchase_checks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase.from("cooldown_items").select("*").eq("user_id", userId).order("recheck_at"),
      supabase
        .from("weekly_reports")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

  const firstError = [
    profile.error,
    expenses.error,
    debts.error,
    goals.error,
    purchaseChecks.error,
    cooldownItems.error,
    weeklyReports.error,
  ].find(Boolean);

  if (firstError) {
    console.error("Unable to load Supabase financial workspace", firstError);
    return { ok: false, error: "Unable to load your financial workspace." };
  }

  return {
    ok: true,
    data: mapFinancialWorkspaceRows({
      profile: profile.data,
      expenses: expenses.data ?? [],
      debts: debts.data ?? [],
      goals: goals.data ?? [],
      purchaseChecks: purchaseChecks.data ?? [],
      cooldownItems: cooldownItems.data ?? [],
      weeklyReports: weeklyReports.data ?? [],
    }),
  };
}

export async function loadFinancialWorkspaceAction(): Promise<ActionResult<FinancialWorkspace>> {
  try {
    const { supabase, userId } = await requireUserId();
    return await loadFinancialWorkspace(supabase, userId);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to load your financial workspace.",
    };
  }
}
