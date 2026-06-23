import { cn } from "@/lib/utils";

export interface PageSkeletonProps {
  cardCount?: number;
  label?: string;
  className?: string;
}

export function PageSkeleton({
  cardCount = 3,
  label = "Loading page content",
  className,
}: PageSkeletonProps) {
  const normalizedCardCount = Number.isFinite(cardCount) ? Math.trunc(cardCount) : 3;
  const visibleCardCount = Math.max(1, normalizedCardCount);

  return (
    <div
      role="status"
      aria-label={label}
      aria-live="polite"
      aria-busy="true"
      className={cn("grid gap-4 md:grid-cols-2", className)}
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: visibleCardCount }, (_, index) => (
        <div
          key={index}
          data-skeleton-card
          aria-hidden="true"
          className="min-h-48 animate-pulse rounded-card border border-border bg-surface p-5 shadow-card motion-reduce:animate-none"
        >
          <div className="h-4 w-2/5 rounded-full bg-slate-200" />
          <div className="mt-6 h-8 w-3/5 rounded-full bg-slate-100" />
          <div className="mt-8 h-3 w-full rounded-full bg-slate-100" />
          <div className="mt-3 h-3 w-4/5 rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
