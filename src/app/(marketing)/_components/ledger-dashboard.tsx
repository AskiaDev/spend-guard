"use client";

import { motion, type Transition, type Variants, useReducedMotion } from "motion/react";
import { CircleDollarSign, Headphones, House, ShieldCheck, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountUp } from "./count-up";
import { Donut } from "./donut";
import { item } from "./motion";

// Static mock data - this is a product preview, not live state.
const PROTECTED = [
  { icon: House, label: "Bills", amount: "$1,450.00", chip: "bg-positive text-white" },
  { icon: ShieldCheck, label: "Emergency Buffer", amount: "$1,500.00", chip: "bg-positive-soft text-positive" },
  { icon: Target, label: "Goals", amount: "$600.00", chip: "bg-warning text-ink" },
] as const;

const IMPACT = [
  { icon: CircleDollarSign, label: "Safe-to-spend after purchase", value: "$1,743.63", tone: "text-positive" },
  { icon: Target, label: "Goal impact", value: "-1.2 weeks", tone: "text-warning" },
  { icon: ShieldCheck, label: "Bills remain protected", value: "Yes", tone: "text-positive" },
] as const;

// The statement cascades in after the headline (delayChildren), one card at a time.
const cascade = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.25 } },
} satisfies Variants;

const draw = { duration: 1.1, delay: 0.5, ease: [0.16, 1, 0.3, 1] } satisfies Transition;
const tip = { duration: 0.4, delay: 1.4 } satisfies Transition;
const stampT = { type: "spring", stiffness: 300, damping: 15, delay: 0.9 } satisfies Transition;

function currency(v: number) {
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function LiveTag() {
  const reduced = useReducedMotion();
  return (
    <span className="inline-flex items-center gap-1.5 font-ledger text-[10px] font-bold uppercase tracking-[0.14em] text-ink-inverse/55">
      <motion.span
        className="size-1.5 rounded-full bg-brand shadow-[0_0_0_3px_rgba(184,242,12,0.22)]"
        animate={reduced ? undefined : { opacity: [1, 0.35, 1], scale: [1, 0.8, 1] }}
        transition={reduced ? undefined : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
      Live
    </span>
  );
}

function Label({ n, title, dark }: { n: string; title: string; dark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "rounded-[5px] border px-1.5 py-0.5 font-ledger text-[11px] font-semibold leading-none",
          dark ? "border-white/20 text-ink-inverse/80" : "border-hair text-ink-soft",
        )}
      >
        {n}
      </span>
      <span
        className={cn(
          "font-ledger text-xs uppercase tracking-[0.12em]",
          dark ? "text-ink-inverse/70" : "text-ink-faint",
        )}
      >
        {title}
      </span>
    </div>
  );
}

// Rising, hand-drawn ledger line that draws itself on mount - the "balance trending up" beat.
function Sparkline() {
  const reduced = useReducedMotion();
  return (
    <svg viewBox="0 0 148 60" className="h-11 w-28" fill="none" aria-hidden="true">
      <motion.polyline
        points="4,52 22,40 32,46 46,30 60,37 76,21 92,28 110,12 124,17 138,5"
        stroke="var(--color-brand)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...(reduced ? {} : { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: draw })}
      />
      <motion.path
        d="M129 4 L140 3 L137 14"
        stroke="var(--color-brand)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...(reduced ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: tip })}
      />
    </svg>
  );
}

function ProtectedRow({ icon: Icon, label, amount, chip }: (typeof PROTECTED)[number]) {
  return (
    <div className="flex items-center gap-3 border-b border-hair py-2.5 last:border-b-0">
      <span className={cn("flex size-8 items-center justify-center rounded-lg", chip)}>
        <Icon className="size-4" strokeWidth={2.25} />
      </span>
      <span className="text-[15px] text-ink-soft">{label}</span>
      <span className="ml-auto font-ledger text-[15px] font-medium text-ink">{amount}</span>
    </div>
  );
}

function ImpactRow({ icon: Icon, label, value, tone }: (typeof IMPACT)[number]) {
  return (
    <div className="flex items-center gap-3 py-1">
      <Icon className={cn("size-[18px] shrink-0", tone)} strokeWidth={2.25} />
      <span className="text-sm text-ink-soft">{label}</span>
      <span className={cn("ml-auto font-ledger text-sm font-semibold", tone)}>{value}</span>
    </div>
  );
}

