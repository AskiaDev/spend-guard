import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface StepProgressProps {
  steps: { label: string }[];
  currentStep: number;
  className?: string;
}

export function StepProgress({ steps, currentStep, className }: StepProgressProps) {
  const normalizedCurrentStep = Number.isFinite(currentStep) ? Math.trunc(currentStep) : 1;
  const boundedCurrentStep = Math.max(
    1,
    Math.min(normalizedCurrentStep, Math.max(steps.length, 1))
  );

  return (
    <ol className={cn("flex flex-col gap-3 sm:flex-row", className)}>
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < boundedCurrentStep;
        const isCurrent = stepNumber === boundedCurrentStep;
        const accessibleState = isCompleted
          ? `${step.label}, completed`
          : isCurrent
            ? `${step.label}, current step`
            : `${step.label}, step ${stepNumber}`;

        return (
          <li
            key={`${stepNumber}-${step.label}`}
            aria-label={accessibleState}
            aria-current={isCurrent ? "step" : undefined}
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full border text-sm font-semibold",
                isCompleted && "border-safe bg-safe text-white",
                isCurrent && "border-primary bg-primary text-white",
                !isCompleted && !isCurrent && "border-border bg-card/50 text-muted-foreground"
              )}
            >
              {isCompleted ? (
                <Check aria-hidden="true" className="size-4" strokeWidth={3} />
              ) : (
                stepNumber
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">
                {step.label}
              </span>
              {isCurrent ? (
                <span className="block text-xs font-semibold text-primary">Current</span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
