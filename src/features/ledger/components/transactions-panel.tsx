"use client";

import { Pencil, Trash2 } from "lucide-react";
import { gooeyToast } from "goey-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import {
  deleteLedgerTransactionAction,
  type LedgerTransaction,
  type LedgerTransactionPage,
  updateLedgerTransactionAction,
} from "@/features/ledger/api/manage-transactions";
import { LEDGER_CATEGORIES, type LedgerCategory } from "@/lib/schemas/ledger";
import { useFinancialStateContext } from "@/providers/financial-state-provider";
import { Badge } from "@/components/ui/badge";
import { buttonVariants, Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/form-fields";
import { MutationDrawer } from "@/components/ui/mutation-drawer";
import { RemoveConfirmation } from "@/components/ui/remove-confirmation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatCurrency } from "@/lib/utils";
import type { CurrencyCode } from "@/types/finance";

type TransactionFormValues = {
  occurredAt: string;
  direction: "income" | "expense";
  amount: string;
  counterparty: string;
  category: LedgerCategory;
};

type TransactionFormErrors = Partial<Record<keyof TransactionFormValues, string>>;

export function TransactionsPanel({
  transactions,
  pagination,
  loadError,
}: LedgerTransactionPage & { loadError?: string }) {
  const router = useRouter();
  const { snapshot, refresh } = useFinancialStateContext();
  const currency = snapshot.profile.currency;
  const [activeTransaction, setActiveTransaction] = useState<LedgerTransaction | null>(null);
  const [formValues, setFormValues] = useState<TransactionFormValues>(() =>
    emptyTransactionForm()
  );
  const [formErrors, setFormErrors] = useState<TransactionFormErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openEdit(transaction: LedgerTransaction) {
    setActiveTransaction(transaction);
    setFormValues(toTransactionForm(transaction));
    setFormErrors({});
    setMessage(null);
  }

  function closeEdit() {
    setActiveTransaction(null);
    setFormValues(emptyTransactionForm());
    setFormErrors({});
    setMessage(null);
  }

  function updateField<K extends keyof TransactionFormValues>(
    field: K,
    value: TransactionFormValues[K]
  ) {
    setFormValues((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => {
      const rest = { ...current };
      delete rest[field];
      return rest;
    });
    setMessage(null);
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeTransaction) return;

    const parsed = parseTransactionForm(formValues);
    if (!parsed.ok) {
      setFormErrors(parsed.errors);
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const result = await updateLedgerTransactionAction(activeTransaction.id, parsed.transaction);

      if (!result.ok) {
        setMessage(result.error);
        setFormErrors(toFormErrors(result.fieldErrors));
        return;
      }

      gooeyToast.success("Transaction updated");
      closeEdit();
      await refresh();
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteTransaction(transaction: LedgerTransaction) {
    setDeletingId(transaction.id);
    setMessage(null);

    try {
      const result = await deleteLedgerTransactionAction(transaction.id);

      if (!result.ok) {
        setMessage(result.error);
        return;
      }

      gooeyToast.success("Transaction removed");
      await refresh();

      if (transactions.length === 1 && pagination.page > 1) {
        router.replace(pageHref(pagination.page - 1), { scroll: false });
      } else {
        router.refresh();
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="grid gap-4" aria-labelledby="transactions-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-primary">
            Confirmed ledger
          </p>
          <h2 id="transactions-heading" className="mt-1 text-2xl font-semibold text-foreground">
            Imported transactions
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {pagination.total === 0
            ? "No saved transactions"
            : `Showing ${pageStart(pagination)}-${pageEnd(pagination)} of ${pagination.total}`}
        </p>
      </div>

      {loadError || message ? (
        <p role="alert" className="rounded-control border border-risk/20 bg-risk/10 px-3 py-2 text-sm text-risk">
          {loadError ?? message}
        </p>
      ) : null}

      <Card>
        <CardContent className="p-0">
          {transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[58rem] text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Date", "Direction", "Amount", "Category", "Counterparty", "Source", "Confidence", "Actions"].map(
                      (heading) => (
                        <th
                          key={heading}
                          scope="col"
                          className="px-4 pb-2 pt-3 text-left text-[0.625rem] font-semibold uppercase tracking-normal text-muted-foreground"
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 text-foreground">
                        {formatDisplayDate(transaction.occurredAt)}
                      </td>
                      <td className="px-4 py-3">
                        <DirectionBadge direction={transaction.direction} />
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        <span className={amountClassName(transaction.direction)}>
                          {formatSignedAmount(transaction, currency)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatCategory(transaction.category)}
                      </td>
                      <td className="max-w-[12rem] truncate px-4 py-3 text-foreground">
                        {transaction.counterparty ?? transaction.label}
                      </td>
                      <td
                        className="max-w-[10rem] truncate px-4 py-3 text-xs text-muted-foreground"
                        title={transaction.sourceRef ?? undefined}
                      >
                        {transaction.sourceRef ?? transaction.source ?? "Manual"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {transaction.confidence === null
                          ? "-"
                          : `${Math.round(transaction.confidence * 100)}%`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${transaction.label}`}
                            onClick={() => openEdit(transaction)}
                          >
                            <Pencil className="size-4" aria-hidden="true" />
                          </Button>
                          <RemoveConfirmation
                            title="Remove transaction?"
                            description={
                              <>This removes {transaction.label} from your confirmed ledger.</>
                            }
                            onConfirm={() => deleteTransaction(transaction)}
                          >
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Remove ${transaction.label}`}
                              isLoading={deletingId === transaction.id}
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                            </Button>
                          </RemoveConfirmation>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-5 text-sm leading-6 text-muted-foreground">
              Saved imports will appear here after OCR review.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <PaginationLink
          page={pagination.page - 1}
          disabled={pagination.page <= 1}
        >
          Previous
        </PaginationLink>
        <p className="text-sm text-muted-foreground">
          Page {pagination.page} of {pagination.pageCount}
        </p>
        <PaginationLink
          page={pagination.page + 1}
          disabled={pagination.page >= pagination.pageCount}
        >
          Next
        </PaginationLink>
      </div>

      <TransactionEditDrawer
        transaction={activeTransaction}
        values={formValues}
        errors={formErrors}
        isSaving={isSaving}
        onChange={updateField}
        onSubmit={submitEdit}
        onClose={closeEdit}
      />
    </section>
  );
}

function TransactionEditDrawer({
  transaction,
  values,
  errors,
  isSaving,
  onChange,
  onSubmit,
  onClose,
}: {
  transaction: LedgerTransaction | null;
  values: TransactionFormValues;
  errors: TransactionFormErrors;
  isSaving: boolean;
  onChange: <K extends keyof TransactionFormValues>(
    field: K,
    value: TransactionFormValues[K]
  ) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  return (
    <MutationDrawer.Root
      open={transaction !== null}
      onOpenChange={(open) => !open && onClose()}
      closeLabel="Close transaction editor"
    >
      {transaction ? (
        <MutationDrawer.Form onSubmit={onSubmit}>
          <MutationDrawer.Header>
            <div>
              <MutationDrawer.Title>Edit transaction</MutationDrawer.Title>
              <MutationDrawer.Description>
                {transaction.sourceRef ?? transaction.label}
              </MutationDrawer.Description>
            </div>
          </MutationDrawer.Header>

          <MutationDrawer.Body>
              <div className="grid gap-2">
                <Label htmlFor="transaction-date">Date</Label>
                <Input
                  id="transaction-date"
                  type="date"
                  value={values.occurredAt}
                  onChange={(event) => onChange("occurredAt", event.target.value)}
                  aria-invalid={errors.occurredAt ? "true" : undefined}
                />
                <FieldError>{errors.occurredAt}</FieldError>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="transaction-direction">Direction</Label>
                <Select
                  value={values.direction}
                  onValueChange={(value) =>
                    onChange("direction", value as TransactionFormValues["direction"])
                  }
                >
                  <SelectTrigger id="transaction-direction" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="transaction-amount">Amount</Label>
                <Input
                  id="transaction-amount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={values.amount}
                  onChange={(event) => onChange("amount", event.target.value)}
                  aria-invalid={errors.amount ? "true" : undefined}
                />
                <FieldError>{errors.amount}</FieldError>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="transaction-counterparty">Counterparty</Label>
                <Input
                  id="transaction-counterparty"
                  value={values.counterparty}
                  onChange={(event) => onChange("counterparty", event.target.value)}
                  aria-invalid={errors.counterparty ? "true" : undefined}
                />
                <FieldError>{errors.counterparty}</FieldError>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="transaction-category">Category</Label>
                <Select
                  value={values.category}
                  onValueChange={(value) => onChange("category", value as LedgerCategory)}
                >
                  <SelectTrigger id="transaction-category" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEDGER_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {formatCategory(category)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
          </MutationDrawer.Body>

          <MutationDrawer.Footer>
            <Button type="submit" isLoading={isSaving}>
              Save Transaction
            </Button>
            <MutationDrawer.Cancel>Cancel</MutationDrawer.Cancel>
          </MutationDrawer.Footer>
        </MutationDrawer.Form>
      ) : null}
    </MutationDrawer.Root>
  );
}

function DirectionBadge({ direction }: { direction: LedgerTransaction["direction"] }) {
  if (direction === "income") {
    return <Badge variant="safe">Income</Badge>;
  }

  if (direction === "expense") {
    return <Badge variant="neutral">Expense</Badge>;
  }

  return <Badge variant="outline">Unknown</Badge>;
}

function PaginationLink({
  page,
  disabled,
  children,
}: {
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={cn(buttonVariants({ variant: "secondary" }), "opacity-50")}
      >
        {children}
      </span>
    );
  }

  return (
    <Link href={pageHref(page)} className={buttonVariants({ variant: "secondary" })}>
      {children}
    </Link>
  );
}

function emptyTransactionForm(): TransactionFormValues {
  return {
    occurredAt: "",
    direction: "expense",
    amount: "",
    counterparty: "",
    category: "uncategorized",
  };
}

function toTransactionForm(transaction: LedgerTransaction): TransactionFormValues {
  return {
    occurredAt: transaction.occurredAt ?? "",
    direction: transaction.direction ?? "expense",
    amount: String(transaction.amount),
    counterparty: transaction.counterparty ?? "",
    category: transaction.category,
  };
}

function parseTransactionForm(values: TransactionFormValues):
  | {
      ok: true;
      transaction: {
        occurredAt: string;
        direction: "income" | "expense";
        amount: number;
        counterparty: string | null;
        category: LedgerCategory;
      };
    }
  | { ok: false; errors: TransactionFormErrors } {
  const errors: TransactionFormErrors = {};
  const amount = Number(values.amount);

  if (!values.occurredAt || Number.isNaN(Date.parse(values.occurredAt))) {
    errors.occurredAt = "Add a valid transaction date.";
  }

  if (values.amount.trim() === "" || !Number.isFinite(amount) || amount <= 0) {
    errors.amount = "Enter an amount above zero.";
  }

  if (values.counterparty.length > 160) {
    errors.counterparty = "Keep the counterparty under 160 characters.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    transaction: {
      occurredAt: values.occurredAt,
      direction: values.direction,
      amount,
      counterparty: values.counterparty.trim() || null,
      category: values.category,
    },
  };
}

function toFormErrors(fieldErrors: Record<string, string[]> | undefined): TransactionFormErrors {
  return {
    occurredAt: fieldErrors?.occurredAt?.[0],
    direction: fieldErrors?.direction?.[0],
    amount: fieldErrors?.amount?.[0],
    counterparty: fieldErrors?.counterparty?.[0],
    category: fieldErrors?.category?.[0],
  };
}

function pageHref(page: number) {
  return page <= 1 ? "/import" : `/import?page=${page}`;
}

function pageStart(pagination: LedgerTransactionPage["pagination"]) {
  return (pagination.page - 1) * pagination.pageSize + 1;
}

function pageEnd(pagination: LedgerTransactionPage["pagination"]) {
  return Math.min(pagination.page * pagination.pageSize, pagination.total);
}

function formatSignedAmount(transaction: LedgerTransaction, currency: CurrencyCode) {
  const amount = formatCurrency(transaction.amount, currency);

  if (transaction.direction === "income") {
    return `+${amount}`;
  }

  if (transaction.direction === "expense") {
    return `-${amount}`;
  }

  return amount;
}

function amountClassName(direction: LedgerTransaction["direction"]) {
  if (direction === "income") return "text-safe";
  if (direction === "expense") return "text-risk";
  return "text-foreground";
}

function formatCategory(category: LedgerCategory) {
  return category.replace(/_/g, " ").replace(/^\w/, (char) => char.toUpperCase());
}

function formatDisplayDate(value: string | null) {
  if (!value) return "No date";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);

  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(date);
}
