"use client";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  hint,
  actionLabel,
  onAdd,
}: {
  title: string;
  hint: string;
  actionLabel: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed border-border px-6 py-9 text-center">
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="max-w-[260px] text-[0.82rem] text-muted-foreground">{hint}</p>
      <Button onClick={onAdd}>{actionLabel}</Button>
    </div>
  );
}
