"use client";

import { useCallback } from "react";
import { Controller, useFieldArray, type Control } from "react-hook-form";
import { type OnboardingFormValues, emptyGoalRow } from "../lib/onboarding-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "../../vault/components/primitives/empty-state";
import { RepeatableRow } from "../../vault/components/primitives/repeatable-row";

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

// ---- Goal row ----------------------------------------------------------------

function GoalRowCard({
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
          <label htmlFor={`conv-goal-${index}-label`} style={inlineLabel}>Goal name</label>
          <Controller
            control={control}
            name={`goals.${index}.label`}
            render={({ field }) => (
              <Input
                id={`conv-goal-${index}-label`}
                placeholder="e.g. Emergency fund, holiday, new laptop"
                aria-label="Goal name"
                {...field}
              />
            )}
          />
        </div>

        {/* Target + Saved */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 12px" }}>
          <div>
            <label htmlFor={`conv-goal-${index}-target`} style={inlineLabel}>Target (PHP)</label>
            <Controller
              control={control}
              name={`goals.${index}.targetAmount`}
              render={({ field }) => (
                <Input
                  id={`conv-goal-${index}-target`}
                  inputMode="decimal"
                  placeholder="0.00"
                  aria-label="Target amount"
                  {...field}
                />
              )}
            />
          </div>
          <div>
            <label htmlFor={`conv-goal-${index}-saved`} style={inlineLabel}>Saved so far</label>
            <Controller
              control={control}
              name={`goals.${index}.savedAmount`}
              render={({ field }) => (
                <Input
                  id={`conv-goal-${index}-saved`}
                  inputMode="decimal"
                  placeholder="0.00"
                  aria-label="Amount already saved"
                  {...field}
                />
              )}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 12px" }}>
          <div>
            <label htmlFor={`conv-goal-${index}-monthly`} style={inlineLabel}>
              Monthly contribution
            </label>
            <Controller
              control={control}
              name={`goals.${index}.monthlyContribution`}
              render={({ field }) => (
                <Input
                  id={`conv-goal-${index}-monthly`}
                  inputMode="decimal"
                  placeholder="0.00"
                  aria-label="Monthly contribution"
                  {...field}
                />
              )}
            />
          </div>

          <div>
            <label htmlFor={`conv-goal-${index}-date`} style={inlineLabel}>
              Target date (optional)
            </label>
            <Controller
              control={control}
              name={`goals.${index}.targetDate`}
              render={({ field }) => (
                <Input
                  type="date"
                  id={`conv-goal-${index}-date`}
                  aria-label="Target date (optional)"
                  {...field}
                />
              )}
            />
          </div>
        </div>
      </div>
    </RepeatableRow>
  );
}

// ---- GoalBuilder -------------------------------------------------------------

export function GoalBuilder({
  control,
  examples = [],
}: {
  control: Control<OnboardingFormValues>;
  examples?: string[];
}) {
  const { fields, append, remove } = useFieldArray({ control, name: "goals" });

  const handleAppend = useCallback(() => append(emptyGoalRow()), [append]);

  const handleChip = useCallback(
    (label: string) => append({ ...emptyGoalRow(), label }),
    [append],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Example chips */}
      {examples.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }} aria-label="Example goals">
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
          title="What are you saving toward?"
          hint="A trip, a cushion, a big purchase - add a goal and we will help you track the path there."
          actionLabel="Add a goal"
          onAdd={handleAppend}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {fields.map((field, index) => (
            <GoalRowCard
              key={field.id}
              index={index}
              control={control}
              onRemove={() => remove(index)}
            />
          ))}
          <Button variant="ghost" className="text-muted-foreground" onClick={handleAppend}>
            + Add another goal
          </Button>
        </div>
      )}
    </div>
  );
}
