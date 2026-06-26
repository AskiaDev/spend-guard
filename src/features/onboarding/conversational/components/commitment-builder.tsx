"use client";

import { useCallback } from "react";
import { Controller, useFieldArray, useWatch, type Control } from "react-hook-form";
import { type OnboardingFormValues, emptyExpenseRow } from "../lib/onboarding-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "../../vault/components/primitives/empty-state";
import { RepeatableRow } from "../../vault/components/primitives/repeatable-row";

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
    <div className="flex items-center gap-2 pt-1">
      <div className="relative w-9 h-5 shrink-0">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer absolute opacity-0 w-full h-full m-0 cursor-pointer z-[1]"
        />
        <span
          aria-hidden="true"
          className="block w-full h-full rounded-[10px] transition-colors duration-[160ms] relative peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background"
          style={{ // ponytail: background and border are state-driven (checked prop)
            background: checked
              ? "var(--primary)"
              : "color-mix(in srgb, var(--primary) 12%, transparent)",
            border: checked ? "none" : "1px solid var(--border)",
          }}
        >
          <span
            className="absolute top-[3px] w-3.5 h-3.5 rounded-full transition-[left,background] duration-[160ms]"
            style={{ // ponytail: left and background are state-driven (checked prop); ink (#0a0e17) has no shadcn token yet
              left: checked ? 18 : 3,
              background: checked ? "#0a0e17" : "var(--muted-foreground)",
            }}
          />
        </span>
      </div>
      <label
        htmlFor={id}
        className="text-[0.78rem] text-muted-foreground cursor-pointer select-none"
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
      <div className="flex flex-col gap-[14px]">
        {/* Label */}
        <div>
          <label
            htmlFor={`conv-exp-${index}-label`}
            className="text-[0.68rem] tracking-[0.16em] font-bold text-primary block mb-1"
          >
            Label
          </label>
          <Controller
            control={control}
            name={`expenses.${index}.label`}
            render={({ field }) => (
              <Input
                id={`conv-exp-${index}-label`}
                placeholder="e.g. Rent"
                aria-label="Expense label"
                {...field}
              />
            )}
          />
        </div>

        {/* Amount + Due day */}
        <div className="grid grid-cols-[1fr_90px] gap-y-[10px] gap-x-3">
          <div>
            <label
              htmlFor={`conv-exp-${index}-amount`}
              className="text-[0.68rem] tracking-[0.16em] font-bold text-primary block mb-1"
            >
              Amount (PHP)
            </label>
            <Controller
              control={control}
              name={`expenses.${index}.amount`}
              render={({ field }) => (
                <Input
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
            <label
              htmlFor={`conv-exp-${index}-dueDay`}
              className="text-[0.68rem] tracking-[0.16em] font-bold text-primary block mb-1"
            >
              Due day
            </label>
            <Controller
              control={control}
              name={`expenses.${index}.dueDay`}
              render={({ field }) => (
                <Input
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
    <div className="flex flex-col gap-5">
      {/* Example chips */}
      {examples.length > 0 && (
        <div
          className="flex flex-wrap gap-2"
          aria-label="Example commitments"
        >
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
          title="No fixed expenses yet"
          hint="Rent, subscriptions, insurance - anything that hits your account on a schedule."
          actionLabel="Add your first expense"
          onAdd={handleAppend}
        />
      ) : (
        <div className="flex flex-col gap-[14px]">
          {fields.map((field, index) => (
            <ExpenseRowCard
              key={field.id}
              index={index}
              control={control}
              onRemove={() => remove(index)}
            />
          ))}
          <Button variant="ghost" className="text-muted-foreground" onClick={handleAppend}>
            + Add another expense
          </Button>
        </div>
      )}
    </div>
  );
}
