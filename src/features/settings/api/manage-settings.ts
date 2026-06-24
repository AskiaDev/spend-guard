"use server";

import { financialProfileSchema } from "@/lib/schemas/finance";
import { requireUserId } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action-result";
import type { Database } from "@/types/database";

const financialDataTables = [
  "cooldown_items",
  "weekly_reports",
  "voice_sessions",
  "transactions",
  "purchase_checks",
  "goals",
  "expenses",
  "debts",
  "profiles",
] as const satisfies readonly (keyof Database["public"]["Tables"])[];

export async function updateProfileSettingsAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = financialProfileSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the settings fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { supabase, userId } = await requireUserId();
    const profile = parsed.data;
    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: userId,
          currency: profile.currency,
          monthly_income: profile.monthlyIncome,
          current_savings: profile.currentSavings,
          emergency_fund_target: profile.emergencyFundTarget,
          full_name: profile.fullName?.trim() || null,
          pay_frequency: profile.payFrequency,
          estimated_variable_expenses: profile.estimatedVariableExpenses,
          onboarding_completed: true,
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("Unable to update Supabase profile settings", error);
      return { ok: false, error: "Unable to update your settings." };
    }

    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to update settings.",
    };
  }
}

export async function deleteFinancialDataAction(): Promise<ActionResult<null>> {
  try {
    const { supabase, userId } = await requireUserId();
    const deletions = await Promise.all(
      financialDataTables.map((table) => supabase.from(table).delete().eq("user_id", userId))
    );
    const error = deletions.find((result) => result.error)?.error;

    if (error) {
      console.error("Unable to delete Supabase financial data", error);
      return { ok: false, error: "Unable to delete your financial data." };
    }

    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to delete financial data.",
    };
  }
}
