"use client";

import { useCallback } from "react";
import { Controller, useFieldArray, type Control } from "react-hook-form";
import { type OnboardingFormValues, emptyDebtRow } from "../lib/onboarding-form";
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

// ---- Debt row ----------------------------------------------------------------

function DebtRowCard({
  index,
  control,
  onRemove,
}: {
  index: number;
  control: Control<OnboardingFormValues>;
  onRemove: () => void;
}) {
  return (
    <RepeatableRow onRemove={onRemove}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Label */}
        <div>
          <label htmlFor={`conv-debt-${index}-label`} style={inlineLabel}>Label</label>
          <Controller
            control={control}
            name={`debts.${index}.label`}
            render={({ field }) => (
              <VaultInput
                id={`conv-debt-${index}-label`}
                placeholder="e.g. Credit card"
                aria-label="Debt label"
                {...field}
              />
            )}
          />
        </div>

        {/* Balance + Min payment */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 12px" }}>
          <div>
            <label htmlFor={`conv-debt-${index}-balance`} style={inlineLabel}>Balance (PHP)</label>
            <Controller
              control={control}
              name={`debts.${index}.outstandingBalance`}
              render={({ field }) => (
                <VaultInput
                  id={`conv-debt-${index}-balance`}
                  inputMode="decimal"
                  placeholder="0.00"
                  aria-label="Outstanding balance"
                  {...field}
                />
              )}
            />
          </div>
          <div>
            <label htmlFor={`conv-debt-${index}-minpay`} style={inlineLabel}>Min payment</label>
            <Controller
              control={control}
              name={`debts.${index}.minimumPayment`}
              render={({ field }) => (
                <VaultInput
                  id={`conv-debt-${index}-minpay`}
                  inputMode="decimal"
                  placeholder="0.00"
                  aria-label="Minimum payment"
                  {...field}
                />
              )}
            />
          </div>
        </div>

        {/* Due day */}
        <div style={{ maxWidth: 120 }}>
          <label htmlFor={`conv-debt-${index}-dueDay`} style={inlineLabel}>Due day</label>
          <Controller
            control={control}
            name={`debts.${index}.dueDay`}
            render={({ field }) => (
              <VaultInput
                id={`conv-debt-${index}-dueDay`}
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
    </RepeatableRow>
  );
}

// ---- DebtBuilder -------------------------------------------------------------

export function DebtBuilder({
  control,
  examples = [],
}: {
  control: Control<OnboardingFormValues>;
  examples?: string[];
}) {
  const { fields, append, remove } = useFieldArray({ control, name: "debts" });

  const handleAppend = useCallback(() => append(emptyDebtRow()), [append]);

  const handleChip = useCallback(
    (label: string) => append({ ...emptyDebtRow(), label }),
    [append],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Example chips */}
      {examples.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }} aria-label="Example debts">
          {examples.map((ex) => (
            <button key={ex} type="button" style={chipStyle} onClick={() => handleChip(ex)}>
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* Field list or empty state */}
      {fields.length === 0 ? (
        <EmptyState
          title="No debts to track"
          hint="Credit cards, loans, buy-now-pay-later - add them here to keep an eye on what you owe."
          actionLabel="Add your first debt"
          onAdd={handleAppend}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {fields.map((field, index) => (
            <DebtRowCard
              key={field.id}
              index={index}
              control={control}
              onRemove={() => remove(index)}
            />
          ))}
          <VaultButton variant="ghost" onClick={handleAppend}>
            + Add another debt
          </VaultButton>
        </div>
      )}
    </div>
  );
}
