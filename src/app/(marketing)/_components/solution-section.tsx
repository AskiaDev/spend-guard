"use client";

import { motion } from "motion/react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { SolutionFlow } from "./solution-flow";
import { useReveal } from "./motion";

function SolutionAside({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none relative h-[300px] w-[460px]", className)} aria-hidden="true">
      {/* a sight finding its mark */}
      <svg
        viewBox="0 0 200 200"
        className="absolute left-2 top-0 size-44 text-hair-strong"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
      >
        <circle cx="100" cy="100" r="44" />
        <circle cx="100" cy="100" r="72" />
        <line x1="100" y1="6" x2="100" y2="194" />
        <line x1="6" y1="100" x2="194" y2="100" />
        <circle cx="100" cy="100" r="7" fill="var(--color-brand)" stroke="none" />
      </svg>

      {/* the trajectory out of the fog */}
      <svg
        viewBox="0 0 240 150"
        className="absolute right-2 top-0 h-32 w-52 text-brand"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
      >
        <path d="M6 140 C 70 140 70 70 130 60 S 200 30 224 12" strokeWidth="2.5" strokeDasharray="1 8" />
        <path d="M212 6 L230 11 L223 28" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>

      <div className="absolute bottom-4 right-0 text-right">
        <p className="font-script text-4xl leading-tight text-ink">No guesswork.</p>
        <p className="font-script text-4xl leading-tight text-brand-dark">Just clarity.</p>
        <svg viewBox="0 0 160 12" className="ml-auto mt-1 h-2.5 w-36 text-brand-dark" fill="none" stroke="currentColor">
          <path d="M4 8 Q 70 1 156 6" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

function SolutionFooter() {
  return (
    <div className="card-paper flex flex-col gap-5 px-7 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-10">
      <div className="flex items-center gap-5">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand text-ink">
          <ShieldCheck className="size-8" strokeWidth={2} />
        </span>
        <div className="font-ledger text-sm leading-relaxed text-ink sm:text-base">
          <p>Every decision is backed by clarity.</p>
          <p>
            Because your <span className="font-semibold text-brand-dark">future</span> is part of the
            equation.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-ledger text-sm uppercase tracking-[0.04em] text-ink">
          See the real tradeoff. Always.
        </span>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-ink">
          <ArrowRight className="size-5" strokeWidth={2.5} />
        </span>
      </div>
    </div>
  );
}

export function SolutionSection() {
  const { flow, beat } = useReveal();

  return (
    <section className="mx-auto w-full max-w-[1680px]">
      <motion.div
        {...flow}
        className="ledger-sheet flex min-h-[calc(100svh-1.5rem)] flex-col gap-8 px-6 py-7 sm:min-h-[calc(100svh-2.5rem)] sm:px-10 sm:py-9"
      >
        <motion.header {...beat} className="flex justify-end border-b border-hair pb-6">
          <span className="font-ledger text-xs uppercase tracking-[0.14em] text-ink sm:text-sm">
            <span className="text-ink-faint">03</span> / The solution
          </span>
        </motion.header>

        <div className="flex flex-1 flex-col justify-center gap-12 py-4">
          <div className="relative">
            <motion.div {...beat} className="lg:max-w-[58%]">
              <h2 className="font-poster text-[clamp(2.5rem,4.8vw,5rem)] uppercase leading-[0.86] tracking-[-0.005em] text-ink">
                <span className="block">Spendguard</span>
                <span className="block">Turns a guess</span>
                <span className="block">
                  Into a <span className="text-brand-dark">clear decision.</span>
                </span>
              </h2>
              <p className="mt-6 max-w-md font-ledger text-sm leading-relaxed text-ink-soft">
                Instead of only showing your bank balance, it subtracts bills, debt, goals, and your
                emergency buffer before calling anything safe to spend.
              </p>
            </motion.div>
            <SolutionAside className="absolute -top-4 right-0 hidden xl:block" />
          </div>

          <motion.div {...beat}>
            <SolutionFlow />
          </motion.div>
        </div>

        <motion.div {...beat}>
          <SolutionFooter />
        </motion.div>
      </motion.div>
    </section>
  );
}
