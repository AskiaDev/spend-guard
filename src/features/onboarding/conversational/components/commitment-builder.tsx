"use client";

import { useCallback } from "react";
import { Controller, useFieldArray, useWatch, type Control } from "react-hook-form";
import { type OnboardingFormValues, emptyExpenseRow } from "../lib/onboarding-form";
import { EmptyState } from "../../vault/components/primitives/empty-state";
import { RepeatableRow } from "../../vault/components/primitives/repeatable-row";
import { VaultButton } from "../../vault/components/primitives/vault-button";
import { VaultInput } from "../../vault/components/primitives/vault-input";

// ---- Shared styles -----------------------------------------------------------

const inlineLabel: React.CSSProperties = {
  fontSize: "0.68rem",
  letterSpacing: "0.16em",
  fontWeight: 700,
  color: "var(--vault-accent)",
  display: "block",
  marginBottom: 4,
};

const chipStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--vault-border)",
  borderRadius: 999,
  color: "var(--vault-muted)",
  cursor: "pointer",
  fontSize: "0.78rem",
  fontWeight: 600,
  padding: "5px 14px",
  lineHeight: 1.4,
};

// ---- Recurring toggle --------------------------------------------------------

function RecurringToggle({
  id,
  checked,
  onChange,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4 }}>
      <div style={{ position: "relative", width: 36, height: 20, flexShrink: 0 }}>
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
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
            border: checked ? "none" : "1px solid var(--vault-border)",
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

// ---- Expense row (own component so useWatch runs at top level) ---------------

function ExpenseRowCard({
  index,
  control,
  onRemove,
}: {
  index: number;
  control: Control<OnboardingFormValues>;
  onRemove: () => void;
}) {
  const isRecurring = useWatch({ control, name: `expenses.${index}.isRecurring` });

  return (
    <RepeatableRow onRemove={onRemove}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Label */}
        <div>
          <label htmlFor={`conv-exp-${index}-label`} style={inlineLabel}>Label</label>
          <Controller
            control={control}
            name={`expenses.${index}.label`}
            render={({ field }) => (
              <VaultInput
                id={`conv-exp-${index}-label`}
                placeholder="e.g. Rent"
                aria-label="Expense label"
                {...field}
              />
            )}
          />
        </div>

        {/* Amount + Due day */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: "10px 12px" }}>
          <div>
            <label htmlFor={`conv-exp-${index}-amount`} style={inlineLabel}>Amount (PHP)</label>
            <Controller
              control={control}
              name={`expenses.${index}.amount`}
              render={({ field }) => (
                <VaultInput
                  id={`conv-exp-${index}-amount`}
                  inputMode="decimal"
                  placeholder="0.00"
                  aria-label="Expense amount"
                  {...field}
                />
              )}
            />
          </div>
          <div>
            <label htmlFor={`conv-exp-${index}-dueDay`} style={inlineLabel}>Due day</label>
            <Controller
              control={control}
              name={`expenses.${index}.dueDay`}
              render={({ field }) => (
                <VaultInput
                  id={`conv-exp-${index}-dueDay`}
                  inputMode="numeric"
                  placeholder="1"
                  aria-label="Due day of month"
                  min={1}
                  max={31}
                  {...field}
                />
              )}
            />
          </div>
        </div>

        {/* Recurring toggle */}
        <Controller
          control={control}
          name={`expenses.${index}.isRecurring`}
          render={({ field }) => (
            <RecurringToggle
              id={`conv-exp-${index}-recurring`}
              checked={!!isRecurring}
              onChange={field.onChange}
            />
          )}
        />
      </div>
    </RepeatableRow>
  );
}

// ---- CommitmentBuilder -------------------------------------------------------

export function CommitmentBuilder({
  control,
  examples = [],
}: {
  control: Control<OnboardingFormValues>;
  examples?: string[];
}) {
  const { fields, append, remove } = useFieldArray({ control, name: "expenses" });

  const handleAppend = useCallback(() => append(emptyExpenseRow()), [append]);

  const handleChip = useCallback(
    (label: string) => append({ ...emptyExpenseRow(), label }),
    [append],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Example chips */}
      {examples.length > 0 && (
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
          aria-label="Example commitments"
        >
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              style={chipStyle}
              onClick={() => handleChip(ex)}
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* Field list or empty state */}
      {fields.length === 0 ? (
        <EmptyState
          title="No fixed expenses yet"
          hint="Rent, subscriptions, insurance - anything that hits your account on a schedule."
          actionLabel="Add your first expense"
          onAdd={handleAppend}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {fields.map((field, index) => (
            <ExpenseRowCard
              key={field.id}
              index={index}
              control={control}
              onRemove={() => remove(index)}
            />
          ))}
          <VaultButton variant="ghost" onClick={handleAppend}>
            + Add another expense
          </VaultButton>
        </div>
      )}
    </div>
  );
}
