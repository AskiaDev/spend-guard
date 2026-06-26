"use client";

import { useCallback } from "react";
import { Controller, useFieldArray, type Control } from "react-hook-form";
import { type OnboardingFormValues, emptyGoalRow } from "../lib/onboarding-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "../../vault/components/primitives/empty-state";
import { RepeatableRow } from "../../vault/components/primitives/repeatable-row";

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
      <div className="flex flex-col gap-[14px]">
        {/* Label */}
        <div>
          <label
            htmlFor={`conv-goal-${index}-label`}
            className="text-[0.68rem] tracking-[0.16em] font-bold text-primary block mb-1"
          >
            Goal name
          </label>
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
        <div className="grid grid-cols-2 gap-y-[10px] gap-x-3">
          <div>
            <label
              htmlFor={`conv-goal-${index}-target`}
              className="text-[0.68rem] tracking-[0.16em] font-bold text-primary block mb-1"
            >
              Target (PHP)
            </label>
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
            <label
              htmlFor={`conv-goal-${index}-saved`}
              className="text-[0.68rem] tracking-[0.16em] font-bold text-primary block mb-1"
            >
              Saved so far
            </label>
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

        <div className="grid grid-cols-2 gap-y-[10px] gap-x-3">
          <div>
            <label
              htmlFor={`conv-goal-${index}-monthly`}
              className="text-[0.68rem] tracking-[0.16em] font-bold text-primary block mb-1"
            >
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
            <label
              htmlFor={`conv-goal-${index}-date`}
              className="text-[0.68rem] tracking-[0.16em] font-bold text-primary block mb-1"
            >
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
    <div className="flex flex-col gap-5">
      {/* Example chips */}
      {examples.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Example goals">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              className="bg-transparent border border-border rounded-full text-muted-foreground cursor-pointer text-[0.78rem] font-semibold py-[5px] px-[14px] leading-[1.4]"
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
          title="What are you saving toward?"
          hint="A trip, a cushion, a big purchase - add a goal and we will help you track the path there."
          actionLabel="Add a goal"
          onAdd={handleAppend}
        />
      ) : (
        <div className="flex flex-col gap-[14px]">
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
