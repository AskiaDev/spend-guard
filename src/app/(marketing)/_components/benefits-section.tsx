"use client";

import { useRef, useState } from "react";
import { motion, type Variants } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Gauge,
  Lock,
  Scale,
  Shield,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CountUp } from "./count-up";
import { Grain } from "./grain";
import { useReveal } from "./motion";
import { Sparkline } from "./spark-line";

const CLARITY_DATA = [40, 44, 38, 50, 46, 55, 51, 60, 57, 66, 62, 70, 67, 74, 80, 77, 88, 95];
const RISK_DATA = [30, 26, 34, 24, 38, 28, 42, 32, 46, 36, 44, 40, 48, 42, 50, 46, 54, 58];

const COMPARE = [
  { label: "Safe-to-spend", a: "₱40", b: "₱980" },
  { label: "Cash after bills", a: "₱110", b: "₱1,050" },
  { label: "Savings impact", a: "-1.2%", b: "+0.9%" },
  { label: "Clarity index", a: "68", b: "86" },
] as const;

const ASSURANCES = [
  {
    icon: Lock,
    title: "Your data. Your control.",
    desc: "Bank-level security. You decide what stays private.",
  },
  { icon: Users, title: "Built for real life.", desc: "No jargon. No judgement. Just clarity." },
  { icon: Zap, title: "Real-time, always.", desc: "Live updates. Always up to date." },
] as const;

const CARD_BASE = "snap-center shrink-0 basis-[86%] sm:basis-[47%] lg:basis-auto";

// Reveal props passed down to card roots so stagger propagates from the scroller.
type MotionProps = {
  variants?: Variants;
  initial?: string | false;
  whileInView?: string;
  viewport?: { once?: boolean; amount?: number };
};

// 270deg gauge for "share of monthly income". Paper card, so lime uses brand-dark.
function IncomeGauge({ percent }: { percent: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const track = 0.75 * c;
  const value = track * (percent / 100);
  return (
    <div className="relative size-[132px] shrink-0">
      <svg viewBox="0 0 120 120" className="size-full" aria-hidden="true">
        <g transform="rotate(135 60 60)">
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="var(--color-hair)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${track} ${c}`}
          />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="var(--color-brand-dark)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${value} ${c}`}
          />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center leading-none">
        <CountUp to={percent} format={(v) => `${Math.round(v)}%`} className="font-poster text-2xl text-ink" />
        <span className="mt-1 font-ledger text-[10px] uppercase tracking-[0.08em] text-ink-faint">
          of monthly income
        </span>
      </div>
    </div>
  );
}

function CardHead({
  n,
  icon: Icon,
  dark,
}: {
  n: string;
  icon: typeof Shield;
  dark?: boolean;
}) {
  return (
    <div className="flex items-start justify-between">
      <span className={cn("font-ledger text-sm font-bold", dark ? "text-brand" : "text-ink-faint")}>
        {n}
      </span>
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-lg border",
          dark ? "border-slate-line text-brand" : "border-hair text-ink",
        )}
      >
        <Icon className="size-5" strokeWidth={2} />
      </span>
    </div>
  );
}

function ClarityIndex({ motionProps }: { motionProps: MotionProps }) {
  return (
    <motion.div {...motionProps} className="card-slate w-full max-w-md p-6 lg:w-[360px]">
      <div className="flex items-center justify-between">
        <span className="font-ledger text-xs font-bold uppercase tracking-[0.12em] text-ink-inverse/80">
          Clarity index
        </span>
        <span className="flex items-center gap-1.5 font-ledger text-[10px] uppercase tracking-[0.12em] text-ink-inverse/60">
          Live
          <span className="size-1.5 rounded-full bg-brand shadow-[0_0_0_3px_rgba(184,242,12,0.25)]" />
        </span>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <CountUp to={82} format={(v) => `${Math.round(v)}`} className="font-poster text-6xl leading-none text-brand" />
        <span className="font-ledger text-lg text-ink-inverse/50">/ 100</span>
      </div>
      <p className="mt-1 font-ledger text-sm text-brand">Strong financial clarity</p>

      <Sparkline
        className="mt-5 h-32"
        data={CLARITY_DATA}
        yLabels={["100", "75", "50", "25", "0"]}
        xLabels={["30D AGO", "15D AGO", "TODAY"]}
      />

      <p className="mt-4 flex items-center gap-2 font-ledger text-xs text-ink-inverse/70">
        <ArrowUpRight className="size-4 text-brand" strokeWidth={2.5} />
        <span className="font-bold text-brand">+18 pts</span> vs 15 days ago
      </p>
    </motion.div>
  );
}

