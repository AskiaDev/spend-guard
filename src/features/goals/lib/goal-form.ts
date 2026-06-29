import type { Goal } from "@/types/finance";

export type GoalDraft = Omit<Goal, "id">;

export type GoalFormValues = {
  label: string;
  targetAmount: string;
  savedAmount: string;
  monthlyContribution: string;
  targetDate: string;
  priority: Goal["priority"];
};

export type GoalFormErrors = Partial<Record<keyof GoalFormValues, string>>;

export const emptyGoalForm: GoalFormValues = {
  label: "",
  targetAmount: "",
  savedAmount: "0",
  monthlyContribution: "",
  targetDate: "",
  priority: "medium",
};

export function toGoalForm(goal: Goal): GoalFormValues {
  return {
    label: goal.label,
    targetAmount: String(goal.targetAmount),
    savedAmount: String(goal.savedAmount),
    monthlyContribution: String(goal.monthlyContribution),
    targetDate: goal.targetDate ?? "",
    priority: goal.priority,
  };
}

export function parseGoalForm(values: GoalFormValues):
  | { ok: true; goal: GoalDraft }
  | { ok: false; errors: GoalFormErrors } {
  const errors: GoalFormErrors = {};
  const label = values.label.trim();
  const targetAmount = Number(values.targetAmount);
  const savedAmount = values.savedAmount.trim() === "" ? 0 : Number(values.savedAmount);
  const monthlyContribution = Number(values.monthlyContribution);
  const targetDate = values.targetDate.trim();

  if (!label) {
    errors.label = "Name this goal.";
  }

  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    errors.targetAmount = "Enter a target amount above zero.";
  }

  if (!Number.isFinite(savedAmount) || savedAmount < 0) {
    errors.savedAmount = "Enter saved amount as zero or more.";
  }

  if (!Number.isFinite(monthlyContribution) || monthlyContribution <= 0) {
    errors.monthlyContribution = "Enter a monthly contribution above zero.";
  }

  if (Number.isFinite(savedAmount) && Number.isFinite(targetAmount) && savedAmount > targetAmount) {
    errors.savedAmount = "Saved amount cannot exceed the target.";
  }

  if (targetDate && Number.isNaN(Date.parse(targetDate))) {
    errors.targetDate = "Enter a valid target date.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    goal: {
      label,
      targetAmount,
      savedAmount,
      monthlyContribution,
      targetDate: targetDate || undefined,
      priority: values.priority,
    },
  };
}
