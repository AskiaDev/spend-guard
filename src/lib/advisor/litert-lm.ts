import type { PurchaseDecisionResult, PurchaseInput } from "@/types/finance";

type LiteRtRuntime = {
  generateText?: (prompt: string) => Promise<string>;
};

declare global {
  interface Window {
    LiteRTLM?: LiteRtRuntime;
  }
}

export async function createLiteRtAdvice(
  result: PurchaseDecisionResult,
  purchase: PurchaseInput
): Promise<string | null> {
  if (typeof window === "undefined" || !window.LiteRTLM?.generateText) {
    return null;
  }

  try {
    const prompt = [
      "You are SpendGuard. Give concise advisory wording only.",
      "Never override the deterministic decision.",
      `Decision: ${result.decision}`,
      `Item: ${purchase.itemName}`,
      `Amount: ${purchase.amount}`,
      `Safe to spend: ${result.safeToSpend}`,
      `Reasons: ${result.reasons.join("; ")}`,
    ].join("\n");

    const advice = await window.LiteRTLM.generateText(prompt);
    return advice.trim() || null;
  } catch {
    return null;
  }
}
