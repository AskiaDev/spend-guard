"use client";

import { motion } from "motion/react";
import { ArrowRight, Check, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";
import { RealCost } from "./real-cost";
import { useReveal } from "./motion";

const STEPS = [
  { n: "01", label: "You want it" },
  { n: "02", label: "You buy it" },
  { n: "03", label: "Reality hits" },
] as const;

const REGRETS = [
  { label: "Over budget", amount: "-₱2,380" },
  { label: "Bill is due", amount: "-₱1,800" },
  { label: "Savings delayed", amount: "-₱2,440" },
] as const;

function ProblemHeader() {
  return (
    <header className="flex justify-end">
      <span className="font-ledger text-xs uppercase tracking-[0.14em] sm:text-sm">
        <span className="text-ink-faint">02</span> / <span className="text-ink">The problem</span>
      </span>
    </header>
  );
}

function CropMarks() {
  const arm = "pointer-events-none absolute size-4 border-ink/25";
  return (
    <>
      <span className={cn(arm, "-left-1 -top-1 border-l border-t")} />
      <span className={cn(arm, "-right-1 -top-1 border-r border-t")} />
      <span className={cn(arm, "-bottom-1 -left-1 border-b border-l")} />
      <span className={cn(arm, "-bottom-1 -right-1 border-b border-r")} />
    </>
  );
}

function JourneyTimeline() {
  return (
    <div className="relative hidden sm:block">
      {/* origin: a target node + dotted lead-in feeding the journey */}
      <span className="absolute bottom-[1px] left-0 z-10 flex size-3.5 items-center justify-center rounded-full border-2 border-hair-strong bg-paper">
        <span className="size-1 rounded-full bg-hair-strong" />
      </span>
      <span className="absolute bottom-[7px] left-5 right-[83.4%] border-t-2 border-dotted border-hair-strong/70" />
      {/* the lime spend line through every stage, then off the edge */}
      <span className="absolute bottom-[6px] left-[16.66%] right-7 h-[3px] rounded bg-brand" />
      <ArrowRight className="absolute bottom-[-4px] right-0 size-6 text-brand" strokeWidth={2.5} />
      <div className="grid grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.n} className="flex flex-col items-center gap-1 text-center">
            <span className="font-poster text-3xl leading-none text-brand-dark">{s.n}</span>
            <span className="font-semibold text-ink">{s.label}</span>
            <span className="relative z-10 mt-2 size-4 rounded-full border-[3px] border-brand bg-paper" />
          </div>
        ))}
      </div>
    </div>
  );
}

function WantCard() {
  return (
    <article className="card-paper flex flex-col p-5">
      <p className="font-semibold text-ink">New Headphones</p>
      <p className="mt-1 font-ledger text-2xl font-bold text-ink">₱6,590</p>
      <div className="mt-4 flex aspect-[4/3] items-center justify-center rounded-xl bg-paper-muted text-ink-soft">
        <Headphones className="size-20" strokeWidth={1.25} />
      </div>
      <div className="mt-4 rounded-xl bg-brand py-3 text-center font-ledger text-sm font-bold uppercase tracking-[0.06em] text-ink">
        Buy now
      </div>
    </article>
  );
}

function Barcode() {
  const seg = [3, 2, 1, 2, 4, 1, 2, 3, 1, 1, 2, 2, 3, 1, 2, 1, 4, 2, 1, 3, 2, 1, 2, 3, 1, 2, 1, 2, 3];
  let x = 0;
  const bars = seg.map((w, i) => {
    const bar = i % 2 === 0 ? <rect key={i} x={x} width={w} height={36} fill="var(--color-ink)" /> : null;
    x += w;
    return bar;
  });
  return (
    <svg viewBox={`0 0 ${x} 36`} preserveAspectRatio="none" className="mt-4 h-9 w-full" aria-hidden="true">
      {bars}
    </svg>
  );
}

function ReceiptCard() {
  return (
    <article className="card-paper flex flex-col p-5">
      <p className="text-center font-ledger text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
        Payment successful
      </p>
      <span className="mx-auto mt-3 flex size-12 items-center justify-center rounded-full bg-brand text-ink">
        <Check className="size-7" strokeWidth={3} />
      </span>
      <span className="mt-4 border-t border-dashed border-hair" />
      <div className="mt-3 space-y-2 font-ledger text-sm">
        <div className="flex justify-between">
          <span className="text-ink-soft">New Headphones</span>
          <span className="text-ink">₱6,590</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-soft">Total</span>
          <span className="font-semibold text-ink">₱6,590</span>
        </div>
      </div>
      <span className="mt-3 border-t border-dashed border-hair" />
      <Barcode />
      <p className="mt-3 text-center font-ledger text-xs uppercase tracking-[0.14em] text-ink-faint">
        Thank you
      </p>
    </article>
  );
}

function RegretCard() {
  return (
    <article className="card-slate flex flex-col p-5">
      <p className="text-xl font-bold leading-tight text-ink-inverse">
        Where did
        <br />
        my money go?
      </p>
      <div className="mt-4 space-y-3">
        {REGRETS.map((r) => (
          <div
            key={r.label}
            className="flex items-center gap-2.5 border-b border-dashed border-white/15 pb-3 last:border-0"
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded bg-negative text-[11px] font-bold leading-none text-white">
              !
            </span>
            <span className="text-sm text-ink-inverse/85">{r.label}</span>
            <span className="ml-auto font-ledger text-sm font-semibold text-negative">{r.amount}</span>
          </div>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between pt-4">
        <span className="text-lg font-bold text-ink-inverse">Stress</span>
        <span className="rounded-md bg-negative px-3 py-1 font-ledger text-xs font-bold uppercase tracking-wide text-white">
          High
        </span>
      </div>
    </article>
  );
}

export function ProblemSection() {
  const { flow, beat } = useReveal();

  return (
    <section className="mx-auto w-full max-w-[1680px]">
      <motion.div
        {...flow}
        className="ledger-sheet flex min-h-[calc(100svh-1.5rem)] flex-col gap-7 px-6 py-7 sm:min-h-[calc(100svh-2.5rem)] sm:px-10 sm:py-9"
      >
        <motion.div {...beat}>
          <ProblemHeader />
        </motion.div>

        {/* The exhibit: a buyer's journey, framed like a print trim area */}
        <div className="relative flex flex-1 items-center">
          <CropMarks />
          <div className="grid w-full gap-10 py-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,2.2fr)] lg:gap-14">
            <motion.div {...beat} className="flex flex-col justify-center">
              <h2 className="font-poster text-[clamp(2.5rem,4.4vw,4.5rem)] uppercase leading-[0.88] tracking-[-0.005em]">
                <span className="block text-ink">The problem?</span>
                <span className="block text-brand-dark">You find out</span>
                <span className="block text-brand-dark">Too late.</span>
              </h2>
              <p className="mt-6 max-w-xs leading-relaxed text-ink-soft">
                Most budgeting apps show you what happened after you already spent. By then, the
                damage is done.
              </p>
            </motion.div>

            <div className="flex flex-col justify-center">
              <motion.div {...beat}>
                <JourneyTimeline />
              </motion.div>
              <div className="mt-6 grid gap-5 sm:grid-cols-3">
                <motion.div {...beat}>
                  <WantCard />
                </motion.div>
                <motion.div {...beat}>
                  <ReceiptCard />
                </motion.div>
                <motion.div {...beat}>
                  <RegretCard />
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        <motion.div {...beat}>
          <RealCost />
        </motion.div>
      </motion.div>
    </section>
  );
}