function CardProtect({ motionProps }: { motionProps: MotionProps }) {
  return (
    <motion.article {...motionProps} className={cn("card-slate flex flex-col p-6", CARD_BASE)}>
      <CardHead n="01" icon={Shield} dark />
      <h3 className="mt-5 font-poster text-xl uppercase leading-[0.95] text-ink-inverse">
        Protect
        <br />
        what matters
      </h3>
      <p className="mt-3 font-ledger text-sm leading-relaxed text-ink-inverse/65">
        We monitor what matters most and alert you early.
      </p>

      <div className="mt-6 flex items-center justify-between">
        <span className="font-ledger text-[11px] font-bold uppercase tracking-[0.12em] text-brand">
          Risk monitor
        </span>
        <span className="rounded-full bg-brand/15 px-2.5 py-1 font-ledger text-[10px] font-bold uppercase tracking-[0.08em] text-brand">
          Low risk
        </span>
      </div>

      <Sparkline
        className="mt-4 h-28"
        data={RISK_DATA}
        yLabels={["HIGH", "MED", "LOW"]}
        xLabels={["30D AGO", "15D AGO", "TODAY"]}
      />

      <div className="mt-auto flex items-center gap-2 rounded-xl border border-slate-line px-4 py-3 pt-6 font-ledger text-sm text-ink-inverse">
        <CircleCheck className="size-4 shrink-0 text-brand" strokeWidth={2.25} />
        All accounts protected
      </div>
    </motion.article>
  );
}

function CardSafeToSpend({ motionProps }: { motionProps: MotionProps }) {
  return (
    <motion.article {...motionProps} className={cn("card-paper flex flex-col p-6", CARD_BASE)}>
      <CardHead n="02" icon={Gauge} />
      <h3 className="mt-5 font-poster text-xl uppercase leading-[0.95] text-ink">
        Know your
        <br />
        safe-to-spend
      </h3>
      <p className="mt-3 font-ledger text-sm leading-relaxed text-ink-soft">
        See exactly how much you can spend&mdash;without second guessing.
      </p>

      <div className="mt-5 border-t border-hair pt-5">
        <p className="font-ledger text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
          Safe-to-spend
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div>
            <CountUp
              to={1240}
              format={(v) => `₱${Math.round(v).toLocaleString("en-PH")}`}
              className="block font-poster text-4xl leading-none text-ink"
            />
            <p className="mt-1.5 font-ledger text-xs text-ink-faint">Updated just now</p>
          </div>
          <IncomeGauge percent={73} />
        </div>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-3 border-t border-hair pt-4">
        <div>
          <p className="font-ledger text-[11px] uppercase tracking-[0.08em] text-ink-faint">
            Monthly income
          </p>
          <p className="mt-0.5 font-ledger text-sm font-bold text-ink">₱6,200</p>
        </div>
        <div className="text-right">
          <p className="font-ledger text-[11px] uppercase tracking-[0.08em] text-ink-faint">
            Essential bills
          </p>
          <p className="mt-0.5 font-ledger text-sm font-bold text-ink">₱2,960</p>
        </div>
      </div>
    </motion.article>
  );
}

