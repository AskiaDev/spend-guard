import { cn } from "@/lib/utils";

const tones = {
  green: "bg-safe/10 text-safe ring-safe/20",
  amber: "bg-caution/10 text-caution ring-caution/20",
  red: "bg-risk/10 text-risk ring-risk/20",
  zinc: "bg-slate-100 text-slate-700 ring-border",
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
        "inline-flex h-7 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-semibold ring-1",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
