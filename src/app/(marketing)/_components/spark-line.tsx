import { cn } from "@/lib/utils";

// Tiny normalized line chart for the dark cards (clarity index + risk monitor).
// preserveAspectRatio="none" stretches the path to fill; the stroke stays crisp
// via non-scaling-stroke and the end dot is placed in % so it never distorts.
export function Sparkline({
  data,
  yLabels,
  xLabels,
  className,
}: {
  data: number[];
  yLabels: string[];
  xLabels: string[];
  className?: string;
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const pts = data.map((d, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: 100 - ((d - min) / span) * 100,
  }));
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const last = pts[pts.length - 1];

  return (
    <div className={cn("grid grid-cols-[1.75rem_1fr] grid-rows-[1fr_auto] gap-x-2", className)}>
      <div className="flex flex-col justify-between py-0.5 text-right font-ledger text-[9px] leading-none text-ink-inverse/40">
        {yLabels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>

      <div className="relative">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full"
          aria-hidden="true"
        >
          {[0, 50, 100].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="var(--color-slate-line)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path
            d={line}
            fill="none"
            stroke="var(--color-brand)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span
          className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand shadow-[0_0_0_4px_rgba(184,242,12,0.2)]"
          style={{ left: `${last.x}%`, top: `${last.y}%` }}
        />
      </div>

      <div />
      <div className="flex justify-between font-ledger text-[9px] leading-none text-ink-inverse/40">
        {xLabels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  );
}