function CardTradeoff({ motionProps }: { motionProps: MotionProps }) {
  return (
    <motion.article {...motionProps} className={cn("card-paper flex flex-col p-6", CARD_BASE)}>
      <CardHead n="03" icon={Scale} />
      <h3 className="mt-5 font-poster text-xl uppercase leading-[0.95] text-ink">
        See the
        <br />
        tradeoff
      </h3>
      <p className="mt-3 font-ledger text-sm leading-relaxed text-ink-soft">
        Compare choices side-by-side and see the real impact.
      </p>

      <div className="mt-5 border-t border-hair pt-5">
        <p className="font-ledger text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
          Scenario comparison
        </p>
        <table className="mt-3 w-full border-collapse font-ledger text-xs">
          <thead>
            <tr className="text-ink-faint">
              <th />
              <th className="pb-2 text-right font-semibold">
                Take Vacation
                <span className="block font-normal text-negative">-₱1,200</span>
              </th>
              <th className="rounded-t-md bg-brand-soft/25 px-2 pb-2 pt-1 text-right font-semibold text-ink">
                Home Upgrade
                <span className="block font-normal text-positive">-₱1,200</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARE.map(({ label, a, b }, i) => (
              <tr key={label} className={i > 0 ? "border-t border-hair/70" : ""}>
                <td className="py-1.5 text-ink-soft">{label}</td>
                <td className="py-1.5 text-right font-semibold text-negative">{a}</td>
                <td className="bg-brand-soft/25 px-2 py-1.5 text-right font-semibold text-positive">
                  {b}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-hair pt-4">
        <span className="font-ledger text-xs font-semibold text-ink">Better choice</span>
        <span className="rounded-full bg-brand px-3 py-1 font-ledger text-[10px] font-bold uppercase tracking-[0.06em] text-ink">
          Home Upgrade
        </span>
      </div>
    </motion.article>
  );
}

function CardVerdict({ motionProps }: { motionProps: MotionProps }) {
  return (
    <motion.article {...motionProps} className={cn("card-paper flex flex-col p-6", CARD_BASE)}>
      <CardHead n="04" icon={CircleCheck} />
      <h3 className="mt-5 font-poster text-xl uppercase leading-[0.95] text-ink">
        Get a clear
        <br />
        verdict
      </h3>
      <p className="mt-3 font-ledger text-sm leading-relaxed text-ink-soft">
        One clear answer. Backed by your numbers.
      </p>

      <div className="mt-5 border-t border-hair pt-5">
        <p className="font-ledger text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">
          Today&apos;s verdict
        </p>
        <div className="mt-3 flex items-center gap-2.5 rounded-full bg-brand px-5 py-3 font-poster text-lg uppercase tracking-wide text-ink">
          <Check className="size-5" strokeWidth={3} />
          Good to spend
        </div>
        <p className="mt-3 font-ledger text-sm leading-relaxed text-ink-soft">
          This purchase fits your plan. You&apos;re still on track.
        </p>
      </div>

      <div className="mt-auto pt-5">
        <div className="flex items-center justify-between">
          <span className="font-ledger text-[11px] uppercase tracking-[0.08em] text-ink-faint">
            Confidence
          </span>
          <span className="font-ledger text-sm font-bold text-brand-dark">High</span>
        </div>
        <div className="mt-2 flex gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={cn("h-1.5 flex-1 rounded-full", i < 4 ? "bg-brand-dark" : "bg-hair")}
            />
          ))}
        </div>
        <a
          href="/signup"
          className="mt-4 inline-flex items-center gap-1.5 font-ledger text-xs font-bold uppercase tracking-[0.06em] text-ink"
        >
          View details
          <ArrowRight className="size-3.5" strokeWidth={2.5} />
        </a>
      </div>
    </motion.article>
  );
}

