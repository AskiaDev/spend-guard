import type { CooldownPreference, PurchaseUrgency } from "@/types/finance";

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

const STRICTNESS_MULTIPLIER: Record<CooldownPreference, number> = {
  light: 0.5,
  balanced: 1,
  strict: 2,
};

export function calculateCooldownDays({
  amount,
  preference = "balanced",
}: {
  amount: number;
  preference?: CooldownPreference;
  safeToSpend?: number;
  urgency?: PurchaseUrgency;
}): number {
  const base = getCooldownDays(amount);
  return Math.max(1, Math.round(base * STRICTNESS_MULTIPLIER[preference]));
}
