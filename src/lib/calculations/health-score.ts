export type HealthStatus = "Strong" | "Stable" | "Caution" | "Risky";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export interface HealthScoreInput {
  emergencyFundProgress: number;
  debtPressureScore: number;
  cashFlowScore: number;
  goalProgressScore: number;
  purchaseDisciplineScore: number;
}

export function calculateHealthScore(input: HealthScoreInput): number {
  return Math.round(
    clamp(input.emergencyFundProgress, 0, 100) * 0.3 +
      clamp(input.debtPressureScore, 0, 100) * 0.25 +
      clamp(input.cashFlowScore, 0, 100) * 0.2 +
      clamp(input.goalProgressScore, 0, 100) * 0.15 +
      clamp(input.purchaseDisciplineScore, 0, 100) * 0.1
  );
}

export function getHealthStatus(score: number): HealthStatus {
  if (score >= 80) {
    return "Strong";
  }

  if (score >= 60) {
    return "Stable";
  }

  if (score >= 40) {
    return "Caution";
  }

  return "Risky";
}
