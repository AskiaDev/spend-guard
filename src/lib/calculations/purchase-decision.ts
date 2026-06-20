import type {
  FinancialSnapshot,
  PurchaseDecision,
  PurchaseDecisionResult,
  PurchaseInput,
  PurchaseUrgency,
} from "@/types/finance";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export function calculateMonthlyFreeCashFlow(snapshot: FinancialSnapshot): number {
  const recurringExpenses = sum(
    snapshot.expenses
      .filter((expense) => expense.isRecurring)
      .map((expense) => expense.amount)
  );
  const debtMinimums = sum(snapshot.debts.map((debt) => debt.minimumPayment));
  const goalContributions = sum(snapshot.goals.map((goal) => goal.monthlyContribution));

  return snapshot.profile.monthlyIncome - recurringExpenses - debtMinimums - goalContributions;
}

export function calculateEmergencyProgress(snapshot: FinancialSnapshot): number {
  if (snapshot.profile.emergencyFundTarget <= 0) {
    return 1;
  }

  return clamp(
    snapshot.profile.currentSavings / snapshot.profile.emergencyFundTarget,
    0,
    1
  );
}

export function calculateDebtPressure(snapshot: FinancialSnapshot): number {
  if (snapshot.profile.monthlyIncome <= 0) {
    return 1;
  }

  return clamp(
    sum(snapshot.debts.map((debt) => debt.minimumPayment)) / snapshot.profile.monthlyIncome,
    0,
    1
  );
}

export function calculateSafeToSpend(snapshot: FinancialSnapshot): number {
  const emergencyBuffer = Math.min(
    snapshot.profile.currentSavings,
    snapshot.profile.emergencyFundTarget * 0.8
  );
  const upcomingBills30Days = sum(
    snapshot.expenses
      .filter((expense) => expense.isRecurring)
      .map((expense) => expense.amount)
  );
  const upcomingDebt30Days = sum(snapshot.debts.map((debt) => debt.minimumPayment));
  const reservedGoalAmount = sum(snapshot.goals.map((goal) => goal.monthlyContribution));

  return Math.max(
    0,
    Math.round(
      snapshot.profile.currentSavings -
        emergencyBuffer -
        upcomingBills30Days -
        upcomingDebt30Days -
        reservedGoalAmount
    )
  );
}

export function calculateFinancialHealthScore(snapshot: FinancialSnapshot): number {
  const emergencyScore = calculateEmergencyProgress(snapshot) * 40;
  const monthlyFreeCashFlow = calculateMonthlyFreeCashFlow(snapshot);
  const cashFlowRatio =
    snapshot.profile.monthlyIncome > 0
      ? clamp(monthlyFreeCashFlow / snapshot.profile.monthlyIncome, 0, 0.4) / 0.4
      : 0;
  const cashFlowScore = cashFlowRatio * 30;
  const debtPressure = calculateDebtPressure(snapshot);
  const debtScore = (1 - clamp(debtPressure / 0.45, 0, 1)) * 20;
  const savingsScore = snapshot.profile.currentSavings > 0 ? 10 : 0;

  return Math.round(clamp(emergencyScore + cashFlowScore + debtScore + savingsScore, 0, 100));
}

export function calculateGoalDelayMonths(
  snapshot: FinancialSnapshot,
  purchase: PurchaseInput
): number {
  const monthlyGoalFunding = sum(snapshot.goals.map((goal) => goal.monthlyContribution));

  if (monthlyGoalFunding <= 0) {
    return 0;
  }

  return Math.ceil(purchase.amount / monthlyGoalFunding);
}

export function calculateCooldownDays({
  amount,
  safeToSpend,
  urgency,
}: {
  amount: number;
  safeToSpend: number;
  urgency: PurchaseUrgency;
}): number {
  if (urgency === "need_now") {
    return 0;
  }

  if (urgency === "need_this_month" && amount <= safeToSpend) {
    return 0;
  }

  if (urgency === "can_wait") {
    return amount <= safeToSpend ? 7 : 21;
  }

  const ratio = safeToSpend > 0 ? amount / safeToSpend : Number.POSITIVE_INFINITY;

  if (ratio <= 1) {
    return 3;
  }

  if (ratio <= 2) {
    return 14;
  }

  return 30;
}

function decide(snapshot: FinancialSnapshot, purchase: PurchaseInput): PurchaseDecision {
  const safeToSpend = calculateSafeToSpend(snapshot);
  const monthlyFreeCashFlow = calculateMonthlyFreeCashFlow(snapshot);
  const debtPressure = calculateDebtPressure(snapshot);
  const emergencyProgress = calculateEmergencyProgress(snapshot);
  const monthlyPayment = purchase.monthlyPayment ?? 0;

  if (monthlyPayment > monthlyFreeCashFlow) {
    return "NOT_RECOMMENDED";
  }

  if (debtPressure >= 0.45 && purchase.urgency === "want") {
    return "NOT_RECOMMENDED";
  }

  if (purchase.amount > safeToSpend && purchase.urgency === "want") {
    return "WAIT";
  }

  if (purchase.amount > safeToSpend && purchase.urgency === "can_wait") {
    return "WAIT";
  }

  if (purchase.amount <= safeToSpend * 0.35 && emergencyProgress >= 0.75 && debtPressure < 0.35) {
    return "SAFE_TO_BUY";
  }

  if (purchase.amount <= safeToSpend && monthlyFreeCashFlow > 0) {
    return "BUY_WITH_CAUTION";
  }

  return purchase.urgency === "need_now" ? "BUY_WITH_CAUTION" : "WAIT";
}

export function calculatePurchaseDecision(
  snapshot: FinancialSnapshot,
  purchase: PurchaseInput
): PurchaseDecisionResult {
  const safeToSpend = calculateSafeToSpend(snapshot);
  const monthlyFreeCashFlow = calculateMonthlyFreeCashFlow(snapshot);
  const emergencyProgress = calculateEmergencyProgress(snapshot);
  const debtPressure = calculateDebtPressure(snapshot);
  const decision = decide(snapshot, purchase);
  const cooldownDays = calculateCooldownDays({
    amount: purchase.amount,
    safeToSpend,
    urgency: purchase.urgency,
  });
  const goalDelayMonths = calculateGoalDelayMonths(snapshot, purchase);
  const reasons: string[] = [];

  if (purchase.amount <= safeToSpend) {
    reasons.push("The purchase fits inside today's safe-to-spend amount.");
  } else {
    reasons.push("This would exceed today's safe-to-spend amount.");
  }

  if ((purchase.monthlyPayment ?? 0) > monthlyFreeCashFlow) {
    reasons.push("The monthly payment is higher than available monthly free cash flow.");
  } else if (purchase.monthlyPayment) {
    reasons.push("The monthly payment fits inside current monthly free cash flow.");
  }

  if (emergencyProgress < 1) {
    reasons.push("Your emergency fund is still below target.");
  }

  if (debtPressure >= 0.35) {
    reasons.push("Debt payments are taking a large share of monthly income.");
  }

  if (goalDelayMonths > 0 && purchase.urgency !== "need_now") {
    reasons.push(`Buying now could delay current goals by about ${goalDelayMonths} months.`);
  }

  return {
    decision,
    safeToSpend,
    monthlyFreeCashFlow,
    emergencyProgress,
    debtPressure,
    goalDelayMonths,
    cooldownDays,
    healthScore: calculateFinancialHealthScore(snapshot),
    reasons,
  };
}
