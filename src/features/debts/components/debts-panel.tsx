"use client";

import { CalendarDays, CreditCard, Pencil, Plus, Trash2 } from "lucide-react";
import { gooeyToast } from "goey-toast";
import { useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { FieldError, Input, Label } from "@/components/ui/form-fields";
import { MutationDrawer } from "@/components/ui/mutation-drawer";
import { RemoveConfirmation } from "@/components/ui/remove-confirmation";
import {
  formatNextRecurringDueDate,
  formatShortDate,
  getMonthlyRecurringAmount,
  getNextRecurringDueDate,
} from "@/lib/calculations/next-due-date";
import { formatCurrency } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CurrencyCode, Debt, RecurringCadence } from "@/types/finance";

type DebtDraft = Omit<Debt, "id">;

type DebtFormValues = {
  label: string;
  outstandingBalance: string;
  minimumPayment: string;
  dueDay: string;
  secondDueDay: string;
  interestRate: string;
  paymentCadence: RecurringCadence;
  nextDueDate: string;
};

type DebtFormErrors = Partial<Record<keyof DebtFormValues, string>>;

const emptyDebtForm: DebtFormValues = {
  label: "",
  outstandingBalance: "",
  minimumPayment: "",
  dueDay: "1",
  secondDueDay: "15",
  interestRate: "",
  paymentCadence: "monthly",
  nextDueDate: "",
};

