import { ArrowRight, ChevronRight, Clock, Hand, Headphones, House, ShieldCheck, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { Donut } from "./donut";

const STEPS = [
  { n: "01", label: "You ask" },
  { n: "02", label: "We protect" },
  { n: "03", label: "We calculate" },
  { n: "04", label: "You decide" },
] as const;

const PROTECT = [
  { icon: House, label: "Bills", amount: "$1,450.00", chip: "bg-positive text-white" },
  { icon: ShieldCheck, label: "Debt", amount: "$1,120.00", chip: "bg-positive-soft text-positive" },
  { icon: Target, label: "Goals", amount: "$600.00", chip: "bg-warning text-ink" },
  { icon: ShieldCheck, label: "Emergency Buffer", amount: "$1,500.00", chip: "bg-positive text-white" },
] as const;

// Literal classes so Tailwind keeps them; gap centers between 4 equal columns.
const GAPS = ["left-[25%]", "left-1/2", "left-[75%]"] as const;

function StepHead({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <span className="relative z-10 flex size-12 items-center justify-center rounded-full border-2 border-brand-dark bg-brand font-poster text-xl leading-none text-ink shadow-[0_4px_10px_rgba(20,18,14,0.14)]">
        {n}
      </span>
      <span className="font-poster text-lg uppercase tracking-wide text-ink">{label}</span>
    </div>
  );
}

function AskCard() {
  return (
    <article className="card-paper flex flex-col p-5">
      <p className="font-semibold leading-snug text-ink">Thinking about this purchase?</p>
      <div className="mt-4 flex gap-3">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-paper-muted text-ink-soft">
          <Headphones className="size-8" strokeWidth={1.5} />
        </span>
        <div>
          <p className="font-semibold text-ink">Apple AirPods Max</p>
          <p className="text-sm text-ink-faint">Space Gray</p>
          <p className="mt-2 font-ledger text-xl font-bold text-ink">$549.00</p>
        </div>
      </div>
      <div className="mt-auto rounded-xl bg-brand py-3 text-center font-ledger text-sm font-bold uppercase tracking-[0.06em] text-ink">
        Check if it&apos;s safe
      </div>
    </article>
  );
}

function ProtectCard() {
  return (
    <article className="card-paper flex flex-col p-5">
      <p className="font-semibold leading-snug text-ink">We lock in what matters most.</p>
      <div className="mt-4 space-y-2.5">
        {PROTECT.map(({ icon: Icon, label, amount, chip }) => (
          <div
            key={label}
            className="flex items-center gap-2.5 rounded-lg border border-hair bg-paper px-2.5 py-2"
          >
            <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", chip)}>
              <Icon className="size-4" strokeWidth={2.25} />
            </span>
            <span className="text-sm text-ink-soft">{label}</span>
            <span className="ml-auto font-ledger text-sm font-medium text-ink">{amount}</span>
          </div>
        ))}
      </div>
      <p className="mt-auto pt-4 text-center font-ledger text-xs italic text-ink-faint">
        These are protected first.
      </p>
    </article>
  );
}

function CalculateCard() {
  return (
    <article className="card-slate flex flex-col p-5">
      <p className="font-ledger text-xs font-semibold uppercase tracking-[0.12em] text-ink-inverse/70">
        Safe-to-spend
      </p>
      <p className="mt-2 font-poster text-[clamp(2rem,2.4vw,2.75rem)] leading-none text-brand">
        $2,292.63
      </p>
      <p className="mt-3 text-sm leading-snug text-ink-inverse/65">
        This is your flexibility. Use it intentionally.
      </p>
      <div className="mt-auto flex justify-center pt-5">
        <Donut />
      </div>
    </article>
  );
}

function DecideCard() {
  return (
    <article className="card-paper flex flex-col p-5 text-center">
      <p className="text-left font-ledger text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
        Verdict
      </p>
      <span className="mx-auto mt-3 flex size-16 items-center justify-center rounded-full bg-warning text-white">
        <Clock className="size-9" strokeWidth={2} />
      </span>
      <p className="mt-4 font-poster text-2xl uppercase leading-[0.95] text-ink">Waiting is the safer move</p>
      <p className="mt-3 text-sm leading-snug text-ink-soft">
        Your flexibility is tight right now. Focus on your priorities.
      </p>
      <div className="mt-auto flex items-center justify-between rounded-xl border border-hair px-4 py-3 font-ledger text-xs font-bold uppercase tracking-[0.06em] text-ink">
        View details
        <ArrowRight className="size-4" strokeWidth={2.5} />
      </div>
    </article>
  );
}

export function SolutionFlow() {
  return (
    <div>
      {/* The pipeline: ask -> protect -> calculate -> decide */}
      <div className="relative mb-6 hidden lg:block">
        <span className="absolute left-[12.5%] right-[12.5%] top-6 h-[3px] -translate-y-1/2 rounded bg-brand" />
        {GAPS.map((pos) => (
          <ChevronRight
            key={pos}
            className={cn(
              "absolute top-6 size-5 -translate-x-1/2 -translate-y-1/2 text-brand-dark",
              pos,
            )}
            strokeWidth={3}
          />
        ))}
        <div className="grid grid-cols-4">
          {STEPS.map((s) => (
            <StepHead key={s.n} n={s.n} label={s.label} />
          ))}
        </div>
      </div>

      {/* Cards, equal height so the connector arrows land at their shared middle */}
      <div className="relative">
        <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <AskCard />
          <ProtectCard />
          <CalculateCard />
          <DecideCard />
        </div>
        {GAPS.map((pos) => (
          <span
            key={pos}
            className={cn(
              "absolute top-1/2 hidden size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-hair bg-paper-soft text-ink shadow-[0_8px_20px_rgba(20,18,14,0.12)] lg:flex",
              pos,
            )}
          >
            <ArrowRight className="size-4" strokeWidth={2.5} />
          </span>
        ))}
      </div>

      <p className="mt-4 hidden items-center gap-2 font-ledger text-xs text-ink-faint lg:flex">
        <Hand className="size-4" strokeWidth={2} />
        Swipe to see how we decide
      </p>
    </div>
  );
}
