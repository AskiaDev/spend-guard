"use server";

import { z } from "zod";
import {
  debtSchema,
  expenseSchema,
  financialProfileSchema,
  goalSchema,
} from "@/lib/schemas/finance";
import { requireUserId } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action-result";

const setupSchema = z.object({
  profile: financialProfileSchema,
  expenses: z.array(expenseSchema),
  debts: z.array(debtSchema),
  goals: z.array(goalSchema),
});

export async function saveFinancialProfileAction(
  input: unknown
): Promise<ActionResult<null>> {
  const parsed = setupSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the profile fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { supabase, userId } = await requireUserId();
    const { profile, expenses, debts, goals } = parsed.data;

    const profileResult = await supabase
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
        },
        { onConflict: "user_id" }
      );

    if (profileResult.error) {
      console.error("Unable to save Supabase profile", profileResult.error);
      return { ok: false, error: "Unable to save your financial profile." };
    }

    const deletions = await Promise.all([
      supabase.from("expenses").delete().eq("user_id", userId),
      supabase.from("debts").delete().eq("user_id", userId),
      supabase.from("goals").delete().eq("user_id", userId),
    ]);
    const deletionError = deletions.find((result) => result.error)?.error;

    if (deletionError) {
      console.error("Unable to replace Supabase financial setup", deletionError);
      return { ok: false, error: "Unable to replace your financial setup." };
    }

    const inserts = await Promise.all([
      expenses.length
        ? supabase.from("expenses").insert(
            expenses.map((expense) => ({
              user_id: userId,
              label: expense.label,
              amount: expense.amount,
              due_day: expense.dueDay,
              is_recurring: expense.isRecurring,
            }))
          )
        : Promise.resolve({ error: null }),
      debts.length
        ? supabase.from("debts").insert(
            debts.map((debt) => ({
              user_id: userId,
              label: debt.label,
              outstanding_balance: debt.outstandingBalance,
              minimum_payment: debt.minimumPayment,
              due_day: debt.dueDay,
              interest_rate: debt.interestRate ?? null,
            }))
          )
        : Promise.resolve({ error: null }),
      goals.length
        ? supabase.from("goals").insert(
            goals.map((goal) => ({
              user_id: userId,
              label: goal.label,
              target_amount: goal.targetAmount,
              saved_amount: goal.savedAmount,
              monthly_contribution: goal.monthlyContribution,
              target_date: goal.targetDate ?? null,
              priority: goal.priority,
            }))
          )
        : Promise.resolve({ error: null }),
    ]);

    const error = inserts.find((result) => result.error)?.error;
    if (error) {
      console.error("Unable to create Supabase financial setup rows", error);
      return { ok: false, error: "Unable to save your financial setup." };
    }

    const completionResult = await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("user_id", userId);

    if (completionResult.error) {
      console.error("Unable to mark onboarding complete", completionResult.error);
      return { ok: false, error: "Unable to finish your financial profile." };
    }

    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save profile.",
    };
  }
}