function Column({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-4">{children}</div>;
}

export function LedgerDashboard() {
  const reduced = useReducedMotion();
  const group = reduced
    ? {}
    : { variants: cascade, initial: "hidden" as const, animate: "show" as const };
  const beat = reduced ? {} : { variants: item };
  const stamp = reduced
    ? {}
    : {
        initial: { scale: 0.5, opacity: 0, rotate: -10 },
        animate: { scale: 1, opacity: 1, rotate: 0 },
        transition: stampT,
      };

  return (
    <motion.div {...group} className="grid gap-4 sm:grid-cols-2">
      <Column>
        {/* 01 - Balance */}
        <motion.article {...beat} className="card-slate p-5">
          <div className="flex items-center justify-between">
            <Label n="01" title="Your balance" dark />
            <LiveTag />
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <CountUp
              to={5842.63}
              format={currency}
              trigger="mount"
              duration={1.2}
              delay={0.5}
              className="min-w-0 font-poster text-[clamp(2rem,3.4vw,2.75rem)] leading-none"
            />
            <div className="flex shrink-0 flex-col items-end">
              <Sparkline />
              <span className="font-ledger text-sm font-semibold text-brand">+2.4%</span>
              <span className="whitespace-nowrap font-ledger text-[10px] uppercase tracking-[0.08em] text-ink-inverse/50">
                vs last 7 days
              </span>
            </div>
          </div>
        </motion.article>

        {/* 02 - Protected money */}
        <motion.article {...beat} className="card-paper p-5">
          <Label n="02" title="Protected money" />
          <div className="mt-2">
            {PROTECTED.map((row) => (
              <ProtectedRow key={row.label} {...row} />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="font-ledger text-xs uppercase tracking-[0.1em] text-ink-faint">
              Total protected
            </span>
            <span className="font-ledger text-lg font-bold text-ink">$3,550.00</span>
          </div>
        </motion.article>

        {/* 03 - Safe-to-spend */}
        <motion.article {...beat} className="card-slate flex items-center justify-between gap-4 p-5">
          <div>
            <Label n="03" title="Safe-to-spend" dark />
            <CountUp
              to={2292.63}
              format={currency}
              trigger="mount"
              duration={1.2}
              delay={0.65}
              className="mt-3 block font-poster text-[clamp(1.85rem,3.2vw,2.5rem)] leading-none text-brand"
            />
            <p className="mt-3 max-w-[15ch] text-sm text-ink-inverse/65">
              This is your flexibility. Use it intentionally.
            </p>
          </div>
          <Donut animate />
        </motion.article>
      </Column>

      <Column>
        {/* 04 - Considering this purchase */}
        <motion.article {...beat} className="card-paper p-5">
          <Label n="04" title="Considering this purchase" />
          <div className="mt-4 flex items-center gap-4">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-paper-muted text-ink-soft">
              <Headphones className="size-8" strokeWidth={1.75} />
            </span>
            <div>
              <p className="font-semibold text-ink">Apple AirPods Max</p>
              <p className="text-sm text-ink-faint">Space Gray</p>
            </div>
            <span className="ml-auto font-ledger text-lg font-semibold text-ink">$549.00</span>
          </div>
        </motion.article>

        {/* 05 - Verdict */}
        <motion.article {...beat} className="card-paper flex items-center gap-5 p-5">
          <motion.span
            {...stamp}
            className="flex size-20 shrink-0 items-center justify-center rounded-full bg-positive text-white"
          >
            <ShieldCheck className="size-10" strokeWidth={2} />
          </motion.span>
          <div>
            <Label n="05" title="Verdict" />
            <p className="mt-1.5 font-poster text-4xl leading-none text-positive">Safe to buy</p>
            <p className="mt-2 max-w-[28ch] text-sm text-ink-soft">
              This purchase fits within your plan. You&apos;re still on track.
            </p>
          </div>
        </motion.article>

        {/* 06 - Impact after purchase */}
        <motion.article {...beat} className="card-paper p-5">
          <Label n="06" title="Impact after purchase" />
          <div className="mt-3 space-y-2">
            {IMPACT.map((row) => (
              <ImpactRow key={row.label} {...row} />
            ))}
          </div>
        </motion.article>
      </Column>
    </motion.div>
  );
}
