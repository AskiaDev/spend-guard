import type { PurchaseDecisionResult, PurchaseInput } from "@/types/finance";
import { formatCurrency } from "@/lib/utils";

const decisionCopy = {
  SAFE_TO_BUY: "This fits your plan.",
  BUY_WITH_CAUTION: "You can make this work, but keep it deliberate.",
  WAIT: "Waiting is the better move right now.",
  NOT_RECOMMENDED: "Do not buy this with the current numbers.",
} as const;

export function createFallbackAdvice(result: PurchaseDecisionResult, purchase: PurchaseInput) {
  const headline = decisionCopy[result.decision];
  const amount = formatCurrency(purchase.amount);
  const safeToSpend = formatCurrency(result.safeToSpend);
  const cooldown =
    result.cooldownDays > 0
      ? ` Put it on a ${result.cooldownDays}-day cooldown and recheck with fresh numbers.`
      : "";

  return `${headline} ${purchase.itemName} costs ${amount}, while today's safe-to-spend amount is ${safeToSpend}. ${result.reasons[0]}${cooldown}`;
}
