import { cn } from "@/lib/utils";

export function Brandmark({
  showTagline = false,
  inverse = false,
}: {
  showTagline?: boolean;
  inverse?: boolean;
}) {
  return (
    <span className="flex items-center gap-3">
      <span className="flex size-11 items-center justify-center rounded-lg bg-brand font-poster text-2xl leading-none text-ink">
        SG
      </span>
      <span className={cn("flex-col leading-none", showTagline ? "hidden sm:flex" : "flex")}>
        <span
          className={cn(
            "font-poster text-2xl tracking-tight",
            inverse ? "text-ink-inverse" : "text-ink",
          )}
        >
          SpendGuard
        </span>
        {showTagline ? (
          <span
            className={cn(
              "font-ledger text-[10px] uppercase tracking-[0.18em]",
              inverse ? "text-ink-inverse/55" : "text-ink-faint",
            )}
          >
            See the real tradeoff
          </span>
        ) : null}
      </span>
    </span>
  );
}
