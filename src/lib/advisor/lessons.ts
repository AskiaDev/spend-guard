import type { PurchaseDecisionResult } from "@/types/finance";

export interface EducationalLesson {
  title: string;
  body: string;
}

const LESSONS = {
  debt: {
    title: "Clear high-pressure debt before new wants",
    body: "Money owed at interest grows faster than most savings. Knocking down high-pressure debt first frees up cash flow and lowers the risk on every future purchase.",
  },
  cooldown: {
    title: "A short cooldown beats an impulse buy",
    body: "Waiting a set number of days separates a real need from a passing urge. If you still want it after the cooldown and the numbers hold, it is a far safer yes.",
  },
  emergencyFund: {
    title: "Your emergency fund is the foundation",
    body: "An emergency fund of 3-6 months of expenses keeps a surprise from becoming debt. Until it is full, large wants compete directly with your safety net.",
  },
  safeToSpend: {
    title: "Spend from safe-to-spend, not your savings",
    body: "Safe-to-spend is what remains after your buffer, bills, debts, and goals are protected. Buying from that number keeps your plan intact whatever the month brings.",
  },
} satisfies Record<string, EducationalLesson>;

/**
 * One deterministic lesson, chosen by the most decision-relevant signal in
 * priority order: debt pressure → suggested cooldown → emergency-fund gap →
 * healthy default. Pure (never calls a model); same result → same lesson.
 */
export function getEducationalLesson(result: PurchaseDecisionResult): EducationalLesson {
  if (result.debtPressure > 0) return LESSONS.debt;
  if (result.cooldownDays > 0) return LESSONS.cooldown;
  if (result.emergencyProgress < 1) return LESSONS.emergencyFund;
  return LESSONS.safeToSpend;
}
