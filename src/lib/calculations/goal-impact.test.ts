import { describe, expect, it } from "vitest";

import { calculateGoalDelayMonths, calculateGoalProgressScore } from "./goal-impact";
import type { Goal } from "@/types/finance";

const goals: Goal[] = [
  {
    id: "goal-1",
    label: "Laptop",
    targetAmount: 100_000,
    savedAmount: 25_000,
    monthlyContribution: 5_000,
    priority: "medium",
  },
  {
    id: "goal-2",
    label: "Emergency",
    targetAmount: 50_000,
    savedAmount: 50_000,
    monthlyContribution: 5_000,
    priority: "high",
  },
];

describe("goal impact calculations", () => {
  it("calculates purchase delay from active monthly goal funding", () => {
    expect(calculateGoalDelayMonths({ goals, purchaseAmount: 25_000 })).toBe(3);
  });

  it("calculates bounded aggregate goal progress", () => {
    expect(calculateGoalProgressScore(goals)).toBe(50);
    expect(calculateGoalProgressScore([])).toBe(0);
  });
});
