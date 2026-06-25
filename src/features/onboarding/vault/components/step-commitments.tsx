"use client";

import { useState } from "react";
import { useFieldArray, useWatch, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { type OnboardingFormValues, emptyDebtRow, emptyExpenseRow } from "../lib/onboarding-form";
import { EmptyState } from "./primitives/empty-state";
import { RepeatableRow } from "./primitives/repeatable-row";
import { VaultButton } from "./primitives/vault-button";
import { VaultInput } from "./primitives/vault-input";

// ---- Segmented control -------------------------------------------------------

const segmentBase: React.CSSProperties = {
  flex: 1,
  padding: "9px 0",
  border: "none",
  borderRadius: "var(--vault-radius-ctl)",
  fontSize: "0.82rem",
  fontWeight: 700,
  cursor: "pointer",
  letterSpacing: "0.04em",
  transition: "background 0.18s ease, color 0.18s ease",
};

function SegmentedControl({
  view,
  onChange,
}: {
  view: "expenses" | "debts";
  onChange: (v: "expenses" | "debts") => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Commitment type"
      style={{
        display: "flex",
        gap: 4,
        padding: 4,
        background: "var(--vault-surface)",
        border: "1px solid var(--vault-border)",
        borderRadius: "var(--vault-radius-ctl)",
      }}
    >
      <button
        role="tab"
        type="button"
        aria-selected={view === "expenses"}
        onClick={() => onChange("expenses")}
        style={{
          ...segmentBase,
          background: view === "expenses" ? "var(--vault-accent)" : "transparent",
          color: view === "expenses" ? "var(--vault-ink)" : "var(--vault-muted)",
        }}
      >
        Fixed expenses
      </button>
      <button
        role="tab"
        type="button"
        aria-selected={view === "debts"}
        onClick={() => onChange("debts")}
        style={{
          ...segmentBase,
          background: view === "debts" ? "var(--vault-accent)" : "transparent",
          color: view === "debts" ? "var(--vault-ink)" : "var(--vault-muted)",
        }}
      >
        Debts
      </button>
    </div>
  );
}

// ---- Inline row grid ---------------------------------------------------------

const rowGrid: React.CSSProperties = {
  display: "grid",
  gap: "10px 12px",
  width: "100%",
};

const inlineLabel: React.CSSProperties = {
  fontSize: "0.68rem",
  letterSpacing: "0.16em",
  fontWeight: 700,
  color: "var(--vault-accent)",
  display: "block",
  marginBottom: 4,
};

// ---- Checkbox toggle ---------------------------------------------------------

function RecurringToggle({
  id,
  checked,
  inputProps,
}: {
  id: string;
  checked: boolean;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4 }}>
      <div
        style={{
          position: "relative",
          width: 36,
          height: 20,
          flexShrink: 0,
        }}
      >
        <input
          type="checkbox"
          id={id}
          {...inputProps}
          style={{
            position: "absolute",
            opacity: 0,
            width: "100%",
            height: "100%",
            margin: 0,
            cursor: "pointer",
            zIndex: 1,
          }}
        />
        <span
          aria-hidden="true"
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            borderRadius: 10,
            background: checked
              ? "var(--vault-accent)"
              : "color-mix(in srgb, var(--vault-accent) 12%, transparent)",
            border: checked
              ? "none"
              : "1px solid var(--vault-border)",
            transition: "background 0.16s ease",
            position: "relative",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 3,
              left: checked ? 18 : 3,
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: checked ? "var(--vault-ink)" : "var(--vault-muted)",
              transition: "left 0.16s ease, background 0.16s ease",
            }}
          />
        </span>
      </div>
      <label
        htmlFor={id}
        style={{
          fontSize: "0.78rem",
          color: "var(--vault-muted)",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        Recurring
      </label>
    </div>
  );
}

// ---- Expense row (own component so useWatch can be called at top level) -----

