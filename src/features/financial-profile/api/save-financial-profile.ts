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

    const profileResult = await supabase.from("profiles").upsert({
      user_id: userId,
      currency: profile.currency,
      monthly_income: profile.monthlyIncome,
      current_savings: profile.currentSavings,
      emergency_fund_target: profile.emergencyFundTarget,
    });

    if (profileResult.error) {
      return { ok: false, error: profileResult.error.message };
    }

    await Promise.all([
      supabase.from("expenses").delete().eq("user_id", userId),
      supabase.from("debts").delete().eq("user_id", userId),
      supabase.from("goals").delete().eq("user_id", userId),
    ]);

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
      return { ok: false, error: error.message };
    }

    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save profile.",
    };
  }
}
