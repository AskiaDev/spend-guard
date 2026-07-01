"use client";

import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { LedgerDashboard } from "./ledger-dashboard";
import { container, rise } from "./motion";

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper-soft";

const HEADLINE = ["Before", "You buy,", "See the real", "Tradeoff."] as const;

export function Hero() {
  const reduced = useReducedMotion();
  const group = reduced
    ? {}
    : { variants: container, initial: "hidden" as const, animate: "show" as const };
  const line = reduced ? {} : { variants: rise };

  return (
    <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      {/* Left: the thesis */}
      <motion.div {...group} className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:py-12">
        <h1 className="font-poster text-[clamp(2.75rem,6.2vw,6.75rem)] uppercase leading-[0.85] tracking-[-0.005em] text-ink">
          {HEADLINE.map((word, i) => (
            <motion.span
              key={word}
              {...line}
              className={i === 2 ? "block text-brand-dark" : "block"}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.p {...line} className="mt-7 max-w-md text-lg leading-relaxed text-ink-soft">
          SpendGuard separates protected money from safe-to-spend money so you can make clearer
          decisions <span className="font-semibold text-positive">without shame</span>.
        </motion.p>

        <motion.div {...line} className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
          <Link
            href="/signup"
            className={`group inline-flex items-center gap-3 rounded-full bg-brand py-2 pl-7 pr-2 font-ledger text-sm font-bold uppercase tracking-[0.04em] text-ink transition-colors hover:bg-brand-soft ${focusRing}`}
          >
            Get started free
            <span className="flex size-9 items-center justify-center rounded-full bg-ink text-paper transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="size-4" strokeWidth={2.5} />
            </span>
          </Link>

          <a
            href="#how"
            className={`group inline-flex items-center gap-3 font-ledger text-sm uppercase tracking-[0.04em] text-ink ${focusRing} rounded-full`}
          >
            See how it works
            <span className="flex size-9 items-center justify-center rounded-full border border-hair-strong text-ink transition-colors group-hover:border-ink group-hover:bg-ink group-hover:text-paper">
              <Play className="size-3.5 translate-x-px" fill="currentColor" strokeWidth={0} />
            </span>
          </a>
        </motion.div>
      </motion.div>

      {/* Right: the signature - a live verdict, rendered as a printed statement */}
      <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:border-l lg:border-hair lg:py-12">
        <LedgerDashboard />
      </div>
    </div>
  );
}
