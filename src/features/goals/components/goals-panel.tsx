"use client";

import { Info, Lightbulb, Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { gooeyToast } from "goey-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { FieldError, Input, Label } from "@/components/ui/form-fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { advisorInsight } from "@/features/reference-data";
import { cn, formatCurrency } from "@/lib/utils";
import type { FinancialSnapshot, Goal } from "@/types/finance";

import { getGoalSummary } from "../lib/goal-calculations";
import {
  emptyGoalForm,
  parseGoalForm,
  type GoalDraft,
  type GoalFormErrors,
  type GoalFormValues,
} from "../lib/goal-form";
import { GoalDetailDrawer } from "./goal-detail-drawer";
import { GOALS_LIST_GRID, GoalRow } from "./goal-row";

export function GoalsPanel({
  snapshot,
  monthlyFreeCashFlow,
  onCreateGoal,
  onUpdateGoal,
  onDeleteGoal,
}: {
  snapshot: FinancialSnapshot;
  monthlyFreeCashFlow: number;
  onCreateGoal: (goal: GoalDraft) => Promise<Goal | undefined>;
  onUpdateGoal: (id: string, goal: GoalDraft) => Promise<void>;
  onDeleteGoal: (id: string) => Promise<void>;
}) {
  const currency = snapshot.profile.currency;
  const payFrequency = snapshot.profile.payFrequency ?? "monthly";
  const summary = getGoalSummary(snapshot.goals);
  const fundingFits = summary.monthlyFunding <= monthlyFreeCashFlow;

  const [isCreating, setIsCreating] = useState(false);
  const [formValues, setFormValues] = useState<GoalFormValues>(emptyGoalForm);
  const [formErrors, setFormErrors] = useState<GoalFormErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [pendingCreate, setPendingCreate] = useState(false);
  const [pendingUpdateId, setPendingUpdateId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

  function openGoal(goal: Goal) {
    setActiveGoal(goal);
    setIsDrawerOpen(true);
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
      gooeyToast.success("Goal removed");
      setIsDrawerOpen(false);
    } catch {
      setFormMessage("We couldn't delete this goal. Please try again.");
    } finally {
      setPendingDeleteId(null);
    }
  }

  async function updateGoal(id: string, goal: GoalDraft) {
    setFormMessage(null);
    setPendingUpdateId(id);

    try {
      await onUpdateGoal(id, goal);
      setActiveGoal((current) => (current?.id === id ? { id, ...goal } : current));
      gooeyToast.success("Goal updated");
    } catch {
      setFormMessage("We couldn't update this goal. Please try again.");
      throw new Error("Unable to update goal.");
    } finally {
      setPendingUpdateId(null);
    }
  }

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-primary">
            Savings plan
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Savings goals
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Review every target, monthly contribution, and safe-buy date before flexible spending
            wins.
          </p>
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
      </header>

      {formMessage ? (
        <p
          role={formMessage.startsWith("We couldn't") ? "alert" : "status"}
          className="rounded-control border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground"
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
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
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
                  className="rounded-control border border-risk/20 bg-risk/10 px-3 py-2 text-sm text-risk"
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
                    value={formValues.priority}
                    onValueChange={(value) => updateField("priority", value as Goal["priority"])}
                  >
                    <SelectTrigger id="goal-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High priority</SelectItem>
                      <SelectItem value="medium">Medium priority</SelectItem>
                      <SelectItem value="low">Low priority</SelectItem>
                    </SelectContent>
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
                  <DatePicker
                    id="goal-target-date"
                    value={formValues.targetDate}
                    onChange={(value) => updateField("targetDate", value)}
                    ariaInvalid={formErrors.targetDate ? true : undefined}
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

      <section className="grid gap-3">
        <div className="flex items-baseline gap-2">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Your goals</h3>
          <span className="text-sm text-muted-foreground">({summary.count})</span>
        </div>

        {snapshot.goals.length > 0 ? (
          <>
            <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
              <div
                className={cn(
                  "hidden border-b border-border px-5 pb-3 pt-4 text-[0.625rem] font-semibold uppercase tracking-normal text-muted-foreground",
                  GOALS_LIST_GRID
                )}
              >
                <span>Goal</span>
                <span>Progress</span>
                <span>Target</span>
                <span>Safe-buy date</span>
                <span>Priority</span>
                <span>Monthly funding</span>
                <span className="sr-only">Open details</span>
              </div>

              {snapshot.goals.map((goal) => (
                <GoalRow key={goal.id} goal={goal} currency={currency} onSelect={openGoal} />
              ))}
            </div>

            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info aria-hidden="true" className="size-3.5" />
              {fundingFits
                ? "Goal funding fits inside your current free cash flow."
                : "Planned funding is above your current free cash flow."}
            </p>
          </>
        ) : (
          <Card>
            <CardContent>
              <p className="rounded-control border border-dashed border-border bg-muted/40 p-5 text-sm leading-6 text-muted-foreground">
                Purchase decisions can be converted into goals. Add a savings target before taking on
                flexible wants.
              </p>
            </CardContent>
          </Card>
        )}
      </section>

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
            <p className="text-sm leading-6 text-muted-foreground">
              Fund the most important goal before flexible wants. {advisorInsight.body}
            </p>
          </div>
        </CardContent>
      </Card>

      <GoalDetailDrawer
        goal={activeGoal}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        currency={currency}
        monthlyFreeCashFlow={monthlyFreeCashFlow}
        payFrequency={payFrequency}
        onUpdate={updateGoal}
        isUpdating={activeGoal ? pendingUpdateId === activeGoal.id : false}
        onDelete={deleteGoal}
        isDeleting={activeGoal ? pendingDeleteId === activeGoal.id : false}
      />
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
      <CardContent className="grid gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          {label}
        </h3>
        <p className="truncate text-2xl font-semibold text-foreground">{value}</p>
        <p className="text-xs leading-5 text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}
