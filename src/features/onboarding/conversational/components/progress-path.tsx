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
      style={{
        width: "100%",
        height: "3px",
        background: "var(--vault-border)",
        borderRadius: "999px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: "100%",
          background: "linear-gradient(90deg, var(--vault-accent-2), var(--vault-accent))",
          borderRadius: "999px",
          transformOrigin: "left center",
          transform: `scaleX(${ratio})`,
          transition: "transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </div>
  );
}
