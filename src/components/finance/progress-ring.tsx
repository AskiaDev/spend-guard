import { cn } from "@/lib/utils";

const DEFAULT_SIZE = 96;
const MIN_SIZE = 24;
const DEFAULT_STROKE_WIDTH = 8;
const MIN_STROKE_WIDTH = 1;

export interface ProgressRingProps {
  value: number;
  label: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
}

function normalizeSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) {
    return DEFAULT_SIZE;
  }

  return Math.max(MIN_SIZE, size);
}

function normalizeStrokeWidth(strokeWidth: number, size: number) {
  const fallbackStrokeWidth =
    Number.isFinite(strokeWidth) && strokeWidth > 0 ? strokeWidth : DEFAULT_STROKE_WIDTH;

  return Math.max(MIN_STROKE_WIDTH, Math.min(fallbackStrokeWidth, size / 2));
}

export function ProgressRing({
  value,
  label,
  size = DEFAULT_SIZE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  className,
}: ProgressRingProps) {
  const boundedValue = clampPercentage(value);
  const normalizedSize = normalizeSize(size);
  const normalizedStrokeWidth = normalizeStrokeWidth(strokeWidth, normalizedSize);
  const radius = (normalizedSize - normalizedStrokeWidth) / 2;
  // ponytail: circumference + dashOffset are data-driven SVG geometry; cannot be a Tailwind class
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - boundedValue / 100);
  const displayValue = Math.round(boundedValue);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={displayValue}
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      // ponytail: size is a prop-driven pixel value; cannot be a Tailwind class
      style={{ width: normalizedSize, height: normalizedSize }}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox={`0 0 ${normalizedSize} ${normalizedSize}`}
        className="absolute inset-0 -rotate-90"
      >
        <circle
          cx={normalizedSize / 2}
          cy={normalizedSize / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={normalizedStrokeWidth}
          className="text-border"
        />
        <circle
          cx={normalizedSize / 2}
          cy={normalizedSize / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={normalizedStrokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="text-safe transition-[stroke-dashoffset] motion-reduce:transition-none"
        />
      </svg>
      <span aria-hidden="true" className="text-sm font-bold tabular-nums text-foreground">
        {displayValue}%
      </span>
    </div>
  );
}
