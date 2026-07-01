import { Activity, ArrowDown, Clock, RefreshCw, ShieldCheck } from "lucide-react";

const COSTS = [
  { icon: ArrowDown, title: "Bills get tight", body: "You end up choosing which bills to pay first." },
  { icon: Clock, title: "Goals get delayed", body: "Your dream items keep moving further away." },
  { icon: Activity, title: "Stress goes up", body: "Money becomes a constant mental load." },
  { icon: RefreshCw, title: "The cycle repeats", body: "Guilt, reset, promise, repeat." },
] as const;

function GlobeWire() {
  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden="true"
      className="pointer-events-none absolute -right-6 top-1/2 hidden h-[150%] -translate-y-1/2 text-hair-strong/40 lg:block"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.75"
    >
      <circle cx="100" cy="100" r="78" />
      <ellipse cx="100" cy="100" rx="30" ry="78" />
      <ellipse cx="100" cy="100" rx="58" ry="78" />
      <ellipse cx="100" cy="100" rx="78" ry="34" />
      <ellipse cx="100" cy="100" rx="78" ry="62" />
      <line x1="22" y1="100" x2="178" y2="100" />
      <line x1="100" y1="22" x2="100" y2="178" />
    </svg>
  );
}

export function RealCost() {
  return (
    <div className="space-y-4">
      {/* The cost of buying blind - dark statement */}
      <div className="card-slate px-6 py-7 sm:px-10">
        <div className="mb-7 flex items-center gap-4">
          <span className="hidden h-px flex-1 border-t border-dashed border-white/20 sm:block" />
          <h3 className="text-center font-ledger text-xs font-semibold uppercase tracking-[0.18em] text-brand sm:text-sm">
            The real cost of buying without clarity
          </h3>
          <span className="hidden h-px flex-1 border-t border-dashed border-white/20 sm:block" />
        </div>

        <div className="grid gap-x-6 gap-y-7 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-white/10">
          {COSTS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-4 lg:px-6 lg:first:pl-0">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-brand">
                <Icon className="size-6" strokeWidth={2} />
              </span>
              <div>
                <p className="font-semibold text-ink-inverse">{title}</p>
                <p className="mt-1 text-sm leading-snug text-ink-inverse/60">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* The turn - you deserve clarity */}
      <div className="card-paper relative flex items-center gap-5 overflow-hidden px-7 py-6 sm:px-10">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand text-ink">
          <ShieldCheck className="size-8" strokeWidth={2} />
        </span>
        <div className="text-lg leading-snug text-ink sm:text-xl">
          <p>You deserve better than guessing.</p>
          <p>
            You deserve <span className="font-semibold text-brand-dark">clarity</span> before you buy.
          </p>
        </div>
        <GlobeWire />
      </div>
    </div>
  );
}
