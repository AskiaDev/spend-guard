import { cn } from "@/lib/utils";

const tones = {
  green: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  amber: "bg-amber-100 text-amber-900 ring-amber-200",
  red: "bg-rose-100 text-rose-900 ring-rose-200",
  zinc: "bg-zinc-100 text-zinc-800 ring-zinc-200",
};

export function Badge({
  children,
  tone = "zinc",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center whitespace-nowrap rounded-md px-2.5 text-xs font-semibold ring-1",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
