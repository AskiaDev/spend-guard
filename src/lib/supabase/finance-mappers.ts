import { calculateCooldownDays } from "@/lib/calculations/purchase-decision";
import { emptySnapshot } from "@/lib/storage/default-data";
import type { Database, Json } from "@/types/database";
import type {
  CurrencyCode,
  FinancialWorkspace,
  GoalPriority,
  PayFrequency,
  PaymentMethod,
  PurchaseDecision,
  PurchaseUrgency,
} from "@/types/finance";

type Tables = Database["public"]["Tables"];

export interface FinancialWorkspaceRows {
  profile: Tables["profiles"]["Row"] | null;
  expenses: Tables["expenses"]["Row"][];
  debts: Tables["debts"]["Row"][];
  goals: Tables["goals"]["Row"][];
  purchaseChecks: Tables["purchase_checks"]["Row"][];
  cooldownItems: Tables["cooldown_items"]["Row"][];
  weeklyReports: Tables["weekly_reports"]["Row"][];
}

function enumValue<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function stringReasons(value: Json): string[] {
  return Array.isArray(value)
    ? value.filter((reason): reason is string => typeof reason === "string")
    : [];
}

export function mapFinancialWorkspaceRows(rows: FinancialWorkspaceRows): FinancialWorkspace {
  const profile = rows.profile
    ? {
        currency: enumValue<CurrencyCode>(
          rows.profile.currency,
          ["PHP", "USD", "EUR", "JPY", "SGD"],
          "PHP"
        ),
        monthlyIncome: Number(rows.profile.monthly_income),
        currentSavings: Number(rows.profile.current_savings),
        emergencyFundTarget: Number(rows.profile.emergency_fund_target),
        fullName: rows.profile.full_name ?? undefined,
        payFrequency: enumValue<PayFrequency>(
          rows.profile.pay_frequency ?? "monthly",
          ["monthly", "semi_monthly", "biweekly", "weekly"],
          "monthly"
        ),
        estimatedVariableExpenses: Number(rows.profile.estimated_variable_expenses ?? 0),
      }
    : { ...emptySnapshot.profile };

  return {
    snapshot: {
      profile,
      expenses: rows.expenses.map((expense) => ({
        id: expense.id,
        label: expense.label,
        amount: Number(expense.amount),
        dueDay: expense.due_day,
        isRecurring: expense.is_recurring,
      })),
      debts: rows.debts.map((debt) => ({
        id: debt.id,
        label: debt.label,
        outstandingBalance: Number(debt.outstanding_balance),
        minimumPayment: Number(debt.minimum_payment),
        dueDay: debt.due_day,
        interestRate: debt.interest_rate === null ? undefined : Number(debt.interest_rate),
      })),
      goals: rows.goals.map((goal) => ({
        id: goal.id,
        label: goal.label,
        targetAmount: Number(goal.target_amount),
        savedAmount: Number(goal.saved_amount),
        monthlyContribution: Number(goal.monthly_contribution),
        targetDate: goal.target_date ?? undefined,
        priority: enumValue<GoalPriority>(goal.priority, ["high", "medium", "low"], "medium"),
      })),
    },
    checks: rows.purchaseChecks.map((check) => {
      const urgency = enumValue<PurchaseUrgency>(
        check.urgency,
        ["need_now", "need_this_month", "can_wait", "want"],
        "want"
      );
      const amount = Number(check.amount);
      const safeToSpend = Number(check.safe_to_spend);

      return {
        id: check.id,
        itemName: check.item_name,
        amount,
        urgency,
        paymentMethod: enumValue<PaymentMethod>(
          check.payment_method,
          ["cash", "installment", "credit_card", "loan", "bnpl"],
          "cash"
        ),
        downPayment: check.down_payment === null ? undefined : Number(check.down_payment),
        installmentMonths: check.installment_months ?? undefined,
        monthlyPayment: check.monthly_payment === null ? undefined : Number(check.monthly_payment),
        isIncomeGenerating: check.is_income_generating,
        currentAlternativeStillWorks: check.current_alternative_still_works,
        createdAt: check.created_at,
        decision: enumValue<PurchaseDecision>(
          check.decision,
          ["SAFE_TO_BUY", "BUY_WITH_CAUTION", "WAIT", "NOT_RECOMMENDED"],
          "WAIT"
        ),
        riskScore: check.risk_score,
        safeToSpend,
        monthlyFreeCashFlow: Number(check.monthly_free_cash_flow),
        savingsAfterPurchase: Number(check.savings_after_purchase),
        cooldownDays:
          check.cooldown_days ?? calculateCooldownDays({ amount, safeToSpend, urgency }),
        advisorText: check.advisor_text,
        reasons: stringReasons(check.reasons),
      };
    }),
    cooldownItems: rows.cooldownItems.map((item) => ({
      id: item.id,
      itemName: item.item_name,
      amount: Number(item.amount),
      urgency: enumValue<PurchaseUrgency>(
        item.urgency,
        ["need_now", "need_this_month", "can_wait", "want"],
        "want"
      ),
      paymentMethod: enumValue<PaymentMethod>(
        item.payment_method,
        ["cash", "installment", "credit_card", "loan", "bnpl"],
        "cash"
      ),
      sourceCheckId: item.source_check_id ?? undefined,
      addedAt: item.added_at,
      recheckAt: item.recheck_at,
    })),
    weeklyReports: rows.weeklyReports.map((report) => ({
      id: report.id,
      createdAt: report.created_at,
      weekStart: report.week_start,
      summary: report.summary,
      healthScore: report.health_score,
      safeToSpend: Number(report.safe_to_spend),
    })),
  };
}
