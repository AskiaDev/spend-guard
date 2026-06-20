"use client";

import { Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import type { FinancialSnapshot, Goal } from "@/types/finance";

export function GoalsPanel({
  snapshot,
  onDeleteGoal,
}: {
  snapshot: FinancialSnapshot;
  onDeleteGoal: (id: string) => Promise<void>;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-md bg-emerald-100 text-emerald-800">
            <Target className="size-5" aria-hidden="true" />
          </div>
          <CardTitle>Goals</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {snapshot.goals.map((goal) => (
          <GoalRow
            key={goal.id}
            goal={goal}
            currency={snapshot.profile.currency}
            onDeleteGoal={onDeleteGoal}
          />
        ))}
        {snapshot.goals.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 p-5 text-sm text-zinc-600">
            Purchase decisions can be converted into goals.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function GoalRow({
  goal,
  currency,
  onDeleteGoal,
}: {
  goal: Goal;
  currency: FinancialSnapshot["profile"]["currency"];
  onDeleteGoal: (id: string) => Promise<void>;
}) {
  const progress = goal.targetAmount > 0 ? (goal.savedAmount / goal.targetAmount) * 100 : 100;

  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-zinc-950">{goal.label}</h3>
          <p className="mt-1 text-sm text-zinc-600">
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
      <Progress className="mt-4" value={progress} />
      <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium text-zinc-600">
        <span>{formatCurrency(goal.monthlyContribution, currency)}/mo</span>
        <span>{goal.priority} priority</span>
        {goal.targetDate ? <span>target {goal.targetDate}</span> : null}
      </div>
    </div>
  );
}
