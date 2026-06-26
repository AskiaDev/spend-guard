"use client";

import { useCallback } from "react";
import { Controller, useFieldArray, type Control } from "react-hook-form";
import { type OnboardingFormValues, emptyDebtRow } from "../lib/onboarding-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "../../vault/components/primitives/empty-state";
import { RepeatableRow } from "../../vault/components/primitives/repeatable-row";

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
      <div className="flex flex-col gap-[14px]">
        {/* Label */}
        <div>
          <label
            htmlFor={`conv-debt-${index}-label`}
            className="text-[0.68rem] tracking-[0.16em] font-bold text-primary block mb-1"
          >
            Label
          </label>
          <Controller
            control={control}
            name={`debts.${index}.label`}
            render={({ field }) => (
              <Input
                id={`conv-debt-${index}-label`}
                placeholder="e.g. Credit card"
                aria-label="Debt label"
                {...field}
              />
            )}
          />
        </div>

        {/* Balance + Min payment */}
        <div className="grid grid-cols-2 gap-y-[10px] gap-x-3">
          <div>
            <label
              htmlFor={`conv-debt-${index}-balance`}
              className="text-[0.68rem] tracking-[0.16em] font-bold text-primary block mb-1"
            >
              Balance (PHP)
            </label>
            <Controller
              control={control}
              name={`debts.${index}.outstandingBalance`}
              render={({ field }) => (
                <Input
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
            <label
              htmlFor={`conv-debt-${index}-minpay`}
              className="text-[0.68rem] tracking-[0.16em] font-bold text-primary block mb-1"
            >
              Min payment
            </label>
            <Controller
              control={control}
              name={`debts.${index}.minimumPayment`}
              render={({ field }) => (
                <Input
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
        <div className="max-w-[120px]">
          <label
            htmlFor={`conv-debt-${index}-dueDay`}
            className="text-[0.68rem] tracking-[0.16em] font-bold text-primary block mb-1"
          >
            Due day
          </label>
          <Controller
            control={control}
            name={`debts.${index}.dueDay`}
            render={({ field }) => (
              <Input
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
    <div className="flex flex-col gap-5">
      {/* Example chips */}
      {examples.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Example debts">
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
          title="No debts to track"
          hint="Credit cards, loans, buy-now-pay-later - add them here to keep an eye on what you owe."
          actionLabel="Add your first debt"
          onAdd={handleAppend}
        />
      ) : (
        <div className="flex flex-col gap-[14px]">
          {fields.map((field, index) => (
            <DebtRowCard
              key={field.id}
              index={index}
              control={control}
              onRemove={() => remove(index)}
            />
          ))}
          <Button variant="ghost" className="text-muted-foreground" onClick={handleAppend}>
            + Add another debt
          </Button>
        </div>
      )}
    </div>
  );
}
