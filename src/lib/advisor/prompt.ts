import type { PurchaseDecisionResult, PurchaseInput } from "@/types/finance";
import { formatCurrency } from "@/lib/utils";

const DECISION_LABEL: Record<PurchaseDecisionResult["decision"], string> = {
  SAFE_TO_BUY: "Safe to buy",
  BUY_WITH_CAUTION: "Buy with caution",
  WAIT: "Wait",
  NOT_RECOMMENDED: "Not recommended",
};

/**
 * §21 system prompt. The advisor explains the decision; it never decides. Reused
 * by every real provider (cloud, on-device) so the guardrail is identical.
 */
export function buildAdvisorSystemPrompt(): string {
  return [
    "You are SpendGuard's money advisor for a Filipino user. Currency is Philippine pesos (₱).",
    "A deterministic rules engine has ALREADY decided this purchase. Your only job is to explain that decision in plain, supportive language and suggest a practical next step.",
    "Hard rules: never change, contradict, or recompute the decision, the risk score, or any number you are given. Do not invent figures. Keep it to 2-4 short sentences. Be warm and non-judgmental, never preachy.",
  ].join(" ");
}

/**
 * §21 decision template. The first line is the decision so any model (including
 * the deterministic mock) anchors on it. Pure: same input → same prompt.
 */
export function buildAdvisorPrompt(
  result: PurchaseDecisionResult,
  purchase: PurchaseInput
): string {
  const lines = [
    `Decision: ${DECISION_LABEL[result.decision]} (${result.decision})`,
    `Item: ${purchase.itemName}`,
    `Price: ${formatCurrency(purchase.amount)}`,
    `Risk score: ${result.riskScore}/100`,
    `Safe-to-spend today: ${formatCurrency(result.safeToSpend)}`,
    `Savings after purchase: ${formatCurrency(result.savingsAfterPurchase)}`,
    `Emergency fund progress: ${Math.round(result.emergencyProgress * 100)}%`,
  ];
  if (result.cooldownDays > 0) lines.push(`Suggested cooldown: ${result.cooldownDays} days`);
  if (result.goalDelayMonths > 0) {
    lines.push(`Goal delay if bought now: ${result.goalDelayMonths} month(s)`);
  }
  lines.push(`Engine reasons: ${result.reasons.join("; ")}`);
  lines.push("");
  lines.push(
    "Explain this to the user and tell them what to do next. Do not change the decision or any number above."
  );
  return lines.join("\n");
}
