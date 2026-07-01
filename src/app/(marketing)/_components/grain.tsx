import { cn } from "@/lib/utils";

// Fine dot-grid texture that overlays the dark panels. Purely decorative;
// the parent must be positioned (relative) for the absolute fill to anchor.
export function Grain({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 opacity-40", className)}
      style={{
        backgroundImage: "radial-gradient(rgba(248,245,238,0.06) 0.6px, transparent 0.6px)",
        backgroundSize: "6px 6px",
      }}
    />
  );
}
