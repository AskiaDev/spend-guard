"use client";

import { AlertTriangle, CheckCircle2, Pencil } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { FieldError, Input, Label } from "@/components/ui/form-fields";
import { MutationDrawer } from "@/components/ui/mutation-drawer";
import { Progress } from "@/components/ui/progress";
import { RemoveConfirmation } from "@/components/ui/remove-confirmation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  parseGoalForm,
  toGoalForm,
  type GoalDraft,
  type GoalFormErrors,
  type GoalFormValues,
} from "../lib/goal-form";
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
  onUpdate,
  isUpdating,
  onDelete,
  isDeleting,
}: {
  goal: Goal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: CurrencyCode;
  monthlyFreeCashFlow: number;
  payFrequency: PayFrequency;
  onUpdate: (id: string, goal: GoalDraft) => Promise<void>;
  isUpdating: boolean;
  onDelete: (id: string) => Promise<void>;
  isDeleting: boolean;
}) {
  return (
    <MutationDrawer.Root
      open={open}
      onOpenChange={onOpenChange}
      closeLabel="Close goal details"
    >
      {goal ? (
        <GoalDetailContent
          goal={goal}
          currency={currency}
          monthlyFreeCashFlow={monthlyFreeCashFlow}
          payFrequency={payFrequency}
          onUpdate={onUpdate}
          isUpdating={isUpdating}
          onDelete={onDelete}
          isDeleting={isDeleting}
        />
      ) : null}
    </MutationDrawer.Root>
  );
}

function GoalDetailContent({
  goal,
  currency,
  monthlyFreeCashFlow,
  payFrequency,
  onUpdate,
  isUpdating,
  onDelete,
  isDeleting,
}: {
  goal: Goal;
  currency: CurrencyCode;
  monthlyFreeCashFlow: number;
  payFrequency: PayFrequency;
  onUpdate: (id: string, goal: GoalDraft) => Promise<void>;
  isUpdating: boolean;
  onDelete: (id: string) => Promise<void>;
  isDeleting: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [values, setValues] = useState<GoalFormValues>(() => toGoalForm(goal));
  const [errors, setErrors] = useState<GoalFormErrors>({});
  const hasTarget = Number.isFinite(goal.targetAmount) && goal.targetAmount > 0;
  const progress = getPercentage(goal.savedAmount, goal.targetAmount);
  const dateLabel = getGoalDateLabel(goal);
  const plan = getGoalPlan(goal, monthlyFreeCashFlow, payFrequency);
  const notes = referenceGoals[goal.id]?.helperText ?? `${formatPriority(goal.priority)} goal`;

  function updateField<K extends keyof GoalFormValues>(field: K, value: GoalFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const rest = { ...current };
      delete rest[field];
      return rest;
    });
  }

  function startEdit() {
    setValues(toGoalForm(goal));
    setErrors({});
    setIsEditing(true);
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseGoalForm(values);

    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }

    await onUpdate(goal.id, parsed.goal);
    setIsEditing(false);
  }

  if (isEditing) {
    const errorMessages = Object.values(errors).filter(Boolean);

    return (
      <MutationDrawer.Form onSubmit={submitEdit}>
        <MutationDrawer.Header>
          <div>
            <MutationDrawer.Title>Edit goal</MutationDrawer.Title>
            <MutationDrawer.Description>{goal.label}</MutationDrawer.Description>
          </div>
        </MutationDrawer.Header>

        <MutationDrawer.Body>
          {errorMessages.length > 0 ? (
            <div
              role="alert"
              className="rounded-control border border-risk/20 bg-risk/10 px-3 py-2 text-sm text-risk"
            >
              <p className="font-semibold">Check the goal fields.</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {errorMessages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="edit-goal-label">Goal name</Label>
            <Input
              id="edit-goal-label"
              value={values.label}
              onChange={(event) => updateField("label", event.target.value)}
              aria-invalid={errors.label ? "true" : undefined}
            />
            <FieldError>{errors.label}</FieldError>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-goal-priority">Priority</Label>
            <Select
              value={values.priority}
              onValueChange={(value) => updateField("priority", value as Goal["priority"])}
            >
              <SelectTrigger id="edit-goal-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High priority</SelectItem>
                <SelectItem value="medium">Medium priority</SelectItem>
                <SelectItem value="low">Low priority</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-goal-target">Target amount</Label>
            <Input
              id="edit-goal-target"
              inputMode="decimal"
              type="number"
              min="0"
              value={values.targetAmount}
              onChange={(event) => updateField("targetAmount", event.target.value)}
              aria-invalid={errors.targetAmount ? "true" : undefined}
            />
            <FieldError>{errors.targetAmount}</FieldError>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-goal-saved">Saved so far</Label>
            <Input
              id="edit-goal-saved"
              inputMode="decimal"
              type="number"
              min="0"
              value={values.savedAmount}
              onChange={(event) => updateField("savedAmount", event.target.value)}
              aria-invalid={errors.savedAmount ? "true" : undefined}
            />
            <FieldError>{errors.savedAmount}</FieldError>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-goal-monthly">Monthly contribution</Label>
            <Input
              id="edit-goal-monthly"
              inputMode="decimal"
              type="number"
              min="0"
              value={values.monthlyContribution}
              onChange={(event) => updateField("monthlyContribution", event.target.value)}
              aria-invalid={errors.monthlyContribution ? "true" : undefined}
            />
            <FieldError>{errors.monthlyContribution}</FieldError>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-goal-target-date">Target date</Label>
            <DatePicker
              id="edit-goal-target-date"
              value={values.targetDate}
              onChange={(value) => updateField("targetDate", value)}
              ariaInvalid={errors.targetDate ? true : undefined}
            />
            <FieldError>{errors.targetDate}</FieldError>
          </div>
        </MutationDrawer.Body>

        <MutationDrawer.Footer>
          <Button type="submit" disabled={isUpdating} isLoading={isUpdating}>
            Save Goal
          </Button>
          <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </MutationDrawer.Footer>
      </MutationDrawer.Form>
    );
  }

  return (
    <>
      <MutationDrawer.Header className="gap-0">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-control bg-secondary text-foreground">
            <GoalIcon label={goal.label} className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <MutationDrawer.Title className="truncate">{goal.label}</MutationDrawer.Title>
              {goal.priority === "high" ? <Badge variant="safe">Most important</Badge> : null}
            </div>
            <MutationDrawer.Description className="mt-1">{notes}</MutationDrawer.Description>
          </div>
        </div>
      </MutationDrawer.Header>

      <MutationDrawer.Body>
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
      </MutationDrawer.Body>

      <MutationDrawer.Footer>
        <Button type="button" variant="secondary" className="w-full" onClick={startEdit}>
          <Pencil className="size-4" aria-hidden="true" />
          Edit goal
        </Button>
        <RemoveConfirmation
          title="Remove goal?"
          description={<>This will permanently remove {goal.label} from your tracked goals.</>}
          onConfirm={() => onDelete(goal.id)}
        >
          <Button type="button" variant="destructive" className="w-full" isLoading={isDeleting}>
            Delete goal
          </Button>
        </RemoveConfirmation>
      </MutationDrawer.Footer>
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
