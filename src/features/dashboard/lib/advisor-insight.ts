import { getHealthStatus, type HealthStatus } from "@/lib/calculations/health-score";
import type { FinancialSnapshot } from "@/types/finance";

export interface AdvisorInsight {
  title: string;
  body: string;
}

export interface AdvisorInsightInput {
  metrics: {
    safeToSpend: number;
    monthlyFreeCashFlow: number;
    healthScore: number;
  };
  snapshot: FinancialSnapshot;
}

const TITLE_BY_STATUS: Record<HealthStatus, string> = {
  Strong: "You're ahead of the guardrail",
  Stable: "Keep the guardrail active",
  Caution: "Tighten before the next want",
  Risky: "Protect your buffer first",
};

const DESCRIPTION_BY_STATUS: Record<HealthStatus, string> = {
  Strong: "Your plan has healthy margin across savings, cash flow, and debt.",
  Stable: "Your plan is on track, with a little room to tighten.",
  Caution: "A few signals need attention before new spending.",
  Risky: "Spending pressure is high relative to your buffer.",
};

/** One-line, status-specific description used by the dashboard health-status banner. */
export function describeHealthStatus(status: HealthStatus): string {
  return DESCRIPTION_BY_STATUS[status];
}

/**
 * Deterministic, rule-based advisor insight for the dashboard. No LLM is involved — the weekly
 * report (P9) and LiteRT advisor (P10) own generated narrative; this is the always-available
 * fallback summary derived directly from the live metrics.
 */
export function generateAdvisorInsight({ metrics, snapshot }: AdvisorInsightInput): AdvisorInsight {
  const status = getHealthStatus(metrics.healthScore);

  return {
    title: TITLE_BY_STATUS[status],
    body: `${DESCRIPTION_BY_STATUS[status]} ${signalSentence(metrics, snapshot)}`,
  };
}

function signalSentence(
  metrics: AdvisorInsightInput["metrics"],
  snapshot: FinancialSnapshot
): string {
  if (metrics.monthlyFreeCashFlow <= 0) {
    return "Free cash flow is tight, so hold off on new commitments.";
  }

  if (snapshot.profile.currentSavings < snapshot.profile.emergencyFundTarget) {
    return "Direct spare cash flow toward your emergency target.";
  }

  if (snapshot.debts.length > 0) {
    return "You have room to spend, but clear upcoming debt first.";
  }

  return "You have room for planned spending this month.";
}