export function DebtsPanel({
  debts,
  currency,
  onCreateDebt,
  onUpdateDebt,
  onDeleteDebt,
  referenceDate = new Date(),
}: {
  debts: Debt[];
  currency: CurrencyCode;
  onCreateDebt: (debt: DebtDraft) => Promise<Debt | undefined>;
  onUpdateDebt: (id: string, debt: DebtDraft) => Promise<void>;
  onDeleteDebt: (id: string) => Promise<void>;
  referenceDate?: Date;
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<DebtFormValues>(emptyDebtForm);
  const [formErrors, setFormErrors] = useState<DebtFormErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const totalBalance = debts.reduce((total, debt) => total + debt.outstandingBalance, 0);
  const totalMinimum = debts.reduce(
    (total, debt) =>
      total + getMonthlyRecurringAmount(debt.minimumPayment, debt.paymentCadence),
    0
  );
  const formErrorMessages = Object.values(formErrors).filter(Boolean);

  function updateField<K extends keyof DebtFormValues>(field: K, value: DebtFormValues[K]) {
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
    setFormValues(emptyDebtForm);
    setFormErrors({});
    setMessage(null);
    setIsFormOpen(true);
  }

  function openEditForm(debt: Debt) {
    setEditingId(debt.id);
    setFormValues({
      label: debt.label,
      outstandingBalance: String(debt.outstandingBalance),
      minimumPayment: String(debt.minimumPayment),
      dueDay: String(debt.dueDay),
      secondDueDay: debt.secondDueDay === undefined ? "15" : String(debt.secondDueDay),
      interestRate: debt.interestRate === undefined ? "" : String(debt.interestRate),
      paymentCadence: debt.paymentCadence ?? "monthly",
      nextDueDate: debt.nextDueDate ?? "",
    });
    setFormErrors({});
    setMessage(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingId(null);
    setFormValues(emptyDebtForm);
    setFormErrors({});
  }

  async function submitDebt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const parsed = parseDebtForm(formValues);

    if (!parsed.ok) {
      setFormErrors(parsed.errors);
      return;
    }

    setPendingAction("save");

    try {
      if (editingId) {
        await onUpdateDebt(editingId, parsed.debt);
        setMessage("Debt updated.");
      } else {
        await onCreateDebt(parsed.debt);
        setMessage("Debt created.");
      }

      closeForm();
    } catch {
      setMessage("We couldn't save this debt. Please try again.");
    } finally {
      setPendingAction(null);
    }
  }

  async function deleteDebt(debt: Debt) {
    setMessage(null);
    setPendingAction(`delete-${debt.id}`);

    try {
      await onDeleteDebt(debt.id);
      gooeyToast.success("Debt removed");
    } catch {
      setMessage("We couldn't delete this debt. Please try again.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid size-11 place-items-center rounded-control bg-caution/10 text-caution">
            <CreditCard className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Payment pressure
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
              Debts
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Track balances, minimum payments, and due dates that reduce safe-to-spend.
            </p>
          </div>
        </div>
        <Button type="button" className="sm:w-auto" onClick={openCreateForm}>
          <Plus className="size-4" aria-hidden="true" />
          New Debt
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
        <MutationDrawer.Root
          open={isFormOpen}
          onOpenChange={(open) => !open && closeForm()}
          closeLabel="Close debt form"
        >
          <MutationDrawer.Form onSubmit={submitDebt}>
            <MutationDrawer.Header>
              <div>
                <MutationDrawer.Title>
                  {editingId ? "Edit debt" : "New debt"}
                </MutationDrawer.Title>
                <MutationDrawer.Description>
                  Minimum payments and due days feed the 30-day debt window.
                </MutationDrawer.Description>
              </div>
            </MutationDrawer.Header>

            <MutationDrawer.Body>
              {formErrorMessages.length > 0 ? (
                <div
                  role="alert"
                  className="rounded-control border border-risk/20 bg-risk/10 px-3 py-2 text-sm text-risk"
                >
                  <p className="font-semibold">Check the debt fields.</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {formErrorMessages.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="grid gap-2">
                <Label htmlFor="debt-label">Debt name</Label>
                <Input
                  id="debt-label"
                  value={formValues.label}
                  onChange={(event) => updateField("label", event.target.value)}
                  aria-invalid={formErrors.label ? "true" : undefined}
                />
                <FieldError>{formErrors.label}</FieldError>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="debt-balance">Balance</Label>
                <Input
                  id="debt-balance"
                  inputMode="decimal"
                  type="number"
                  min="0"
                  value={formValues.outstandingBalance}
                  onChange={(event) => updateField("outstandingBalance", event.target.value)}
                  aria-invalid={formErrors.outstandingBalance ? "true" : undefined}
                />
                <FieldError>{formErrors.outstandingBalance}</FieldError>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="debt-minimum">Minimum payment</Label>
                <Input
                  id="debt-minimum"
                  inputMode="decimal"
                  type="number"
                  min="0"
                  value={formValues.minimumPayment}
                  onChange={(event) => updateField("minimumPayment", event.target.value)}
                  aria-invalid={formErrors.minimumPayment ? "true" : undefined}
                />
                <FieldError>{formErrors.minimumPayment}</FieldError>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="debt-schedule">Payment schedule</Label>
                <Select
                  value={formValues.paymentCadence}
                  onValueChange={(value) =>
                    updateField("paymentCadence", value as RecurringCadence)
                  }
                >
                  <SelectTrigger id="debt-schedule">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="semi_monthly">Twice a month</SelectItem>
                    <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formValues.paymentCadence === "biweekly" ? (
                <div className="grid gap-2">
                  <Label htmlFor="debt-next-due-date">Next due date</Label>
                  <DatePicker
                    id="debt-next-due-date"
                    value={formValues.nextDueDate}
                    onChange={(value) => updateField("nextDueDate", value)}
                    ariaInvalid={formErrors.nextDueDate ? true : undefined}
                  />
                  <FieldError>{formErrors.nextDueDate}</FieldError>
                </div>
              ) : formValues.paymentCadence === "semi_monthly" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="debt-due-day">First due day</Label>
                    <Input
                      id="debt-due-day"
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
                  <div className="grid gap-2">
                    <Label htmlFor="debt-second-due-day">Second due day</Label>
                    <Input
                      id="debt-second-due-day"
                      inputMode="numeric"
                      type="number"
                      min="1"
                      max="31"
                      value={formValues.secondDueDay}
                      onChange={(event) => updateField("secondDueDay", event.target.value)}
                      aria-invalid={formErrors.secondDueDay ? "true" : undefined}
                    />
                    <FieldError>{formErrors.secondDueDay}</FieldError>
                  </div>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="debt-due-day">Due day</Label>
                  <Input
                    id="debt-due-day"
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
              )}
              <div className="grid gap-2">
                <Label htmlFor="debt-interest">Interest rate</Label>
                <Input
                  id="debt-interest"
                  inputMode="decimal"
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={formValues.interestRate}
                  onChange={(event) => updateField("interestRate", event.target.value)}
                  aria-invalid={formErrors.interestRate ? "true" : undefined}
                />
                <FieldError>{formErrors.interestRate}</FieldError>
              </div>
            </MutationDrawer.Body>

            <MutationDrawer.Footer>
              <Button type="submit" disabled={pendingAction === "save"} isLoading={pendingAction === "save"}>
                {editingId ? "Save Debt" : "Create Debt"}
              </Button>
              <MutationDrawer.Cancel>Cancel</MutationDrawer.Cancel>
            </MutationDrawer.Footer>
          </MutationDrawer.Form>
        </MutationDrawer.Root>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="debt-summary">
        <SummaryMetric label="Tracked debts" value={String(debts.length)} helper="Active rows" />
        <SummaryMetric
          label="Total balance"
          value={formatCurrency(totalBalance, currency)}
          helper="Outstanding principal"
        />
        <SummaryMetric
          label="Minimums"
          value={formatCurrency(totalMinimum, currency)}
          helper="Monthly floor"
        />
        <SummaryMetric
          label="Next due"
          value={getNextDueDate(debts, referenceDate)}
          helper="Earliest due date"
        />
      </div>

      {debts.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {debts.map((debt) => (
            <article
              key={debt.id}
              aria-label={`${debt.label} debt`}
              className="glass grid gap-4 rounded-card p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">
                      {debt.label}
                    </h3>
                    {debt.interestRate !== undefined ? (
                      <Badge variant="caution">{Math.round(debt.interestRate * 100)}% APR</Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formatCurrency(debt.outstandingBalance, currency)} balance
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${debt.label}`}
                    onClick={() => openEditForm(debt)}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </Button>
                  <RemoveConfirmation
                    title="Remove debt?"
                    description={<>This will permanently remove {debt.label} from your tracked debts.</>}
                    onConfirm={() => deleteDebt(debt)}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${debt.label}`}
                      disabled={pendingAction === `delete-${debt.id}`}
                      isLoading={pendingAction === `delete-${debt.id}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </RemoveConfirmation>
                </div>
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <DebtFact label="Minimum payment">
                  {formatCurrency(debt.minimumPayment, currency)} minimum
                </DebtFact>
                <DebtFact label="Next due">
                  <span className="flex items-center gap-2">
                    <CalendarDays className="size-4" aria-hidden="true" />
                    {formatDebtSchedule(debt, referenceDate)}
                  </span>
                </DebtFact>
              </dl>
            </article>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent>
            <p className="rounded-control border border-dashed border-border bg-muted/40 p-5 text-sm leading-6 text-muted-foreground">
              Add credit cards, loans, BNPL plans, and minimum payments so debt pressure is visible.
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

function DebtFact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-control border border-border bg-muted/30 p-3">
      <dt className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium text-foreground">{children}</dd>
    </div>
  );
}

function getNextDueDate(debts: Debt[], referenceDate: Date) {
  return formatNextRecurringDueDate(debts, referenceDate);
}

function parseDebtForm(values: DebtFormValues):
  | { ok: true; debt: DebtDraft }
  | { ok: false; errors: DebtFormErrors } {
  const errors: DebtFormErrors = {};
  const label = values.label.trim();
  const outstandingBalance = Number(values.outstandingBalance);
  const minimumPayment = Number(values.minimumPayment);
  const dueDay =
    values.paymentCadence === "biweekly"
      ? getDayFromIsoDate(values.nextDueDate)
      : Number(values.dueDay);
  const secondDueDay = Number(values.secondDueDay);
  const interestRate =
    values.interestRate.trim() === "" ? undefined : Number(values.interestRate);

  if (!label) {
    errors.label = "Name this debt.";
  }

  if (
    values.outstandingBalance.trim() === "" ||
    !Number.isFinite(outstandingBalance) ||
    outstandingBalance < 0
  ) {
    errors.outstandingBalance = "Enter a positive balance.";
  }

  if (values.minimumPayment.trim() === "" || !Number.isFinite(minimumPayment) || minimumPayment < 0) {
    errors.minimumPayment = "Enter a positive minimum payment.";
  }

  if (values.paymentCadence !== "biweekly" && (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31)) {
    errors.dueDay = "Use a due day from 1 to 31.";
  }

  if (values.paymentCadence === "semi_monthly") {
    if (!Number.isInteger(secondDueDay) || secondDueDay < 1 || secondDueDay > 31) {
      errors.secondDueDay = "Use a second due day from 1 to 31.";
    } else if (secondDueDay === dueDay) {
      errors.secondDueDay = "Use two different due days.";
    }
  }

  if (values.paymentCadence === "biweekly" && !isIsoDate(values.nextDueDate)) {
    errors.nextDueDate = "Choose the next due date.";
  }

  if (interestRate !== undefined && (!Number.isFinite(interestRate) || interestRate < 0 || interestRate > 1)) {
    errors.interestRate = "Use a decimal rate from 0 to 1.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    debt: {
      label,
      outstandingBalance,
      minimumPayment,
      dueDay,
      interestRate,
      paymentCadence: values.paymentCadence,
      nextDueDate: values.paymentCadence === "biweekly" ? values.nextDueDate : undefined,
      secondDueDay: values.paymentCadence === "semi_monthly" ? secondDueDay : undefined,
    },
  };
}

function formatDebtSchedule(debt: Debt, referenceDate: Date) {
  const next = formatShortDate(getNextRecurringDueDate(debt, referenceDate));

  if (debt.paymentCadence === "biweekly") {
    return `Every 2 weeks · ${next}`;
  }

  if (debt.paymentCadence === "semi_monthly") {
    return `Twice a month · ${next}`;
  }

  return `Monthly · ${next}`;
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getDayFromIsoDate(value: string) {
  if (!isIsoDate(value)) {
    return 1;
  }

  return Number(value.slice(8, 10));
}
