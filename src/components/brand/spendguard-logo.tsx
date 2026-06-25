import { cn } from "@/lib/utils";

export function SpendGuardLogo({
  className,
  compact = false,
  markLabel = "SpendGuard",
}: {
  className?: string;
  compact?: boolean;
  markLabel?: string;
}) {
  const isDecorativeMark = markLabel.length === 0;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg
        role={isDecorativeMark ? undefined : "img"}
        aria-hidden={isDecorativeMark ? "true" : undefined}
        aria-label={isDecorativeMark ? undefined : markLabel}
        viewBox="0 0 48 48"
        className="size-11 shrink-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="16" fill="#155EEF" />
        <path
          d="M24 10.5L36 15.25V23.5C36 31.1 31.13 37.72 24 40.08C16.87 37.72 12 31.1 12 23.5V15.25L24 10.5Z"
          fill="white"
          opacity="0.96"
        />
        <path
          d="M19.1 25.2C22.8 24.88 27.25 22.55 30.5 17.85C31.18 23.3 29.02 29.85 22.4 31.16C20.12 31.61 17.95 31.05 16.3 29.86C18.38 29.48 20.52 28.37 22.12 26.7C20.98 27.06 19.86 27.21 18.8 27.08C18.58 26.43 18.48 25.8 18.5 25.2H19.1Z"
          fill="#15803D"
        />
        <path
          d="M18 31.2C20.75 28.65 24.24 26.6 28.22 25.28"
          stroke="#155EEF"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>

      {!compact ? (
        <div className="min-w-0">
          <p className="text-base font-semibold leading-none tracking-tight text-foreground">
            SpendGuard
          </p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">Personal finance coach</p>
        </div>
      ) : (
        <span className="sr-only">SpendGuard</span>
      )}
    </div>
  );
}
