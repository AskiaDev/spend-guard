import {
  Camera,
  Car,
  GraduationCap,
  Headphones,
  Home,
  Laptop,
  Plane,
  ShieldCheck,
  Smartphone,
  Target,
  type LucideIcon,
} from "lucide-react";

import type { Goal, GoalPriority, PayFrequency } from "@/types/finance";

export const payPeriodsPerMonth: Record<PayFrequency, number> = {
  monthly: 1,
  semi_monthly: 2,
  biweekly: 26 / 12,
  weekly: 52 / 12,
};

const paydayCadenceLabels: Record<PayFrequency, string> = {
  monthly: "Every month",
  semi_monthly: "Every 15 days",
  biweekly: "Every 2 weeks",
  weekly: "Every week",
};

export function getPaydayCadenceLabel(payFrequency: PayFrequency) {
  return paydayCadenceLabels[payFrequency];
}

export function getGoalSummary(goals: Goal[]) {
  const targetAmount = goals.reduce((total, goal) => total + goal.targetAmount, 0);
  const savedAmount = goals.reduce((total, goal) => total + goal.savedAmount, 0);
  const monthlyFunding = goals.reduce((total, goal) => total + goal.monthlyContribution, 0);

  return {
    count: goals.length,
    targetAmount,
    savedAmount,
    monthlyFunding,
    progress: getPercentage(savedAmount, targetAmount),
    progressLabel: getSummaryProgressLabel(goals.length, savedAmount, targetAmount),
  };
}

export function getPercentage(current: number, target: number) {
  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

function getSummaryProgressLabel(goalCount: number, savedAmount: number, targetAmount: number) {
  if (goalCount === 0) {
    return "No active funding";
  }

  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return "Set target amount";
  }

  return `${getPercentage(savedAmount, targetAmount)}% funded`;
}

export function getGoalProgressLabel(goal: Goal, progress: number) {
  if (!Number.isFinite(goal.targetAmount) || goal.targetAmount <= 0) {
    return "Set target amount";
  }

  return `${progress}% saved`;
}

export function getGoalDateLabel(goal: Goal) {
  if (goal.targetDate) {
    return formatLongDate(parseDisplayDate(goal.targetDate));
  }

  if (!Number.isFinite(goal.targetAmount) || goal.targetAmount <= 0) {
    return "Set target amount";
  }

  const remainingAmount = goal.targetAmount - goal.savedAmount;

  if (remainingAmount <= 0) {
    return "Funded";
  }

  if (!Number.isFinite(goal.monthlyContribution) || goal.monthlyContribution <= 0) {
    return "Add a contribution";
  }

  const monthsNeeded = Math.ceil(remainingAmount / goal.monthlyContribution);
  const date = new Date();
  date.setMonth(date.getMonth() + monthsNeeded);

  return formatLongDate(date);
}

export function getGoalPlan(goal: Goal, monthlyFreeCashFlow: number, payFrequency: PayFrequency) {
  const remainingAmount = Math.max(0, goal.targetAmount - goal.savedAmount);
  const payPeriods = payPeriodsPerMonth[payFrequency];
  const monthsUntilTarget = goal.targetDate
    ? getMonthDistance(new Date(), parseDisplayDate(goal.targetDate))
    : 0;
  const neededMonthlyContribution =
    remainingAmount <= 0
      ? 0
      : monthsUntilTarget > 0
        ? Math.ceil(remainingAmount / monthsUntilTarget)
        : goal.monthlyContribution;
  const perPaydayContribution =
    payPeriods > 0 ? Math.ceil(neededMonthlyContribution / payPeriods) : neededMonthlyContribution;
  const isRealistic =
    remainingAmount <= 0 ||
    (neededMonthlyContribution > 0 && neededMonthlyContribution <= monthlyFreeCashFlow);

  return {
    neededMonthlyContribution,
    perPaydayContribution,
    isRealistic,
  };
}

export function formatPriority(priority: GoalPriority) {
  const labels = {
    high: "High priority",
    medium: "Medium priority",
    low: "Low priority",
  };

  return labels[priority];
}

const shortPriorityLabels: Record<GoalPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function getShortPriorityLabel(priority: GoalPriority) {
  return shortPriorityLabels[priority];
}

const priorityBadgeVariants: Record<GoalPriority, "risk" | "caution" | "safe"> = {
  high: "risk",
  medium: "caution",
  low: "safe",
};

export function getPriorityBadgeVariant(priority: GoalPriority) {
  return priorityBadgeVariants[priority];
}

const iconKeywords: ReadonlyArray<readonly [readonly string[], LucideIcon]> = [
  [["emergency", "buffer", "safety", "rainy", "fund"], ShieldCheck],
  [["phone", "iphone", "android", "mobile"], Smartphone],
  [["laptop", "macbook", "computer", "pc", "desktop"], Laptop],
  [["camera", "lens", "photo"], Camera],
  [["headphone", "earbud", "audio", "speaker"], Headphones],
  [["trip", "travel", "vacation", "japan", "flight", "holiday"], Plane],
  [["home", "house", "down payment", "condo", "property", "rent"], Home],
  [["car", "vehicle", "motor", "bike"], Car],
  [["school", "tuition", "course", "degree", "study"], GraduationCap],
];

export function getGoalIcon(label: string): LucideIcon {
  const normalized = label.toLowerCase();
  for (const [keywords, icon] of iconKeywords) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return icon;
    }
  }

  return Target;
}

const dateComponentPattern = /^(\d{4})-(\d{2})-(\d{2})/;

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function parseDisplayDate(value: string) {
  const dateComponentMatch = dateComponentPattern.exec(value);

  if (dateComponentMatch) {
    const [, year, month, day] = dateComponentMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  return new Date(value);
}

function getMonthDistance(from: Date, to: Date) {
  const months = (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth();
  return Math.max(1, months);
}
