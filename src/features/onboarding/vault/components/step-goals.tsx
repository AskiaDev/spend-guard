"use client";

import { Controller, useFieldArray, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { type OnboardingFormValues, emptyGoalRow } from "../lib/onboarding-form";
import { EmptyState } from "./primitives/empty-state";
import { RepeatableRow } from "./primitives/repeatable-row";
import { VaultButton } from "./primitives/vault-button";
import { VaultInput } from "./primitives/vault-input";
import { VaultSelect } from "./primitives/vault-select";

// ---- Shared styles -----------------------------------------------------------

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

const PRIORITY_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

// ---- Goal row ----------------------------------------------------------------

function GoalRow({
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
  return (
    <RepeatableRow onRemove={onRemove}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Row 1: label (full width) */}
        <div>
          <label htmlFor={`goals.${index}.label`} style={inlineLabel}>Goal name</label>
          <VaultInput
            id={`goals.${index}.label`}
            placeholder="e.g. Emergency fund, holiday, new laptop"
            aria-label="Goal name"
            {...register(`goals.${index}.label`)}
          />
          {errors.goals?.[index]?.label?.message && (
            <span style={{ color: "var(--vault-danger)", fontSize: "0.7rem" }}>
              {errors.goals[index].label?.message}
            </span>
          )}
        </div>

        {/* Row 2: target, saved, monthly */}
        <div
          style={{
            ...rowGrid,
            gridTemplateColumns: "1fr 1fr 1fr",
          }}
        >
          <div>
            <label htmlFor={`goals.${index}.targetAmount`} style={inlineLabel}>Target</label>
            <VaultInput
              id={`goals.${index}.targetAmount`}
              inputMode="decimal"
              placeholder="0.00"
              aria-label="Target amount"
              {...register(`goals.${index}.targetAmount`)}
            />
          </div>

          <div>
            <label htmlFor={`goals.${index}.savedAmount`} style={inlineLabel}>Saved so far</label>
            <VaultInput
              id={`goals.${index}.savedAmount`}
              inputMode="decimal"
              placeholder="0.00"
              aria-label="Amount already saved"
              {...register(`goals.${index}.savedAmount`)}
            />
          </div>

          <div>
            <label htmlFor={`goals.${index}.monthlyContribution`} style={inlineLabel}>Monthly</label>
            <VaultInput
              id={`goals.${index}.monthlyContribution`}
              inputMode="decimal"
              placeholder="0.00"
              aria-label="Monthly contribution"
              {...register(`goals.${index}.monthlyContribution`)}
            />
          </div>
        </div>

        {/* Row 3: target date + priority */}
        <div
          style={{
            ...rowGrid,
            gridTemplateColumns: "1fr 130px",
          }}
        >
          <div>
            <label htmlFor={`goals.${index}.targetDate`} style={inlineLabel}>Target date (optional)</label>
            <VaultInput
              type="date"
              id={`goals.${index}.targetDate`}
              aria-label="Target date (optional)"
              {...register(`goals.${index}.targetDate`)}
            />
          </div>

          <div>
            <label htmlFor={`goals.${index}.priority`} style={inlineLabel}>Priority</label>
            <Controller
              name={`goals.${index}.priority`}
              control={control}
              render={({ field }) => (
                <VaultSelect
                  id={`goals.${index}.priority`}
                  value={field.value}
                  onChange={field.onChange}
                  options={PRIORITY_OPTIONS}
                />
              )}
            />
          </div>
        </div>
      </div>
    </RepeatableRow>
  );
}

// ---- Main component ----------------------------------------------------------

export function StepGoals({
  register,
  control,
  errors,
}: {
  register: UseFormRegister<OnboardingFormValues>;
  control: Control<OnboardingFormValues>;
  errors: FieldErrors<OnboardingFormValues>;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: "goals" });

  if (fields.length === 0) {
    return (
      <EmptyState
        title="What are you saving toward?"
        hint="A trip, a cushion, a big purchase - add a goal and we'll help you track the path there."
        actionLabel="Add a goal"
        onAdd={() => append(emptyGoalRow())}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {fields.map((field, index) => (
        <GoalRow
          key={field.id}
          index={index}
          control={control}
          register={register}
          errors={errors}
          onRemove={() => remove(index)}
        />
      ))}

      <VaultButton variant="ghost" onClick={() => append(emptyGoalRow())}>
        + Add another goal
      </VaultButton>

      <p
        style={{
          fontSize: "0.72rem",
          color: "var(--vault-muted)",
          textAlign: "center",
          margin: 0,
        }}
      >
        Goals are optional - you can add or edit them any time.
      </p>
    </div>
  );
}
