"use client";

interface ProgressPathProps {
  /** 1-based index of the active step. */
  current: number;
  /** Total number of steps in the flow. */
  total: number;
}

// A single quiet progress line - no dots, no per-step labels. Each step names
// itself with its own eyebrow in the step body; this bar just shows how far
// along the flow is, so a 14-step setup never feels like a crowded checklist.
export function ProgressPath({ current, total }: ProgressPathProps) {
  const ratio = total > 0 ? Math.min(Math.max(current / total, 0), 1) : 0;

  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
      className="w-full h-[3px] bg-border rounded-full overflow-hidden"
    >
      <div
        className="h-full w-full bg-[linear-gradient(90deg,var(--chart-2),var(--primary))] rounded-full origin-left transition-transform duration-[450ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ // ponytail: scaleX depends on ratio computed from current/total props
          transform: `scaleX(${ratio})`,
        }}
      />
    </div>
  );
}
