"use client";

import { motion, type Transition, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const fill = { duration: 1.2, delay: 0.55, ease: [0.16, 1, 0.3, 1] } satisfies Transition;

// Progress ring for the "safe-to-spend share of balance" beat. Lives on dark cards.
// Pass `animate` to sweep the ring in on mount (used by the live hero statement).
export function Donut({
  percent = 39,
  caption = "of balance",
  className,
  animate = false,
}: {
  percent?: number;
  caption?: string;
  className?: string;
  animate?: boolean;
}) {
  const reduced = useReducedMotion();
  const r = 52;
  const c = 2 * Math.PI * r;
  const dash = (c * percent) / 100;
  const live = animate && !reduced;

  return (
    <div className={cn("relative size-[120px] shrink-0", className)}>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-slate-line)" strokeWidth="12" />
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          {...(live
            ? { initial: { strokeDashoffset: c }, animate: { strokeDashoffset: c - dash }, transition: fill }
            : { strokeDashoffset: c - dash })}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-poster text-3xl text-brand">{percent}%</span>
        <span className="font-ledger text-[10px] uppercase tracking-[0.1em] text-ink-inverse/55">
          {caption}
        </span>
      </div>
    </div>
  );
}