function ExpenseRow({
  index,
  control,
  register,
  errors,
  onRemove,
}: {
  index: number;
  control: Control<OnboardingFormValues>;
  register: UseFormRegister<OnboardingFormValues>;
  errors: FieldErrors<OnboardingFormValues>;
  onRemove: () => void;
}) {
  const isRecurring = useWatch({ control, name: `expenses.${index}.isRecurring` });

  return (
    <RepeatableRow onRemove={onRemove}>
      <div
        style={{
          ...rowGrid,
          gridTemplateColumns: "1fr 90px 70px auto",
        }}
      >
        <div>
          <label htmlFor={`expenses.${index}.label`} style={inlineLabel}>Label</label>
          <VaultInput
            id={`expenses.${index}.label`}
            placeholder="e.g. Rent"
            aria-label="Expense label"
            {...register(`expenses.${index}.label`)}
          />
          {errors.expenses?.[index]?.label?.message && (
            <span style={{ color: "var(--vault-danger)", fontSize: "0.7rem" }}>
              {errors.expenses[index].label?.message}
            </span>
          )}
        </div>

        <div>
          <label htmlFor={`expenses.${index}.amount`} style={inlineLabel}>Amount</label>
          <VaultInput
            id={`expenses.${index}.amount`}
            inputMode="decimal"
            placeholder="0.00"
            aria-label="Expense amount"
            {...register(`expenses.${index}.amount`)}
          />
        </div>

        <div>
          <label htmlFor={`expenses.${index}.dueDay`} style={inlineLabel}>Due day</label>
          <VaultInput
            id={`expenses.${index}.dueDay`}
            inputMode="numeric"
            placeholder="1"
            aria-label="Due day of month"
            min={1}
            max={31}
            {...register(`expenses.${index}.dueDay`)}
          />
        </div>

        <RecurringToggle
          id={`expenses.${index}.isRecurring`}
          checked={!!isRecurring}
          inputProps={register(`expenses.${index}.isRecurring`)}
        />
      </div>
    </RepeatableRow>
  );
}

// ---- Expense list -----------------------------------------------------------

