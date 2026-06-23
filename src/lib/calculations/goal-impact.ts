import type { Goal } from "@/types/finance";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export function calculateReservedGoalAmount(goals: Goal[]): number {
  return sum(goals.map((goal) => goal.monthlyContribution));
}

export function calculateGoalDelayMonths({
  goals,
  purchaseAmount,
}: {
  goals: Goal[];
  purchaseAmount: number;
}): number {
  const monthlyGoalFunding = calculateReservedGoalAmount(goals);

  if (monthlyGoalFunding <= 0) {
    return 0;
  }

  return Math.ceil(purchaseAmount / monthlyGoalFunding);
}

export function calculateGoalProgressScore(goals: Goal[]): number {
  const totalTarget = sum(goals.map((goal) => goal.targetAmount));

  if (totalTarget <= 0) {
    return 0;
  }

  const totalSaved = sum(goals.map((goal) => goal.savedAmount));

  return Math.round(clamp(totalSaved / totalTarget, 0, 1) * 100);
}
