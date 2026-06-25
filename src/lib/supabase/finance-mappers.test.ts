import { describe, expect, it } from "vitest";
import { emptySnapshot } from "@/lib/storage/default-data";
import { mapFinancialWorkspaceRows } from "./finance-mappers";

const baseRows = {
  profile: null,
  expenses: [],
  debts: [],
  goals: [],
  purchaseChecks: [],
  cooldownItems: [],
  weeklyReports: [],
};

describe("mapFinancialWorkspaceRows", () => {
  it("returns an empty PHP workspace for a new account", () => {
    expect(mapFinancialWorkspaceRows(baseRows)).toEqual({
      snapshot: emptySnapshot,
      checks: [],
      cooldownItems: [],
      weeklyReports: [],
    });
  });

  it("maps database rows and derives the persisted purchase cooldown", () => {
    const workspace = mapFinancialWorkspaceRows({
      ...baseRows,
      profile: {
        id: "profile-1",
        user_id: "user-1",
        currency: "PHP",
        monthly_income: 90_000,
        current_savings: 180_000,
        emergency_fund_target: 150_000,
        emergency_buffer: 100_000,
        cooldown_preference: "strict",
        intent: ["stop_impulse"],
        spending_pain_points: ["forget_bills"],
        full_name: "Askia Manjares",
        pay_frequency: "biweekly",
        estimated_variable_expenses: 12_500,
        onboarding_completed: true,
        created_at: "2026-06-20T00:00:00.000Z",
        updated_at: "2026-06-20T00:00:00.000Z",
      },
      expenses: [
        {
          id: "expense-1",
          user_id: "user-1",
          label: "Rent",
          amount: 28_000,
          due_day: 1,
          is_recurring: true,
          created_at: "2026-06-20T00:00:00.000Z",
          updated_at: "2026-06-20T00:00:00.000Z",
        },
      ],
      debts: [],
      goals: [
        {
          id: "goal-1",
          user_id: "user-1",
          label: "Emergency fund",
          target_amount: 150_000,
          saved_amount: 50_000,
          monthly_contribution: 8_000,
          target_date: "2026-12-31",
          priority: "high",
          created_at: "2026-06-20T00:00:00.000Z",
          updated_at: "2026-06-20T00:00:00.000Z",
        },
      ],
      purchaseChecks: [
        {
          id: "check-1",
          user_id: "user-1",
          item_name: "Phone",
          amount: 25_000,
          category: "phone",
          sale_deadline: "2026-07-15",
          location: "Makati showroom",
          notes: "Ask if delivery is included.",
          urgency: "can_wait",
          payment_method: "installment",
          down_payment: 5_000,
          installment_months: 12,
          monthly_payment: 2_500,
          is_income_generating: true,
          current_alternative_still_works: false,
          decision: "WAIT",
          risk_score: 50,
          safe_to_spend: 20_000,
          monthly_free_cash_flow: 59_500,
          savings_after_purchase: 175_000,
          emergency_fund_progress: 0.5,
          debt_pressure: 0.18,
          goal_delay_months: 3,
          health_score: 74,
          cooldown_days: 21,
          status: "skipped",
          advisor_text: "Wait before buying.",
          reasons: ["This would exceed today's safe-to-spend amount.", 42],
          created_at: "2026-06-20T01:00:00.000Z",
        },
      ],
      cooldownItems: [
        {
          id: "cooldown-1",
          user_id: "user-1",
          item_name: "Phone",
          amount: 25_000,
          urgency: "can_wait",
          payment_method: "installment",
          source_check_id: "check-1",
          added_at: "2026-06-20T01:00:00.000Z",
          recheck_at: "2026-07-11T01:00:00.000Z",
          down_payment: 5_000,
          installment_months: 12,
          monthly_payment: 2_500,
          is_income_generating: true,
          current_alternative_still_works: false,
          baseline_decision: "WAIT",
          baseline_risk_score: 50,
          baseline_safe_to_spend: 20_000,
        },
      ],
      weeklyReports: [
        {
          id: "report-1",
          user_id: "user-1",
          week_start: "2026-06-15",
          summary: "Stable week.",
          health_score: 82,
          safe_to_spend: 20_000,
          created_at: "2026-06-20T03:00:00.000Z",
        },
      ],
    });

    expect(workspace.snapshot.profile).toMatchObject({
      monthlyIncome: 90_000,
      emergencyBuffer: 100_000,
      cooldownPreference: "strict",
      intent: ["stop_impulse"],
      spendingPainPoints: ["forget_bills"],
      fullName: "Askia Manjares",
      payFrequency: "biweekly",
      estimatedVariableExpenses: 12_500,
    });
    expect(workspace.snapshot.expenses[0]).toMatchObject({
      id: "expense-1",
      amount: 28_000,
      dueDay: 1,
    });
    expect(workspace.checks[0]).toMatchObject({
      id: "check-1",
      paymentMethod: "installment",
      category: "phone",
      saleDeadline: "2026-07-15",
      location: "Makati showroom",
      notes: "Ask if delivery is included.",
      downPayment: 5_000,
      isIncomeGenerating: true,
      currentAlternativeStillWorks: false,
      riskScore: 50,
      savingsAfterPurchase: 175_000,
      emergencyProgress: 0.5,
      debtPressure: 0.18,
      goalDelayMonths: 3,
      healthScore: 74,
      cooldownDays: 21,
      status: "skipped",
      reasons: ["This would exceed today's safe-to-spend amount."],
    });
    expect(workspace.cooldownItems[0].sourceCheckId).toBe("check-1");
    expect(workspace.cooldownItems[0]).toMatchObject({
      downPayment: 5_000,
      installmentMonths: 12,
      monthlyPayment: 2_500,
      isIncomeGenerating: true,
      currentAlternativeStillWorks: false,
      baselineDecision: "WAIT",
      baselineRiskScore: 50,
      baselineSafeToSpend: 20_000,
    });
    expect(workspace.snapshot.goals[0]).toMatchObject({ priority: "high", targetDate: "2026-12-31" });
    expect(workspace.weeklyReports[0]).toMatchObject({ healthScore: 82, safeToSpend: 20_000 });
  });

  it("uses safe defaults for nullable and unexpected database values", () => {
    const workspace = mapFinancialWorkspaceRows({
      ...baseRows,
      profile: {
        id: "profile-1",
        user_id: "user-1",
        currency: "unexpected",
        monthly_income: 0,
        current_savings: 0,
        emergency_fund_target: 0,
        emergency_buffer: 0,
        cooldown_preference: "unexpected",
        intent: [],
        spending_pain_points: [],
        full_name: null,
        pay_frequency: "unexpected",
        estimated_variable_expenses: 0,
        onboarding_completed: false,
        created_at: "2026-06-20T00:00:00.000Z",
        updated_at: "2026-06-20T00:00:00.000Z",
      },
      debts: [
        {
          id: "debt-1",
          user_id: "user-1",
          label: "Card",
          outstanding_balance: 10_000,
          minimum_payment: 1_000,
          due_day: 20,
          interest_rate: null,
          created_at: "2026-06-20T00:00:00.000Z",
          updated_at: "2026-06-20T00:00:00.000Z",
        },
      ],
      goals: [
        {
          id: "goal-1",
          user_id: "user-1",
          label: "Buffer",
          target_amount: 10_000,
          saved_amount: 0,
          monthly_contribution: 500,
          target_date: null,
          priority: "unexpected",
          created_at: "2026-06-20T00:00:00.000Z",
          updated_at: "2026-06-20T00:00:00.000Z",
        },
      ],
      purchaseChecks: [
        {
          id: "check-1",
          user_id: "user-1",
          item_name: "Unknown",
          amount: 1_000,
          category: null,
          sale_deadline: null,
          location: null,
          notes: null,
          urgency: "unexpected",
          payment_method: "unexpected",
          down_payment: null,
          installment_months: null,
          monthly_payment: null,
          is_income_generating: false,
          current_alternative_still_works: false,
          decision: "unexpected",
          risk_score: 0,
          safe_to_spend: 0,
          monthly_free_cash_flow: 0,
          savings_after_purchase: 0,
          emergency_fund_progress: 0,
          debt_pressure: 0,
          goal_delay_months: 0,
          health_score: 0,
          cooldown_days: 1,
          status: "unexpected",
          advisor_text: "Wait.",
          reasons: { invalid: true },
          created_at: "2026-06-20T00:00:00.000Z",
        },
      ],
      cooldownItems: [
        {
          id: "cooldown-1",
          user_id: "user-1",
          item_name: "Unknown",
          amount: 1_000,
          urgency: "unexpected",
          payment_method: "unexpected",
          source_check_id: null,
          added_at: "2026-06-20T00:00:00.000Z",
          recheck_at: "2026-07-20T00:00:00.000Z",
          down_payment: null,
          installment_months: null,
          monthly_payment: null,
          is_income_generating: false,
          current_alternative_still_works: false,
          baseline_decision: null,
          baseline_risk_score: null,
          baseline_safe_to_spend: null,
        },
      ],
    });

    expect(workspace.snapshot.profile.currency).toBe("PHP");
    expect(workspace.snapshot.profile.emergencyBuffer).toBe(0);
    expect(workspace.snapshot.profile.cooldownPreference).toBe("balanced");
    expect(workspace.snapshot.profile.intent).toEqual([]);
    expect(workspace.snapshot.profile.spendingPainPoints).toEqual([]);
    expect(workspace.snapshot.profile.fullName).toBeUndefined();
    expect(workspace.snapshot.profile.payFrequency).toBe("monthly");
    expect(workspace.snapshot.profile.estimatedVariableExpenses).toBe(0);
    expect(workspace.snapshot.debts[0].interestRate).toBeUndefined();
    expect(workspace.snapshot.goals[0]).toMatchObject({ priority: "medium", targetDate: undefined });
    expect(workspace.checks[0]).toMatchObject({
      urgency: "want",
      paymentMethod: "cash",
      category: undefined,
      saleDeadline: undefined,
      location: undefined,
      notes: undefined,
      decision: "WAIT",
      installmentMonths: undefined,
      monthlyPayment: undefined,
      downPayment: undefined,
      riskScore: 0,
      savingsAfterPurchase: 0,
      emergencyProgress: 0,
      debtPressure: 0,
      goalDelayMonths: 0,
      healthScore: 0,
      cooldownDays: 1,
      status: "checked",
      reasons: [],
    });
    expect(workspace.cooldownItems[0]).toMatchObject({
      urgency: "want",
      paymentMethod: "cash",
      sourceCheckId: undefined,
      downPayment: undefined,
      installmentMonths: undefined,
      monthlyPayment: undefined,
      isIncomeGenerating: false,
      currentAlternativeStillWorks: false,
      baselineDecision: undefined,
      baselineRiskScore: undefined,
      baselineSafeToSpend: undefined,
    });
  });
});
