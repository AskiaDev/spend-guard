"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Headphones,
  Info,
  Play,
  Shield,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { Brandmark } from "./brandmark";
import { Grain } from "./grain";
import { useRise } from "./motion";

const STEPS = [
  { n: 1, title: "Add your purchase", desc: "Paste a product link or type the amount." },
  { n: 2, title: "Get your verdict", desc: "We reveal the true cost, risks, and smarter options." },
  { n: 3, title: "Decide with confidence", desc: "Buy, rethink, or wait, with no second guessing." },
] as const;

// Decorative ledger behind the headline - pure texture, not real data.
const LEDGER = [
  ["APR", "24.99%"],
  ["SUBS", "12.00"],
  ["FX", "1.07"],
  ["TAX", "8.20"],
  ["SHIPPING", "0.00"],
  ["FEES", "2.49"],
] as const;

function LiveDataPill() {
  return (
    <div className="inline-flex items-center gap-2.5 rounded-full border border-slate-line bg-black/30 px-3 py-1.5">
      <span className="size-1.5 rounded-full bg-brand shadow-[0_0_0_3px_rgba(184,242,12,0.22)]" />
      <span className="font-ledger text-[10px] font-bold uppercase tracking-[0.14em] text-ink-inverse">
        Live data
      </span>
      <span className="h-3 w-px bg-slate-line" />
      <span className="font-ledger text-[11px] text-ink-inverse/60">Market pulse</span>
      <span className="inline-flex items-center gap-0.5 font-ledger text-[11px] font-semibold text-brand">
        <ArrowUpRight className="size-3" strokeWidth={2.5} />
        +0.6%
      </span>
    </div>
  );
}

function DecorLedger() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-32 left-8 hidden w-40 opacity-20 xl:block"
    >
      {LEDGER.map(([k, v]) => (
        <div
          key={k}
          className="flex justify-between border-b border-slate-line py-1.5 font-ledger text-[11px] text-ink-inverse/70"
        >
          <span>{k}</span>
          <span>{v}</span>
        </div>
      ))}
      <div className="flex justify-between pt-1.5 font-ledger text-xs font-bold text-brand">
        <span>TOTAL</span>
        <span>$151.68</span>
      </div>
    </div>
  );
}

