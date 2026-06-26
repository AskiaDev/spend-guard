"use client";

interface VaultStepperProps {
  step: number;
  labels: string[];
}

export function VaultStepper({ step, labels }: VaultStepperProps) {
  const total = labels.length;
  const progress = total > 0 ? (step / total) * 100 : 0;

  return (
    <div className="w-full">
      {/* Progress bar track */}
      <div className="h-[2px] bg-border rounded-[1px] overflow-hidden mb-3">
        <div
          className="h-full w-full bg-primary rounded-[1px] origin-left transition-transform duration-[400ms]"
          // ponytail: width is computed from progress ratio - keep inline
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      </div>

      {/* Step labels */}
      <div className="flex gap-1">
        {labels.map((label, index) => {
          const isActive = index + 1 === step;
          const isDone = index + 1 < step;
          return (
            <div
              key={index}
              className="flex-1 text-[0.65rem] tracking-[0.12em] font-bold uppercase whitespace-nowrap overflow-hidden text-ellipsis transition-colors duration-300"
              // ponytail: color is state-driven (active/done/upcoming) - keep inline; uses new tokens
              style={{
                color: isActive
                  ? "var(--primary)"
                  : isDone
                    ? "var(--muted-foreground)"
                    : "var(--border)",
              }}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
