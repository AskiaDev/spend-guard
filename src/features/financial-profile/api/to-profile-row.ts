import type { FinancialProfileInput } from "@/lib/schemas/finance";
import type { Database } from "@/types/database";

type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];

export function toProfileRow(
  userId: string,
  profile: FinancialProfileInput
): ProfileInsert {
  return {
    user_id: userId,
    currency: profile.currency,
    monthly_income: profile.monthlyIncome,
    current_savings: profile.currentSavings,
    emergency_buffer: profile.emergencyBuffer,
    cooldown_preference: profile.cooldownPreference,
    intent: profile.intent,
    spending_pain_points: profile.spendingPainPoints,
    emergency_fund_target: 0,
    full_name: profile.fullName?.trim() || null,
    pay_frequency: profile.payFrequency,
    estimated_variable_expenses: profile.estimatedVariableExpenses,
  };
}
