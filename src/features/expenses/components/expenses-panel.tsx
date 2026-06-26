"use client";

import { CalendarDays, Pencil, Plus, ReceiptText, Trash2, X } from "lucide-react";
import { gooeyToast } from "goey-toast";
import { useState, type FormEvent } from "react";

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
import { Card, CardContent } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/form-fields";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import type { CurrencyCode, Expense } from "@/types/finance";

type ExpenseDraft = Omit<Expense, "id">;

type ExpenseFormValues = {
  label: string;
  amount: string;
  dueDay: string;
  isRecurring: "true" | "false";
};

type ExpenseFormErrors = Partial<Record<keyof ExpenseFormValues, string>>;

const emptyExpenseForm: ExpenseFormValues = {
  label: "",
  amount: "",
  dueDay: "1",
  isRecurring: "true",
};

export function ExpensesPanel({
  expenses,
  currency,
  onCreateExpense,
  onUpdateExpense,
  onDeleteExpense,
}: {
  expenses: Expense[];
  currency: CurrencyCode;
  onCreateExpense: (expense: ExpenseDraft) => Promise<Expense | undefined>;
  onUpdateExpense: (id: string, expense: ExpenseDraft) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<ExpenseFormValues>(emptyExpenseForm);
  const [formErrors, setFormErrors] = useState<ExpenseFormErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const totalMonthly = expenses.reduce((total, expense) => total + expense.amount, 0);
  const recurringCount = expenses.filter((expense) => expense.isRecurring).length;
  const formErrorMessages = Object.values(formErrors).filter(Boolean);

  function updateField<K extends keyof ExpenseFormValues>(field: K, value: ExpenseFormValues[K]) {
    setFormValues((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => {
      const rest = { ...current };
      delete rest[field];
      return rest;
    });
    setMessage(null);
  }

  function openCreateForm() {
    setEditingId(null);
    setFormValues(emptyExpenseForm);
    setFormErrors({});
    setMessage(null);
    setIsFormOpen(true);
  }

  function openEditForm(expense: Expense) {
    setEditingId(expense.id);
    setFormValues({
      label: expense.label,
      amount: String(expense.amount),
      dueDay: String(expense.dueDay),
      isRecurring: expense.isRecurring ? "true" : "false",
    });
    setFormErrors({});
    setMessage(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingId(null);
    setFormValues(emptyExpenseForm);
    setFormErrors({});
  }

  async function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const parsed = parseExpenseForm(formValues);

    if (!parsed.ok) {
      setFormErrors(parsed.errors);
      return;
    }

    setPendingAction("save");

    try {
      if (editingId) {
        await onUpdateExpense(editingId, parsed.expense);
        setMessage("Expense updated.");
      } else {
        await onCreateExpense(parsed.expense);
        setMessage("Expense created.");
      }

      closeForm();
    } catch {
      setMessage("We couldn't save this expense. Please try again.");
    } finally {
      setPendingAction(null);
    }
  }

  async function deleteExpense(expense: Expense) {
    setMessage(null);
    setPendingAction(`delete-${expense.id}`);

    try {
      await onDeleteExpense(expense.id);
      gooeyToast.success("Expense removed");
    } catch {
      setMessage("We couldn't delete this expense. Please try again.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid size-11 place-items-center rounded-control bg-primary/10 text-primary">
            <ReceiptText className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Monthly commitments
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
              Expenses
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Keep bills current so safe-to-spend protects money that is already spoken for.
            </p>
          </div>
        </div>
        <Button type="button" className="sm:w-auto" onClick={openCreateForm}>
          <Plus className="size-4" aria-hidden="true" />
          New Expense
        </Button>
      </div>

      {message ? (
        <p
          role={message.startsWith("We couldn't") ? "alert" : "status"}
          className="rounded-control border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground"
        >
          {message}
        </p>
      ) : null}

      {isFormOpen ? (
        <Card aria-labelledby="expense-form-heading">
          <CardContent>
            <form className="grid gap-4" onSubmit={submitExpense} noValidate>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 id="expense-form-heading" className="text-lg font-semibold text-foreground">
                    {editingId ? "Edit expense" : "New expense"}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Due dates keep the 30-day bill window honest.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Cancel expense form"
                  onClick={closeForm}
                >
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </div>

              {formErrorMessages.length > 0 ? (
                <div
                  role="alert"
                  className="rounded-control border border-risk/20 bg-risk/10 px-3 py-2 text-sm text-risk"
                >
                  <p className="font-semibold">Check the expense fields.</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {formErrorMessages.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="grid gap-2 xl:col-span-2">
                  <Label htmlFor="expense-label">Expense name</Label>
                  <Input
                    id="expense-label"
                    value={formValues.label}
                    onChange={(event) => updateField("label", event.target.value)}
                    aria-invalid={formErrors.label ? "true" : undefined}
                  />
                  <FieldError>{formErrors.label}</FieldError>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expense-amount">Amount</Label>
                  <Input
                    id="expense-amount"
                    inputMode="decimal"
                    type="number"
                    min="0"
                    value={formValues.amount}
                    onChange={(event) => updateField("amount", event.target.value)}
                    aria-invalid={formErrors.amount ? "true" : undefined}
                  />
                  <FieldError>{formErrors.amount}</FieldError>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expense-due-day">Due day</Label>
                  <Input
                    id="expense-due-day"
                    inputMode="numeric"
                    type="number"
                    min="1"
                    max="31"
                    value={formValues.dueDay}
                    onChange={(event) => updateField("dueDay", event.target.value)}
                    aria-invalid={formErrors.dueDay ? "true" : undefined}
                  />
                  <FieldError>{formErrors.dueDay}</FieldError>
                </div>
                <div className="grid gap-2 md:max-w-xs">
                  <Label htmlFor="recurring">Recurring</Label>
                  <Select
                    value={formValues.isRecurring}
                    onValueChange={(value) =>
                      updateField("isRecurring", value as "true" | "false")
                    }
                  >
                    <SelectTrigger id="recurring">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Recurring</SelectItem>
                      <SelectItem value="false">One-time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="secondary" onClick={closeForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pendingAction === "save"} isLoading={pendingAction === "save"}>
                  {editingId ? "Save Expense" : "Create Expense"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="expense-summary">
        <SummaryMetric label="Tracked expenses" value={String(expenses.length)} helper="Active rows" />
        <SummaryMetric
          label="Monthly total"
          value={formatCurrency(totalMonthly, currency)}
          helper="Current expense load"
        />
        <SummaryMetric
          label="Recurring"
          value={String(recurringCount)}
          helper="Bills that repeat"
        />
        <SummaryMetric
          label="Next due"
          value={getNextDueDay(expenses)}
          helper="Earliest due day"
        />
      </div>

      {expenses.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {expenses.map((expense) => (
            <article
              key={expense.id}
              aria-label={`${expense.label} expense`}
              className="glass grid gap-4 rounded-card p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">
                      {expense.label}
                    </h3>
                    <Badge variant={expense.isRecurring ? "safe" : "neutral"}>
                      {expense.isRecurring ? "Recurring" : "One-time"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formatCurrency(expense.amount, currency)} monthly estimate
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${expense.label}`}
                    onClick={() => openEditForm(expense)}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${expense.label}`}
                        disabled={pendingAction === `delete-${expense.id}`}
                        isLoading={pendingAction === `delete-${expense.id}`}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent size="sm">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove expense?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove {expense.label} from your tracked expenses.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={() => void deleteExpense(expense)}
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="size-4" aria-hidden="true" />
                Due every month on day {expense.dueDay}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent>
            <p className="rounded-control border border-dashed border-border bg-muted/40 p-5 text-sm leading-6 text-muted-foreground">
              Add rent, utilities, subscriptions, and fixed bills so the checker does not treat
              committed cash as spendable.
            </p>
          </CardContent>
        </Card>
      )}
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
      <CardContent className="grid min-h-28 content-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{label}</h3>
        <div>
          <p className="truncate text-2xl font-semibold text-foreground">{value}</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{helper}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function getNextDueDay(expenses: Expense[]) {
  if (expenses.length === 0) {
    return "None";
  }

  return `Day ${Math.min(...expenses.map((expense) => expense.dueDay))}`;
}

function parseExpenseForm(values: ExpenseFormValues):
  | { ok: true; expense: ExpenseDraft }
  | { ok: false; errors: ExpenseFormErrors } {
  const errors: ExpenseFormErrors = {};
  const label = values.label.trim();
  const amount = Number(values.amount);
  const dueDay = Number(values.dueDay);

  if (!label) {
    errors.label = "Name this expense.";
  }

  if (values.amount.trim() === "" || !Number.isFinite(amount) || amount < 0) {
    errors.amount = "Enter a positive amount.";
  }

  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
    errors.dueDay = "Use a due day from 1 to 31.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    expense: {
      label,
      amount,
      dueDay,
      isRecurring: values.isRecurring === "true",
    },
  };
}
