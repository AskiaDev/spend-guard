import { cn } from "@/lib/utils";

export interface ScoreGaugeProps {
  score: number;
  label: string;
  className?: string;
}

function clampScore(score: number) {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, score));
}

const gaugePath = "M 10 60 A 50 50 0 0 1 110 60";

export function ScoreGauge({ score, label, className }: ScoreGaugeProps) {
  const boundedScore = clampScore(score);
  const displayScore = Math.round(boundedScore);
  // ponytail: gaugeOffset is data-driven (100 - score); cannot be a Tailwind class
  const gaugeOffset = 100 - boundedScore;

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={displayScore}
      className={cn("inline-flex flex-col items-center", className)}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 120 72"
        className="h-auto w-32 overflow-visible"
      >
        <path
          d={gaugePath}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          pathLength="100"
          className="text-border"
        />
        <path
          d={gaugePath}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray="100"
          strokeDashoffset={gaugeOffset}
          className="text-primary transition-[stroke-dashoffset] motion-reduce:transition-none"
        />
      </svg>
      <span className="-mt-3 text-lg font-bold tabular-nums text-foreground">
        {displayScore} / 100
      </span>
    </div>
  );
}
