"use client";

import { AlertTriangle, CalendarDays, CheckCircle2, Lightbulb, Plus, Target, Trash2, X } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError, Input, Label, Select } from "@/components/ui/form-fields";
import { Progress } from "@/components/ui/progress";
import { advisorInsight, referenceGoals } from "@/features/reference-data";
import { formatCurrency } from "@/lib/utils";
import type { CurrencyCode, FinancialSnapshot, Goal, PayFrequency } from "@/types/finance";

type GoalDraft = Omit<Goal, "id">;

type GoalFormValues = {
  label: string;
  targetAmount: string;
  savedAmount: string;
  monthlyContribution: string;
  targetDate: string;
  priority: Goal["priority"];
};

type GoalFormErrors = Partial<Record<keyof GoalFormValues, string>>;

const emptyGoalForm: GoalFormValues = {
  label: "",
  targetAmount: "",
  savedAmount: "0",
  monthlyContribution: "",
  targetDate: "",
  priority: "medium",
};

const payPeriodsPerMonth: Record<PayFrequency, number> = {
  monthly: 1,
  semi_monthly: 2,
  biweekly: 26 / 12,
  weekly: 52 / 12,
};

export function GoalsPanel({
  snapshot,
  monthlyFreeCashFlow,
  onCreateGoal,
  onDeleteGoal,
}: {
  snapshot: FinancialSnapshot;
  monthlyFreeCashFlow: number;
  onCreateGoal: (goal: GoalDraft) => Promise<Goal | undefined>;
  onDeleteGoal: (id: string) => Promise<void>;
}) {
  const currency = snapshot.profile.currency;
  const payFrequency = snapshot.profile.payFrequency ?? "monthly";
  const summary = getGoalSummary(snapshot.goals);
  const [isCreating, setIsCreating] = useState(false);
  const [formValues, setFormValues] = useState<GoalFormValues>(emptyGoalForm);
  const [formErrors, setFormErrors] = useState<GoalFormErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [pendingCreate, setPendingCreate] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const formErrorMessages = Object.values(formErrors).filter(Boolean);

  function updateField<K extends keyof GoalFormValues>(field: K, value: GoalFormValues[K]) {
    setFormValues((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => {
      const rest = { ...current };
      delete rest[field];
      return rest;
    });
    setFormMessage(null);
  }

  async function submitGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage(null);
    const parsed = parseGoalForm(formValues);

    if (!parsed.ok) {
      setFormErrors(parsed.errors);
      return;
    }

    setPendingCreate(true);

    try {
      await onCreateGoal(parsed.goal);
      setFormValues(emptyGoalForm);
      setFormErrors({});
      setIsCreating(false);
      setFormMessage("Goal created.");
    } catch {
      setFormMessage("We couldn't create this goal. Please try again.");
    } finally {
      setPendingCreate(false);
    }
  }

  async function deleteGoal(id: string) {
    setFormMessage(null);
    setPendingDeleteId(id);

    try {
      await onDeleteGoal(id);
    } catch {
      setFormMessage("We couldn't delete this goal. Please try again.");
    } finally {
      setPendingDeleteId(null);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid size-11 place-items-center rounded-control bg-safe/10 text-safe">
            <Target className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-muted">
              Goal funding
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
              Savings goals
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Keep target dates, monthly contributions, and tradeoffs visible before turning a want
              into a purchase.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="default"
          className="sm:w-auto"
          onClick={() => {
            setIsCreating(true);
            setFormMessage(null);
          }}
          aria-expanded={isCreating}
        >
          <Plus className="size-4" aria-hidden="true" />
          New Goal
        </Button>
      </div>

      {formMessage ? (
        <p
          role={formMessage.startsWith("We couldn't") ? "alert" : "status"}
          className="rounded-control border border-border bg-slate-50 px-3 py-2 text-sm text-muted"
        >
          {formMessage}
        </p>
      ) : null}

      {isCreating ? (
        <Card aria-labelledby="new-goal-heading">
          <CardContent>
            <form className="grid gap-4" onSubmit={submitGoal} noValidate>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 id="new-goal-heading" className="text-lg font-semibold text-foreground">
                    New savings goal
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    Set a target, then check the monthly and payday funding pressure.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Cancel new goal"
                  onClick={() => {
                    setIsCreating(false);
                    setFormValues(emptyGoalForm);
                    setFormErrors({});
                  }}
                >
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </div>

              {formErrorMessages.length > 0 ? (
                <div
                  role="alert"
                  className="rounded-control border border-risk/20 bg-red-50 px-3 py-2 text-sm text-risk"
                >
                  <p className="font-semibold">Check the goal fields.</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {formErrorMessages.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="goal-label">Goal name</Label>
                  <Input
                    id="goal-label"
                    value={formValues.label}
                    onChange={(event) => updateField("label", event.target.value)}
                    aria-invalid={formErrors.label ? "true" : undefined}
                  />
                  <FieldError>{formErrors.label}</FieldError>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="goal-priority">Priority</Label>
                  <Select
                    id="goal-priority"
                    value={formValues.priority}
                    onChange={(event) =>
                      updateField("priority", event.target.value as Goal["priority"])
                    }
                  >
                    <option value="high">High priority</option>
                    <option value="medium">Medium priority</option>
                    <option value="low">Low priority</option>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="grid gap-2">
                  <Label htmlFor="goal-target">Target amount</Label>
                  <Input
                    id="goal-target"
                    inputMode="decimal"
                    type="number"
                    min="0"
                    value={formValues.targetAmount}
                    onChange={(event) => updateField("targetAmount", event.target.value)}
                    aria-invalid={formErrors.targetAmount ? "true" : undefined}
                  />
                  <FieldError>{formErrors.targetAmount}</FieldError>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="goal-saved">Saved so far</Label>
                  <Input
                    id="goal-saved"
                    inputMode="decimal"
                    type="number"
                    min="0"
                    value={formValues.savedAmount}
                    onChange={(event) => updateField("savedAmount", event.target.value)}
                    aria-invalid={formErrors.savedAmount ? "true" : undefined}
                  />
                  <FieldError>{formErrors.savedAmount}</FieldError>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="goal-monthly">Monthly contribution</Label>
                  <Input
                    id="goal-monthly"
                    inputMode="decimal"
                    type="number"
                    min="0"
                    value={formValues.monthlyContribution}
                    onChange={(event) => updateField("monthlyContribution", event.target.value)}
                    aria-invalid={formErrors.monthlyContribution ? "true" : undefined}
                  />
                  <FieldError>{formErrors.monthlyContribution}</FieldError>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="goal-target-date">Target date</Label>
                  <Input
                    id="goal-target-date"
                    type="date"
                    value={formValues.targetDate}
                    onChange={(event) => updateField("targetDate", event.target.value)}
                    aria-invalid={formErrors.targetDate ? "true" : undefined}
                  />
                  <FieldError>{formErrors.targetDate}</FieldError>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsCreating(false);
                    setFormValues(emptyGoalForm);
                    setFormErrors({});
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={pendingCreate} isLoading={pendingCreate}>
                  Create Goal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div
        data-testid="goals-summary-metrics"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <SummaryMetric label="Active Goals" value={String(summary.count)} helper="Tracked targets" />
        <SummaryMetric
          label="Total Target"
          value={formatCurrency(summary.targetAmount, currency)}
          helper="All goal targets"
        />
        <SummaryMetric
          label="Saved So Far"
          value={formatCurrency(summary.savedAmount, currency)}
          helper={summary.progressLabel}
        />
        <SummaryMetric
          label="Monthly Funding"
          value={formatCurrency(summary.monthlyFunding, currency)}
          helper="Planned contributions"
        />
      </div>

      {snapshot.goals.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {snapshot.goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currency={currency}
              monthlyFreeCashFlow={monthlyFreeCashFlow}
              payFrequency={payFrequency}
              isDeleting={pendingDeleteId === goal.id}
              onDeleteGoal={deleteGoal}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent>
            <p className="rounded-control border border-dashed border-border bg-muted/40 p-5 text-sm leading-6 text-muted">
              Purchase decisions can be converted into goals. Add a savings target before taking on
              flexible wants.
            </p>
          </CardContent>
        </Card>
      )}

      <Card aria-labelledby="goals-advisor-tip-heading">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="grid size-11 shrink-0 place-items-center rounded-control bg-advisor text-primary">
            <Lightbulb className="size-5" aria-hidden="true" />
          </div>
          <div className="grid gap-2">
            <p
              id="goals-advisor-tip-heading"
              className="text-xs font-semibold uppercase tracking-normal text-primary"
            >
              Advisor tip
            </p>
            <p className="text-sm leading-6 text-muted">
              Fund the most important goal before flexible wants. {advisorInsight.body}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Card aria-label={`${label} metric`} className="min-w-0">
      <CardContent className="grid min-h-32 content-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-normal text-muted">{label}</h3>
        <div>
          <p className="truncate text-2xl font-semibold text-foreground">{value}</p>
          <p className="mt-2 text-xs leading-5 text-muted">{helper}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function GoalCard({
  goal,
  currency,
  monthlyFreeCashFlow,
  payFrequency,
  isDeleting,
  onDeleteGoal,
}: {
  goal: Goal;
  currency: CurrencyCode;
  monthlyFreeCashFlow: number;
  payFrequency: PayFrequency;
  isDeleting: boolean;
  onDeleteGoal: (id: string) => Promise<void>;
}) {
  const progress = getPercentage(goal.savedAmount, goal.targetAmount);
  const progressLabel = getGoalProgressLabel(goal, progress);
  const dateLabel = getGoalDateLabel(goal);
  const plan = getGoalPlan(goal, monthlyFreeCashFlow, payFrequency);
  const helper = referenceGoals[goal.id]?.helperText ?? `${formatPriority(goal.priority)} goal`;

  return (
    <article
      aria-label={`${goal.label} goal`}
      className="grid gap-5 rounded-card border border-border bg-surface p-5 shadow-card"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">{goal.label}</h3>
            {goal.priority === "high" ? <Badge tone="green">Most important</Badge> : null}
          </div>
          <p className="mt-2 text-sm text-muted">
            {formatCurrency(goal.savedAmount, currency)} of{" "}
            {formatCurrency(goal.targetAmount, currency)}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Delete ${goal.label}`}
          disabled={isDeleting}
          isLoading={isDeleting}
          onClick={() => void onDeleteGoal(goal.id)}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-foreground">{progressLabel}</span>
          <span className="text-muted">{formatPriority(goal.priority)}</span>
        </div>
        <Progress value={progress} label={`${goal.label} progress`} />
      </div>

      <p className="text-sm leading-6 text-muted">{helper}</p>

      <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
        <GoalFact label="Monthly contribution">
          {formatCurrency(goal.monthlyContribution, currency)} monthly contribution
        </GoalFact>
        <GoalFact label="Needed monthly">
          {formatCurrency(plan.neededMonthlyContribution, currency)} needed monthly
        </GoalFact>
        <GoalFact label="Per payday">
          {formatCurrency(plan.perPaydayContribution, currency)} / payday
        </GoalFact>
        <GoalFact label="Estimated completion">Estimated completion {dateLabel}</GoalFact>
        <GoalFact label="Safe-buy date">Safe-buy date {dateLabel}</GoalFact>
        <GoalFact label="Plan fit">
          <span className="flex items-center gap-2">
            {plan.isRealistic ? (
              <CheckCircle2 className="size-4 text-safe" aria-hidden="true" />
            ) : (
              <AlertTriangle className="size-4 text-caution" aria-hidden="true" />
            )}
            {plan.isRealistic ? "Realistic" : "Tight plan"}
          </span>
        </GoalFact>
      </dl>

      <p className="flex items-center gap-2 text-xs text-muted">
        <CalendarDays aria-hidden="true" className="size-3.5" />
        {plan.isRealistic
          ? "Goal funding fits inside current free cash flow."
          : "Needed monthly funding is above current free cash flow."}
      </p>
    </article>
  );
}

function GoalFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-control border border-border bg-muted/30 p-3">
      <dt className="text-xs font-semibold uppercase tracking-normal text-muted">{label}</dt>
      <dd className="mt-1 font-medium text-foreground">{children}</dd>
    </div>
  );
}

function getGoalSummary(goals: Goal[]) {
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

function getPercentage(current: number, target: number) {
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

function getGoalProgressLabel(goal: Goal, progress: number) {
  if (!Number.isFinite(goal.targetAmount) || goal.targetAmount <= 0) {
    return "Set target amount";
  }

  return `${progress}% saved`;
}

function getGoalDateLabel(goal: Goal) {
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

function getGoalPlan(goal: Goal, monthlyFreeCashFlow: number, payFrequency: PayFrequency) {
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

function formatPriority(priority: Goal["priority"]) {
  const labels = {
    high: "High priority",
    medium: "Medium priority",
    low: "Low priority",
  };

  return labels[priority];
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

function parseGoalForm(values: GoalFormValues):
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

  if (Number.isFinite(targetAmount) && Number.isFinite(savedAmount) && savedAmount > targetAmount) {
    errors.savedAmount = "Saved amount cannot exceed the target.";
  }

  if (!Number.isFinite(monthlyContribution) || monthlyContribution <= 0) {
    errors.monthlyContribution = "Enter a monthly contribution above zero.";
  }

  if (targetDate && !isIsoDate(targetDate)) {
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

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
