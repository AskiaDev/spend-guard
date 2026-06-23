"use client";

import { CalendarDays, Lightbulb, Plus, Target, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { advisorInsight, referenceGoals } from "@/features/reference-data";
import { formatCurrency } from "@/lib/utils";
import type { CurrencyCode, FinancialSnapshot, Goal } from "@/types/finance";

export function GoalsPanel({
  snapshot,
  onDeleteGoal,
}: {
  snapshot: FinancialSnapshot;
  onDeleteGoal: (id: string) => Promise<void>;
}) {
  const currency = snapshot.profile.currency;
  const summary = getGoalSummary(snapshot.goals);

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
          disabled
          aria-describedby="new-goal-availability"
        >
          <Plus className="size-4" aria-hidden="true" />
          New Goal
        </Button>
      </div>
      <p id="new-goal-availability" className="-mt-3 text-xs leading-5 text-muted">
        Goal creation is coming soon. For now, create goals from purchase decisions or onboarding.
      </p>

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
              onDeleteGoal={onDeleteGoal}
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
  onDeleteGoal,
}: {
  goal: Goal;
  currency: CurrencyCode;
  onDeleteGoal: (id: string) => Promise<void>;
}) {
  const progress = getPercentage(goal.savedAmount, goal.targetAmount);
  const progressLabel = getGoalProgressLabel(goal, progress);
  const dateLabel = getGoalDateLabel(goal);
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

      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <GoalFact label="Monthly contribution">
          {formatCurrency(goal.monthlyContribution, currency)} monthly contribution
        </GoalFact>
        <GoalFact label="Estimated completion">Estimated completion {dateLabel}</GoalFact>
        <GoalFact label="Safe-buy date">Safe-buy date {dateLabel}</GoalFact>
      </dl>

      <p className="flex items-center gap-2 text-xs text-muted">
        <CalendarDays aria-hidden="true" className="size-3.5" />
        Target dates are displayed as local calendar dates to avoid timezone drift.
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
