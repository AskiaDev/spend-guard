import type { PurchaseDecisionResult, PurchaseInput } from "@/types/finance";
import { createFallbackAdvice } from "./fallback-advisor";
import { createLiteRtAdvice } from "./litert-lm";

export async function createAdvisorText(
  result: PurchaseDecisionResult,
  purchase: PurchaseInput
) {
  const liteRtAdvice = await createLiteRtAdvice(result, purchase);

  return liteRtAdvice ?? createFallbackAdvice(result, purchase);
}

export { createFallbackAdvice };
