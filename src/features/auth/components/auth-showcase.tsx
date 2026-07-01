import { CircleCheck, ShieldCheck, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { n: 1, title: "You're about to spend", detail: "$129.00 on new headphones" },
  { n: 2, title: "We run the checks", detail: "Budget, savings, and risk, in seconds" },
  { n: 3, title: "You get a clear verdict", detail: "Buy, wait, or rethink, before you buy" },
] as const;

function Steps() {
  return (
    <ol className="relative space-y-6">
      <span
        aria-hidden="true"
        className="absolute top-3 bottom-3 left-[15px] w-px border-l border-dashed border-brand-dark/45"
      />
      {STEPS.map(({ n, title, detail }) => (
        <li key={n} className="relative flex gap-4">
          <span className="z-[1] flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-brand-dark bg-paper-soft text-sm font-bold text-brand-dark ring-4 ring-paper-soft">
            {n}
          </span>
          <div className="pt-0.5">
            <p className="font-semibold leading-snug text-ink">{title}</p>
            <p className="mt-0.5 text-sm leading-snug text-ink-soft">{detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function VerdictRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between border-t border-white/10 py-2.5 text-sm first:border-t-0 first:pt-0">
      <span className="text-ink-inverse/55">{label}</span>
      <span className={cn("font-semibold text-ink-inverse", valueClass)}>{value}</span>
    </div>
  );
}

// The product's actual output, rendered as a live check - the auth page's signature.
function PurchaseCheckCard() {
  return (
    <div className="card-slate animate-in fade-in slide-in-from-bottom-4 delay-200 duration-700 p-5">
      <div className="flex items-center justify-between">
        <span className="font-ledger text-[11px] font-bold uppercase tracking-[0.1em] text-ink-inverse/60">
          Purchase check
        </span>
        <span className="inline-flex items-center gap-1.5 font-ledger text-[10px] font-bold uppercase tracking-[0.12em] text-brand">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-brand" />
          </span>
          Live
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-brand/40 text-brand">
          <ShoppingBag className="size-5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-inverse">Wireless Headphones</p>
          <p className="font-ledger text-xs text-ink-inverse/50">Amazon</p>
        </div>
        <p className="font-poster text-xl leading-none text-ink-inverse">$129</p>
      </div>

      <div className="mt-4 rounded-xl border border-brand/25 bg-brand/[0.07] p-4">
        <div className="flex items-center gap-2.5">
          <CircleCheck className="size-5 shrink-0 text-brand" strokeWidth={2} />
          <div>
            <p className="font-poster text-lg leading-none text-brand">Safe to spend</p>
            <p className="mt-1 text-xs text-ink-inverse/70">This purchase fits your budget.</p>
          </div>
        </div>

        <div className="mt-4">
          <VerdictRow label="Impact on budget" value="Low" />
          <VerdictRow label="Monthly budget left" value="$1,340" />
          <VerdictRow label="Savings on track" value="Yes" valueClass="text-brand" />
        </div>
      </div>
    </div>
  );
}

function ProtectedMoney() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-hair bg-white/70 px-5 py-4 shadow-[0_10px_30px_rgba(20,18,14,0.06)]">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
        <ShieldCheck className="size-5" strokeWidth={2} />
      </span>
      <div>
        <p className="font-ledger text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft">
          Protected money
        </p>
        <p className="font-ledger text-xs text-ink-faint">This month</p>
      </div>
      <p className="ml-auto font-poster text-2xl leading-none text-brand-dark">$487.32</p>
      <svg
        aria-hidden="true"
        viewBox="0 0 96 32"
        className="hidden h-8 w-24 shrink-0 sm:block"
        fill="none"
      >
        <polyline
          points="2,26 16,22 30,24 44,15 58,18 72,8 94,4"
          stroke="var(--color-brand-dark)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// The paper "brand promise" half of the split screen. Kept as a server
// component so this static demo stays out of the client bundle.
export function AuthShowcase() {
  return (
    <div className="ledger-sheet relative hidden flex-col justify-center gap-9 bg-paper-soft/70 px-10 py-14 lg:flex xl:px-16">
      <div>
        <span className="inline-flex items-center gap-2 font-ledger text-xs font-bold uppercase tracking-[0.14em] text-ink-soft">
          <span className="size-2 rounded-full bg-brand-dark" />
          SpendGuard verdict
        </span>
        <h2 className="mt-4 font-poster text-[clamp(2rem,3.2vw,3.25rem)] uppercase leading-[0.9] tracking-[-0.005em] text-ink">
          <span className="block">Every purchase.</span>
          <span className="block">Every decision.</span>
          <span className="block text-brand-dark">Protected.</span>
        </h2>
        <p className="mt-5 max-w-md text-base leading-relaxed text-ink-soft">
          We analyze. You decide. Spend with confidence knowing your money is working for your
          future.
        </p>
      </div>

      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
        <Steps />
        <PurchaseCheckCard />
      </div>

      <ProtectedMoney />
    </div>
  );
}