function ExpenseList({
  register,
  control,
  errors,
  fields,
  onAppend,
  onRemove,
}: {
  register: UseFormRegister<OnboardingFormValues>;
  control: Control<OnboardingFormValues>;
  errors: FieldErrors<OnboardingFormValues>;
  fields: { id: string }[];
  onAppend: () => void;
  onRemove: (i: number) => void;
}) {
  if (fields.length === 0) {
    return (
      <EmptyState
        title="No fixed expenses yet"
        hint="Rent, subscriptions, insurance - anything that hits your account on a schedule."
        actionLabel="Add your first expense"
        onAdd={onAppend}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {fields.map((field, index) => (
        <ExpenseRow
          key={field.id}
          index={index}
          control={control}
          register={register}
          errors={errors}
          onRemove={() => onRemove(index)}
        />
      ))}

      <VaultButton variant="ghost" onClick={onAppend}>
        + Add another expense
      </VaultButton>
    </div>
  );
}

// ---- Debt list --------------------------------------------------------------

function DebtList({
  register,
  errors,
  fields,
  onAppend,
  onRemove,
}: {
  register: UseFormRegister<OnboardingFormValues>;
  errors: FieldErrors<OnboardingFormValues>;
  fields: { id: string }[];
  onAppend: () => void;
  onRemove: (i: number) => void;
}) {
  if (fields.length === 0) {
    return (
      <EmptyState
        title="No debts to track"
        hint="Credit cards, loans, buy-now-pay-later - add them here to keep an eye on what you owe."
        actionLabel="Add your first debt"
        onAdd={onAppend}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {fields.map((field, index) => (
        <RepeatableRow key={field.id} onRemove={() => onRemove(index)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Row 1: label + balance + min payment */}
            <div
              style={{
                ...rowGrid,
                gridTemplateColumns: "1fr 100px 100px",
              }}
            >
              <div>
                <label htmlFor={`debts.${index}.label`} style={inlineLabel}>Label</label>
                <VaultInput
                  id={`debts.${index}.label`}
                  placeholder="e.g. Credit card"
                  aria-label="Debt label"
                  {...register(`debts.${index}.label`)}
                />
                {errors.debts?.[index]?.label?.message && (
                  <span style={{ color: "var(--vault-danger)", fontSize: "0.7rem" }}>
                    {errors.debts[index].label?.message}
                  </span>
                )}
              </div>

              <div>
                <label htmlFor={`debts.${index}.outstandingBalance`} style={inlineLabel}>Balance</label>
                <VaultInput
                  id={`debts.${index}.outstandingBalance`}
                  inputMode="decimal"
                  placeholder="0.00"
                  aria-label="Outstanding balance"
                  {...register(`debts.${index}.outstandingBalance`)}
                />
              </div>

              <div>
                <label htmlFor={`debts.${index}.minimumPayment`} style={inlineLabel}>Min payment</label>
                <VaultInput
                  id={`debts.${index}.minimumPayment`}
                  inputMode="decimal"
                  placeholder="0.00"
                  aria-label="Minimum payment"
                  {...register(`debts.${index}.minimumPayment`)}
                />
              </div>
            </div>

            {/* Row 2: due day + interest rate */}
            <div
              style={{
                ...rowGrid,
                gridTemplateColumns: "90px 110px 1fr",
              }}
            >
              <div>
                <label htmlFor={`debts.${index}.dueDay`} style={inlineLabel}>Due day</label>
                <VaultInput
                  id={`debts.${index}.dueDay`}
                  inputMode="numeric"
                  placeholder="1"
                  aria-label="Due day of month"
                  min={1}
                  max={31}
                  {...register(`debts.${index}.dueDay`)}
                />
              </div>

              <div>
                <label htmlFor={`debts.${index}.interestRate`} style={inlineLabel}>Interest rate %</label>
                <VaultInput
                  id={`debts.${index}.interestRate`}
                  inputMode="decimal"
                  placeholder="Optional"
                  aria-label="Interest rate (optional)"
                  {...register(`debts.${index}.interestRate`)}
                />
              </div>

              {/* spacer - keeps the 3-column grid balanced */}
              <div />
            </div>
          </div>
        </RepeatableRow>
      ))}

      <VaultButton variant="ghost" onClick={onAppend}>
        + Add another debt
      </VaultButton>
    </div>
  );
}

// ---- Main component ---------------------------------------------------------

export function StepCommitments({
  register,
  control,
  errors,
}: {
  register: UseFormRegister<OnboardingFormValues>;
  control: Control<OnboardingFormValues>;
  errors: FieldErrors<OnboardingFormValues>;
}) {
  const [view, setView] = useState<"expenses" | "debts">("expenses");

  const expenses = useFieldArray({ control, name: "expenses" });
  const debts = useFieldArray({ control, name: "debts" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SegmentedControl view={view} onChange={setView} />

      <div role="tabpanel" aria-label={view === "expenses" ? "Fixed expenses" : "Debts"}>
        {view === "expenses" ? (
          <ExpenseList
            register={register}
            control={control}
            errors={errors}
            fields={expenses.fields}
            onAppend={() => expenses.append(emptyExpenseRow())}
            onRemove={(i) => expenses.remove(i)}
          />
        ) : (
          <DebtList
            register={register}
            errors={errors}
            fields={debts.fields}
            onAppend={() => debts.append(emptyDebtRow())}
            onRemove={(i) => debts.remove(i)}
          />
        )}
      </div>

      <p
        style={{
          fontSize: "0.72rem",
          color: "var(--vault-muted)",
          textAlign: "center",
          margin: 0,
        }}
      >
        Both sections are optional - fill in what you know and move on.
      </p>
    </div>
  );
}
