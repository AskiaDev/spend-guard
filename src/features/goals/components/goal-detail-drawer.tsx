"use client";

import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import type { ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import type { CurrencyCode, Goal, GoalPriority, PayFrequency } from "@/types/finance";
import { referenceGoals } from "@/features/reference-data";

import {
  getGoalDateLabel,
  getGoalPlan,
  getPaydayCadenceLabel,
  getPercentage,
  getShortPriorityLabel,
  formatPriority,
} from "../lib/goal-calculations";
import { GoalIcon } from "./goal-icon";

const priorityValueColor: Record<GoalPriority, string> = {
  high: "text-risk",
  medium: "text-caution",
  low: "text-safe",
};

export function GoalDetailDrawer({
  goal,
  open,
  onOpenChange,
  currency,
  monthlyFreeCashFlow,
  payFrequency,
  onDelete,
  isDeleting,
}: {
  goal: Goal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: CurrencyCode;
  monthlyFreeCashFlow: number;
  payFrequency: PayFrequency;
  onDelete: (id: string) => Promise<void>;
  isDeleting: boolean;
}) {
  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="sm:max-w-[27rem]">
        {goal ? (
          <GoalDetailContent
            goal={goal}
            currency={currency}
            monthlyFreeCashFlow={monthlyFreeCashFlow}
            payFrequency={payFrequency}
            onDelete={onDelete}
            isDeleting={isDeleting}
          />
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

function GoalDetailContent({
  goal,
  currency,
  monthlyFreeCashFlow,
  payFrequency,
  onDelete,
  isDeleting,
}: {
  goal: Goal;
  currency: CurrencyCode;
  monthlyFreeCashFlow: number;
  payFrequency: PayFrequency;
  onDelete: (id: string) => Promise<void>;
  isDeleting: boolean;
}) {
  const hasTarget = Number.isFinite(goal.targetAmount) && goal.targetAmount > 0;
  const progress = getPercentage(goal.savedAmount, goal.targetAmount);
  const dateLabel = getGoalDateLabel(goal);
  const plan = getGoalPlan(goal, monthlyFreeCashFlow, payFrequency);
  const notes = referenceGoals[goal.id]?.helperText ?? `${formatPriority(goal.priority)} goal`;

  return (
    <>
      <DrawerHeader className="gap-0 border-b border-border p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-control bg-secondary text-foreground">
              <GoalIcon label={goal.label} className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <DrawerTitle className="truncate">{goal.label}</DrawerTitle>
                {goal.priority === "high" ? <Badge variant="safe">Most important</Badge> : null}
              </div>
              <DrawerDescription className="mt-1">{notes}</DrawerDescription>
            </div>
          </div>
          <DrawerClose
            aria-label="Close goal details"
            className="grid size-9 shrink-0 place-items-center rounded-control text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" aria-hidden="true" />
          </DrawerClose>
        </div>
      </DrawerHeader>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <Section title="Overview">
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
            <StatTile label="Target" value={formatCurrency(goal.targetAmount, currency)} hint="Total amount" />
            <StatTile
              label="Saved so far"
              value={formatCurrency(goal.savedAmount, currency)}
              hint={hasTarget ? `${progress}% of target` : "Set a target"}
            />
            <StatTile label="Safe-buy date" value={dateLabel} hint="Estimated completion" />
            <StatTile
              label="Priority"
              value={getShortPriorityLabel(goal.priority)}
              valueClassName={priorityValueColor[goal.priority]}
              hint="Goal priority"
            />
            <StatTile
              label="Monthly funding"
              value={formatCurrency(goal.monthlyContribution, currency)}
              hint="Planned contribution"
            />
            <StatTile
              label="Per payday"
              value={formatCurrency(plan.perPaydayContribution, currency)}
              hint={getPaydayCadenceLabel(payFrequency)}
            />
          </div>
        </Section>

        <Section title="Progress">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-foreground">
              {hasTarget ? `${progress}% saved` : "Set target amount"}
            </span>
            <span className="text-muted-foreground">
              {formatCurrency(goal.savedAmount, currency)} of{" "}
              {formatCurrency(goal.targetAmount, currency)}
            </span>
          </div>
          <Progress className="mt-3" value={progress} label={`${goal.label} progress`} />
        </Section>

        <Section title="Details">
          <dl className="divide-y divide-border">
            <DetailRow label="Estimated completion">{dateLabel}</DetailRow>
            <DetailRow label="Safe-buy date">{dateLabel}</DetailRow>
            <DetailRow label="Plan fit">
              <span className="flex items-center gap-1.5">
                {plan.isRealistic ? (
                  <CheckCircle2 className="size-4 text-safe" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="size-4 text-caution" aria-hidden="true" />
                )}
                {plan.isRealistic ? "Realistic" : "Tight plan"}
              </span>
            </DetailRow>
            <DetailRow label="Goal notes">{notes}</DetailRow>
          </dl>
        </Section>
      </div>

      <DrawerFooter className="border-t border-border">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive" className="w-full" isLoading={isDeleting}>
              Delete goal
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Remove goal?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove {goal.label} from your tracked goals.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => void onDelete(goal.id)}>
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DrawerFooter>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-card p-4">
      <h3 className="text-[0.6875rem] font-semibold uppercase tracking-normal text-muted-foreground">
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StatTile({
  label,
  value,
  hint,
  valueClassName,
}: {
  label: string;
  value: string;
  hint: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 truncate text-sm font-semibold text-foreground ${valueClassName ?? ""}`}>
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{children}</dd>
    </div>
  );
}