function DecorChart() {
  return (
    <div aria-hidden="true" className="mt-10 hidden opacity-45 lg:block">
      <svg viewBox="0 0 320 64" className="h-16 w-full" fill="none">
        <polyline
          points="4,52 40,44 76,48 112,34 148,40 184,24 220,30 256,14 292,18 316,6"
          stroke="var(--color-brand)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-1 flex justify-between font-ledger text-[10px] tracking-[0.08em] text-ink-inverse/40">
        {["JAN", "FEB", "MAR", "APR", "MAY"].map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  );
}

function Steps() {
  return (
    <ol className="relative space-y-7">
      <span
        aria-hidden="true"
        className="absolute top-3 bottom-3 left-[15px] w-px border-l border-dashed border-brand-dark/45"
      />
      {STEPS.map(({ n, title, desc }) => (
        <li key={n} className="relative flex gap-4">
          <span className="z-[1] flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-brand-dark bg-paper-soft text-sm font-bold text-brand-dark ring-4 ring-paper-soft">
            {n}
          </span>
          <div className="pt-0.5">
            <p className="font-semibold text-ink">{title}</p>
            <p className="mt-1 text-sm leading-snug text-ink-soft">{desc}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

// Handwritten nudge toward the verdict card (desktop only, where it sits to the right).
function SwipeNote() {
  return (
    <div aria-hidden="true" className="relative mt-5 hidden pl-11 lg:block">
      <p className="font-script text-xl leading-tight text-brand-dark">
        Swipe to see
        <br />
        a quick verdict
      </p>
      <svg
        className="absolute -top-4 left-44 h-16 w-24 text-brand-dark"
        viewBox="0 0 96 64"
        fill="none"
      >
        <path
          d="M6 56 C 34 60, 72 40, 88 10"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="4 5"
          strokeLinecap="round"
        />
        <path
          d="M80 6 L 90 9 L 85 20"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function ProductCard() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-hair bg-white p-3 shadow-[0_10px_30px_rgba(20,18,14,0.08)]">
      <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-paper-muted text-ink-faint">
        <Headphones className="size-8" strokeWidth={1.5} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug text-ink">Noise Cancelling Headphones</p>
        <p className="mt-0.5 text-lg font-bold text-ink">$199.00</p>
        <p className="truncate text-[11px] text-ink-faint">store.example.com</p>
      </div>
      <span aria-hidden="true" className="shrink-0 text-ink-faint">
        <X className="size-4" strokeWidth={2} />
      </span>
    </div>
  );
}

function VerdictRow({
  label,
  value,
  valueClass,
  trailing,
}: {
  label: string;
  value: string;
  valueClass?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-t border-hair py-3 text-sm">
      <span className="text-ink-soft">{label}</span>
      <span className="flex items-center gap-1.5">
        <span className={valueClass ?? "font-semibold text-ink"}>{value}</span>
        {trailing}
      </span>
    </div>
  );
}

function VerdictCard() {
  return (
    <div className="relative z-10 -mt-6 rounded-2xl border border-hair bg-white p-5 shadow-[0_24px_60px_rgba(20,18,14,0.16)]">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-ledger text-[11px] font-bold uppercase tracking-[0.1em] text-ink-faint">
          SpendGuard Verdict
          <Info className="size-3.5" strokeWidth={2} />
        </span>
        <span className="rounded-full bg-brand px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-ink">
          Good buy
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <span className="flex items-baseline gap-1">
          <span className="font-poster text-5xl leading-none text-brand-dark">78</span>
          <span className="text-lg text-ink-faint">/100</span>
        </span>
        <div className="text-right">
          <p className="text-sm font-semibold text-ink">Solid value.</p>
          <p className="text-sm text-ink-soft">Fair price with low risk.</p>
        </div>
      </div>

      <div className="mt-5">
        <VerdictRow
          label="True Cost"
          value="$212.48"
          trailing={<ChevronDown className="size-4 text-ink-faint" strokeWidth={2} />}
        />
        <VerdictRow label="Price vs Market" value="-8%" valueClass="font-semibold text-positive" />
        <VerdictRow
          label="Risk Factors"
          value="Low"
          trailing={<span className="size-2 rounded-full bg-positive" />}
        />
        <VerdictRow
          label="Better Alternatives"
          value="2 found"
          trailing={<ChevronRight className="size-4 text-ink-faint" strokeWidth={2} />}
        />
      </div>

      <button
        type="button"
        className="mt-1 flex w-full items-center justify-between border-t border-hair pt-4 text-sm font-bold text-ink"
      >
        View full analysis
        <ChevronRight className="size-4" strokeWidth={2.25} />
      </button>
    </div>
  );
}

export function FinalCta() {
  const reveal = useRise(0.2);

  return (
    <section className="relative mx-auto w-full max-w-[1680px]">
      <div className="grid overflow-hidden rounded-[28px] border border-hair lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Left: the closing thesis on dark */}
        <motion.div
          {...reveal}
          className="relative flex flex-col overflow-hidden px-6 py-10 sm:px-10 lg:py-12"
          style={{
            background:
              "radial-gradient(circle at 12% 18%, rgba(184,242,12,0.08), transparent 34%), linear-gradient(160deg, #101412 0%, #090b0a 100%)",
          }}
        >
          <Grain />
          <DecorLedger />

          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <Brandmark showTagline inverse />
            <LiveDataPill />
          </div>

          <div className="relative flex flex-1 flex-col justify-center py-10">
            <h2 className="font-poster text-[clamp(2.25rem,4.2vw,4rem)] leading-[0.88] tracking-[-0.005em] text-ink-inverse uppercase">
              <span className="block">Start with</span>
              <span className="block text-brand">one purchase.</span>
              <span className="block">Get clarity</span>
              <span className="block">before checkout.</span>
            </h2>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-inverse/70">
              Stop guessing. SpendGuard analyzes the true cost, so you can{" "}
              <span className="font-semibold text-brand">decide with confidence.</span>
            </p>
          </div>

          <DecorChart />
        </motion.div>

        {/* Right: the payoff - a live verdict + the next action */}
        <motion.div
          {...reveal}
          className="ledger-sheet bg-paper-soft/70 px-6 py-10 sm:px-10 lg:py-12"
        >
          <div className="grid gap-x-8 gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            {/* Left column: the path + the actions */}
            <div className="flex flex-col">
              <p className="font-ledger text-xs font-bold uppercase tracking-[0.12em] text-ink-soft">
                Okay, what should I do now?
              </p>

              <div className="mt-6">
                <Steps />
              </div>

              <SwipeNote />

              <div className="mt-8 flex flex-col gap-3">
                <Link
                  href="/signup"
                  className="group flex items-center justify-between gap-3 rounded-2xl bg-brand px-6 py-4 text-ink transition-colors hover:bg-brand-soft"
                >
                  <span>
                    <span className="block text-base font-bold">Analyze My Purchase Now</span>
                    <span className="block text-xs text-ink/70">It takes less than 30 seconds</span>
                  </span>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-paper transition-transform group-hover:translate-x-0.5">
                    <ArrowRight className="size-4" strokeWidth={2.5} />
                  </span>
                </Link>

                <a
                  href="#how"
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-hair-strong px-6 py-4 text-ink transition-colors hover:border-ink"
                >
                  <span>
                    <span className="block text-base font-bold">See How It Works</span>
                    <span className="block text-xs text-ink-faint">30-second demo</span>
                  </span>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-hair-strong text-ink transition-colors group-hover:border-ink group-hover:bg-ink group-hover:text-paper">
                    <Play className="size-3.5 translate-x-px" fill="currentColor" strokeWidth={0} />
                  </span>
                </a>
              </div>

              <p className="mt-6 flex items-center gap-2 text-sm text-ink-soft">
                <Shield className="size-4 shrink-0 text-ink-faint" strokeWidth={2} />
                No sign-up required. 100% private. Always free.
              </p>
            </div>

            {/* Right column: the verdict, as a printed statement */}
            <div className="relative">
              <div className="ml-auto w-[88%] sm:w-[82%]">
                <ProductCard />
              </div>
              <VerdictCard />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Seam badge straddling the two panels */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-[46.5%] z-20 hidden -translate-x-1/2 -translate-y-1/2 lg:block"
      >
        <span className="flex size-16 items-center justify-center rounded-full border-2 border-brand/40 bg-slate font-poster text-2xl text-brand shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
          SG
        </span>
      </div>
    </section>
  );
}
