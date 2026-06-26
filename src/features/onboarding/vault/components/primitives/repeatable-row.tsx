"use client";
import type { ReactNode } from "react";

export function RepeatableRow({
  onRemove,
  children,
}: {
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-control border border-border bg-secondary px-3.5 py-2.5">
      <div className="flex-1">{children}</div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove row"
        className="shrink-0 cursor-pointer rounded-control px-1.5 py-0.5 text-[1.1rem] leading-none text-muted-foreground"
      >
        ×
      </button>
    </div>
  );
}
