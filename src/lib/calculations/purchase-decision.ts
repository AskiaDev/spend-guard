import type {
  FinancialSnapshot,
  PaymentMethod,
  PurchaseDecision,
  PurchaseDecisionResult,
  PurchaseInput,
  PurchaseUrgency,
} from "@/types/finance";
import {
  calculateMonthlyFreeCashFlow as calculateMonthlyFreeCashFlowFromInput,
  calculateSafeToSpend as calculateSafeToSpendFromInput,
} from "./cashflow";
import { calculateCooldownDays } from "./cooldown";
import {
  calculateDebtPressure as calculateDebtPressureFromInput,
  calculateDebtPressureScore,
} from "./debt-pressure";
import {
  calculateEmergencyBuffer,
  calculateEmergencyFundProgress,
} from "./emergency-fund";
import {
  calculateGoalDelayMonths as calculateGoalDelayMonthsFromGoals,
  calculateGoalProgressScore,
  calculateReservedGoalAmount,
} from "./goal-impact";
import { calculateHealthScore } from "./health-score";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export interface PurchaseEvaluationInput {
  price: number;
  currentSavings: number;
  safeToSpend: number;
  emergencyBuffer: number;
  upcomingDebt30Days: number;
  monthlyFreeCashFlow: number;
  paymentMethod: PaymentMethod;
  urgency: PurchaseUrgency;
  isIncomeGenerating: boolean;
  currentAlternativeStillWorks: boolean;
  downPayment?: number;
  installmentMonthlyAmount?: number;
  installmentTermMonths?: number;
}

export interface PurchaseEvaluationResult {
  decision: PurchaseDecision;
  riskScore: number;
  reasons: string[];
  savingsAfterPurchase: number;
}

function recurringExpenseTotal(snapshot: FinancialSnapshot): number {
  return sum(
    snapshot.expenses
      .filter((expense) => expense.isRecurring)
      .map((expense) => expense.amount)
  );
}

function minimumDebtPayments(snapshot: FinancialSnapshot): number {
  return sum(snapshot.debts.map((debt) => debt.minimumPayment));
}

export function calculateMonthlyFreeCashFlow(snapshot: FinancialSnapshot): number {
  return calculateMonthlyFreeCashFlowFromInput({
    monthlyIncome: snapshot.profile.monthlyIncome,
    fixedExpenses: recurringExpenseTotal(snapshot),
    estimatedVariableExpenses: snapshot.profile.estimatedVariableExpenses ?? 0,
    minimumDebtPayments: minimumDebtPayments(snapshot),
  });
}

export function calculateEmergencyProgress(snapshot: FinancialSnapshot): number {
  return calculateEmergencyFundProgress(snapshot.profile) / 100;
}

export function calculateDebtPressure(snapshot: FinancialSnapshot): number {
  return calculateDebtPressureFromInput({
    monthlyIncome: snapshot.profile.monthlyIncome,
    minimumDebtPayments: minimumDebtPayments(snapshot),
  });
}

export function calculateSafeToSpend(snapshot: FinancialSnapshot): number {
  return calculateSafeToSpendFromInput({
    currentSavings: snapshot.profile.currentSavings,
    emergencyBuffer: calculateEmergencyBuffer(snapshot.profile),
    upcomingBills30Days: recurringExpenseTotal(snapshot),
    upcomingDebt30Days: minimumDebtPayments(snapshot),
    reservedGoalAmount: calculateReservedGoalAmount(snapshot.goals),
  });
}

export function calculateFinancialHealthScore(snapshot: FinancialSnapshot): number {
  const monthlyFreeCashFlow = calculateMonthlyFreeCashFlow(snapshot);
  const cashFlowRatio =
    snapshot.profile.monthlyIncome > 0
      ? clamp(monthlyFreeCashFlow / snapshot.profile.monthlyIncome, 0, 0.4) / 0.4
      : 0;

  return calculateHealthScore({
    emergencyFundProgress: calculateEmergencyFundProgress(snapshot.profile),
    debtPressureScore: calculateDebtPressureScore({
      monthlyIncome: snapshot.profile.monthlyIncome,
      minimumDebtPayments: minimumDebtPayments(snapshot),
    }),
    cashFlowScore: cashFlowRatio * 100,
    goalProgressScore: calculateGoalProgressScore(snapshot.goals),
    purchaseDisciplineScore: 100,
  });
}

export function calculateGoalDelayMonths(
  snapshot: FinancialSnapshot,
  purchase: PurchaseInput
): number {
  return calculateGoalDelayMonthsFromGoals({
    goals: snapshot.goals,
    purchaseAmount: purchase.amount,
  });
}

export { calculateCooldownDays };

