import type { PurchaseUrgency } from "@/types/finance";

export function getCooldownDays(price: number): number {
  if (price < 2_000) {
    return 1;
  }

  if (price < 10_000) {
    return 3;
  }

  if (price < 50_000) {
    return 7;
  }

  return 30;
}

export function calculateCooldownDays({
  amount,
}: {
  amount: number;
  safeToSpend?: number;
  urgency?: PurchaseUrgency;
}): number {
  return getCooldownDays(amount);
}