export function BenefitsSection() {
  const { flow, beat } = useReveal(0.15);

  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const step = () => {
    const el = scroller.current;
    if (!el || el.children.length < 2) return 0;
    const a = el.children[0] as HTMLElement;
    const b = el.children[1] as HTMLElement;
    return b.offsetLeft - a.offsetLeft;
  };

  const goTo = (i: number) => {
    const el = scroller.current;
    const s = step();
    if (!el || s <= 0) return;
    const clamped = Math.max(0, Math.min(3, i));
    el.scrollTo({ left: s * clamped, behavior: "smooth" });
  };

  const onScroll = () => {
    const s = step();
    const el = scroller.current;
    if (!el || s <= 0) return;
    setActive(Math.round(el.scrollLeft / s));
  };

  return (
    <section
      id="product"
      className="mx-auto w-full max-w-[1680px] scroll-mt-6 overflow-hidden rounded-[28px] border border-hair bg-paper-soft/60"
    >
      {/* Dark band: the thesis + the live signal */}
      <div
        className="relative overflow-hidden px-6 py-8 sm:px-10 sm:py-12"
        style={{
          background:
            "radial-gradient(circle at 85% 12%, rgba(184,242,12,0.10), transparent 40%), linear-gradient(160deg, #101412 0%, #090b0a 100%)",
        }}
      >
        <Grain />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-6 top-40 hidden flex-col gap-6 font-ledger text-xs text-ink-inverse/20 xl:flex"
        >
          {["+1.23%", "-0.89%", "+0.57%", "+1.01%", "-0.34%"].map((v) => (
            <span key={v}>{v}</span>
          ))}
        </div>

        <div className="relative flex items-center gap-4">
          <span className="font-ledger text-xs uppercase tracking-[0.14em] text-ink-inverse sm:text-sm">
            <span className="text-brand">05</span> / Benefits &amp; features
          </span>
          <span className="h-px flex-1 bg-slate-line" />
        </div>

        <div className="relative mt-10 grid gap-10 lg:grid-cols-[1fr_auto] lg:items-start">
          <motion.div {...flow}>
            <motion.h2
              {...beat}
              className="font-poster text-[clamp(2.75rem,6vw,6rem)] uppercase leading-[0.85] tracking-[-0.01em]"
            >
              <span className="block text-ink-inverse">More clarity.</span>
              <span className="block text-brand">Less guesswork.</span>
            </motion.h2>
            <motion.p
              {...beat}
              className="mt-6 max-w-md font-ledger text-sm leading-relaxed text-ink-inverse/70"
            >
              SpendGuard turns your financial noise into clear signals you can act on.
            </motion.p>
          </motion.div>

          <ClarityIndex motionProps={flow} />
        </div>
      </div>

      {/* Seam: dark band dips into a rounded tab over the paper, lime chevron cue.
          Lives in a 0-height seam at z-2 so the dark tongue paints over the paper. */}
      <div className="relative z-[2] flex h-0 justify-center" aria-hidden="true">
        <div className="relative -translate-y-px">
          <svg width="240" height="40" viewBox="0 0 240 40" fill="#090b0a" className="block">
            <path d="M0 0 C 56 0 72 36 110 36 L 130 36 C 168 36 184 0 240 0 Z" />
          </svg>
          <ChevronDown
            className="absolute left-1/2 top-2 size-5 -translate-x-1/2 text-brand"
            strokeWidth={2.5}
          />
        </div>
      </div>

      {/* Paper zone: the four features + assurances */}
      <div className="ledger-sheet px-6 py-12 sm:px-10">
        <div className="relative">
          <button
            type="button"
            onClick={() => goTo(active - 1)}
            aria-label="Previous feature"
            className="absolute -left-1 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-hair bg-paper-soft text-ink shadow-[0_8px_20px_rgba(20,18,14,0.1)] disabled:opacity-30 lg:hidden"
            disabled={active === 0}
          >
            <ChevronLeft className="size-5" strokeWidth={2.5} />
          </button>

          <motion.div
            ref={scroller}
            onScroll={onScroll}
            {...flow}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:pb-0"
            style={{ scrollbarWidth: "none" }}
          >
            <CardProtect motionProps={beat} />
            <CardSafeToSpend motionProps={beat} />
            <CardTradeoff motionProps={beat} />
            <CardVerdict motionProps={beat} />
          </motion.div>

          <button
            type="button"
            onClick={() => goTo(active + 1)}
            aria-label="Next feature"
            className="absolute -right-1 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-hair bg-paper-soft text-ink shadow-[0_8px_20px_rgba(20,18,14,0.1)] disabled:opacity-30 lg:hidden"
            disabled={active === 3}
          >
            <ChevronRight className="size-5" strokeWidth={2.5} />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 lg:hidden">
          {[0, 1, 2, 3].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to feature ${i + 1}`}
              className={cn(
                "h-2 rounded-full transition-all",
                i === active ? "w-6 bg-brand-dark" : "w-2 bg-hair",
              )}
            />
          ))}
        </div>

        <div className="mt-12 grid gap-8 border-t border-hair pt-10 sm:grid-cols-3">
          {ASSURANCES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-paper-muted text-ink">
                <Icon className="size-5" strokeWidth={2} />
              </span>
              <div>
                <p className="font-ledger text-sm font-bold uppercase tracking-[0.06em] text-ink">
                  {title}
                </p>
                <p className="mt-1 font-ledger text-sm leading-relaxed text-ink-soft">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