export function evaluatePurchase(input: PurchaseEvaluationInput): PurchaseEvaluationResult {
  const reasons: string[] = [];
  const savingsAfterPurchase =
    input.paymentMethod === "cash"
      ? input.currentSavings - input.price
      : input.currentSavings - (input.downPayment ?? 0);

  let riskScore = 0;

  if (input.price > input.safeToSpend) {
    riskScore += 30;
    reasons.push("The purchase is higher than your safe-to-spend amount.");
  }

  if (savingsAfterPurchase < input.emergencyBuffer) {
    riskScore += 30;
    reasons.push("The purchase would break your emergency buffer.");
  }

  if (input.upcomingDebt30Days > 0) {
    riskScore += 20;
    reasons.push("You have debt due within the next 30 days.");
  }

  if (input.paymentMethod !== "cash") {
    riskScore += 15;
    reasons.push("This purchase adds future payment pressure.");
  }

  if (input.installmentMonthlyAmount && input.installmentMonthlyAmount > 0) {
    if (input.monthlyFreeCashFlow <= 0) {
      riskScore += 40;
      reasons.push("There is no monthly free cash flow available for a new payment.");
    }

    const installmentPressure =
      input.installmentMonthlyAmount / Math.max(1, input.monthlyFreeCashFlow);

    if (installmentPressure >= 0.3) {
      riskScore += 20;
      reasons.push("The monthly installment takes a large part of your free cash flow.");
    } else if (installmentPressure >= 0.15) {
      riskScore += 10;
      reasons.push("The monthly installment will reduce your saving capacity.");
    }
  }

  if (input.urgency === "want") {
    riskScore += 10;
    reasons.push("This appears to be a want, not an urgent need.");
  }

  if (input.currentAlternativeStillWorks) {
    riskScore += 10;
    reasons.push("Your current alternative still works.");
  }

  if (input.isIncomeGenerating) {
    riskScore -= 15;
    reasons.push("This may support your work or income.");
  }

  riskScore = clamp(riskScore, 0, 100);

  let decision: PurchaseDecision;

  if (riskScore >= 75) {
    decision = "NOT_RECOMMENDED";
  } else if (riskScore >= 50) {
    decision = "WAIT";
  } else if (riskScore >= 30) {
    decision = "BUY_WITH_CAUTION";
  } else {
    decision = "SAFE_TO_BUY";
  }

  return {
    decision,
    riskScore,
    reasons,
    savingsAfterPurchase,
  };
}

export function calculatePurchaseDecision(
  snapshot: FinancialSnapshot,
  purchase: PurchaseInput
): PurchaseDecisionResult {
  const safeToSpend = calculateSafeToSpend(snapshot);
  const monthlyFreeCashFlow = calculateMonthlyFreeCashFlow(snapshot);
  const emergencyProgress = calculateEmergencyProgress(snapshot);
  const debtPressure = calculateDebtPressure(snapshot);
  const emergencyBuffer = calculateEmergencyBuffer(snapshot.profile);
  const upcomingDebt30Days = minimumDebtPayments(snapshot);
  const evaluation = evaluatePurchase({
    price: purchase.amount,
    currentSavings: snapshot.profile.currentSavings,
    safeToSpend,
    emergencyBuffer,
    upcomingDebt30Days,
    monthlyFreeCashFlow,
    paymentMethod: purchase.paymentMethod,
    urgency: purchase.urgency,
    isIncomeGenerating: purchase.isIncomeGenerating ?? false,
    currentAlternativeStillWorks: purchase.currentAlternativeStillWorks ?? false,
    downPayment: purchase.downPayment,
    installmentMonthlyAmount: purchase.monthlyPayment,
    installmentTermMonths: purchase.installmentMonths,
  });
  const cooldownDays = calculateCooldownDays({
    amount: purchase.amount,
    preference: snapshot.profile.cooldownPreference,
  });
  const goalDelayMonths = calculateGoalDelayMonths(snapshot, purchase);
  const reasons =
    evaluation.reasons.length > 0
      ? [...evaluation.reasons]
      : ["No major risk triggers were found in the current plan."];

  if (goalDelayMonths > 0 && purchase.urgency !== "need_now") {
    reasons.push(`Buying now could delay current goals by about ${goalDelayMonths} months.`);
  }

  return {
    decision: evaluation.decision,
    riskScore: evaluation.riskScore,
    safeToSpend,
    monthlyFreeCashFlow,
    emergencyProgress,
    debtPressure,
    goalDelayMonths,
    cooldownDays,
    savingsAfterPurchase: evaluation.savingsAfterPurchase,
    healthScore: calculateFinancialHealthScore(snapshot),
    reasons,
  };
}
