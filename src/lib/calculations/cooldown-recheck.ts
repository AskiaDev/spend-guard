import type {
  CooldownItem,
  FinancialSnapshot,
  PurchaseDecision,
  PurchaseDecisionResult,
  PurchaseInput,
} from "@/types/finance";
import { getCooldownDays } from "./cooldown";
import { calculatePurchaseDecision } from "./purchase-decision";

export type CooldownDecisionTrend = "improved" | "unchanged" | "worsened" | "unknown";

export interface CooldownRecheckResult {
  current: PurchaseDecisionResult;
  baselineDecision: PurchaseDecision | null;
  baselineRiskScore: number | null;
  baselineSafeToSpend: number | null;
  decisionTrend: CooldownDecisionTrend;
  safeToSpendDelta: number | null;
  cooldownDays: number;
}

// Best to worst. A higher rank means a more permissive decision.
const DECISION_RANK: Record<PurchaseDecision, number> = {
  NOT_RECOMMENDED: 0,
  WAIT: 1,
  BUY_WITH_CAUTION: 2,
  SAFE_TO_BUY: 3,
};

export function cooldownItemToPurchaseInput(item: CooldownItem): PurchaseInput {
  return {
    itemName: item.itemName,
    amount: item.amount,
    urgency: item.urgency,
    paymentMethod: item.paymentMethod,
    downPayment: item.downPayment,
    installmentMonths: item.installmentMonths,
    monthlyPayment: item.monthlyPayment,
    isIncomeGenerating: item.isIncomeGenerating,
    currentAlternativeStillWorks: item.currentAlternativeStillWorks,
  };
}

function compareDecision(
  current: PurchaseDecision,
  baseline: PurchaseDecision
): CooldownDecisionTrend {
  const delta = DECISION_RANK[current] - DECISION_RANK[baseline];

  if (delta > 0) {
    return "improved";
  }

  if (delta < 0) {
    return "worsened";
  }

  return "unchanged";
}

// Recompute the §19 decision for a cooldown item against the current snapshot, holding the
// purchase intent fixed, and compare it to the baseline captured when the item was added.
// The same purchase inputs are used both times, so the only variable is the user's finances.
export function recheckCooldownItem(
  item: CooldownItem,
  snapshot: FinancialSnapshot
): CooldownRecheckResult {
  const current = calculatePurchaseDecision(snapshot, cooldownItemToPurchaseInput(item));
  const baselineDecision = item.baselineDecision ?? null;
  const baselineSafeToSpend = item.baselineSafeToSpend ?? null;
  const baselineRiskScore = item.baselineRiskScore ?? null;

  return {
    current,
    baselineDecision,
    baselineRiskScore,
    baselineSafeToSpend,
    decisionTrend: baselineDecision
      ? compareDecision(current.decision, baselineDecision)
      : "unknown",
    safeToSpendDelta:
      baselineSafeToSpend === null ? null : current.safeToSpend - baselineSafeToSpend,
    cooldownDays: getCooldownDays(item.amount),
  };
}
