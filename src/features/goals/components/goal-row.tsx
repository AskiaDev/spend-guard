"use client";

import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { CurrencyCode, Goal } from "@/types/finance";

import {
  getGoalDateLabel,
  getPercentage,
  getPriorityBadgeVariant,
  getShortPriorityLabel,
} from "../lib/goal-calculations";
import { GoalIcon } from "./goal-icon";

export const GOALS_LIST_GRID =
  "lg:grid lg:grid-cols-[minmax(0,1.9fr)_minmax(7rem,0.9fr)_minmax(0,1fr)_minmax(0,1fr)_auto_minmax(0,0.8fr)_1rem] lg:items-center lg:gap-4";

export function GoalRow({
  goal,
  currency,
  onSelect,
}: {
  goal: Goal;
  currency: CurrencyCode;
  onSelect: (goal: Goal) => void;
}) {
  const hasTarget = Number.isFinite(goal.targetAmount) && goal.targetAmount > 0;
  const progress = getPercentage(goal.savedAmount, goal.targetAmount);
  const dateLabel = getGoalDateLabel(goal);
  const isHighPriority = goal.priority === "high";

  return (
    <button
      type="button"
      onClick={() => onSelect(goal)}
      aria-label={`View ${goal.label} details`}
      className="group relative block w-full px-4 py-4 text-left transition-colors first:rounded-t-card last:rounded-b-card hover:bg-accent/40 focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border lg:px-5"
    >
      <div className={GOALS_LIST_GRID}>
        <div className="flex min-w-0 items-start gap-3 pr-8 lg:pr-0">
          <span className="grid size-10 shrink-0 place-items-center rounded-control bg-secondary text-foreground/80 transition-colors group-hover:text-foreground">
            <GoalIcon label={goal.label} className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-semibold tracking-tight text-foreground">
                {goal.label}
              </span>
              {isHighPriority ? <Badge variant="safe">Most important</Badge> : null}
            </div>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {formatCurrency(goal.savedAmount, currency)} of{" "}
              {formatCurrency(goal.targetAmount, currency)}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 lg:contents">
          <Cell label="Progress">
            {hasTarget ? (
              <div className="flex items-center gap-2 lg:flex-col lg:items-start lg:gap-1.5">
                <span className="text-sm font-semibold text-foreground">{progress}%</span>
                <span
                  className="h-1.5 w-full max-w-28 overflow-hidden rounded-full bg-muted"
                  aria-hidden="true"
                >
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${progress}%` }}
                  />
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Set target</span>
            )}
          </Cell>

          <Cell label="Target">
            <p className="text-sm font-medium text-foreground">
              {formatCurrency(goal.targetAmount, currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(goal.savedAmount, currency)} saved
            </p>
          </Cell>

          <Cell label="Safe-buy date">
            <p className="text-sm font-medium text-foreground">{dateLabel}</p>
            <p className="text-xs text-muted-foreground">Est. completion</p>
          </Cell>

          <Cell label="Priority">
            <Badge variant={getPriorityBadgeVariant(goal.priority)}>
              {getShortPriorityLabel(goal.priority)}
            </Badge>
          </Cell>

          <Cell label="Monthly funding">
            <p className="text-sm font-medium text-foreground">
              {formatCurrency(goal.monthlyContribution, currency)}
            </p>
          </Cell>
        </div>

        <ChevronRight
          className="absolute top-4 right-4 size-5 text-muted-foreground transition-colors group-hover:text-foreground lg:static lg:top-auto lg:right-auto lg:size-4"
          aria-hidden="true"
        />
      </div>
    </button>
  );
}

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.625rem] font-semibold uppercase tracking-normal text-muted-foreground lg:hidden">
        {label}
      </p>
      <div className="mt-1 lg:mt-0">{children}</div>
    </div>
  );
}
