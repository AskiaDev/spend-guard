import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Financial safety disclaimer (PRD §28). Display-only: it never alters, gates,
 * or contradicts a §19 decision. The canonical PRD §28 string is not checked
 * into this repo, so this is a standard "educational, not advice" disclaimer
 * pending confirmation against the PRD.
 *
 * - `footer` (default): persistent, quiet landmark mounted app-wide.
 * - `inline`: a single compact line for the advisor surface (§11.8).
 */
export function FinancialDisclaimer({
  variant = "footer",
  className,
}: {
  variant?: "footer" | "inline";
  className?: string;
}) {
  if (variant === "inline") {
    return (
      <p className={cn("text-xs leading-5 text-muted-foreground", className)}>
        <span className="font-semibold text-foreground">Not financial advice.</span>{" "}
        This explanation is educational and based only on the numbers you entered.
      </p>
    );
  }

  return (
    <aside
      aria-label="Financial disclaimer"
      className={cn(
        "mt-8 flex items-start gap-2.5 border-t border-border pt-4 text-xs leading-5 text-muted-foreground",
        className
      )}
    >
      <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <p>
        SpendGuard offers educational estimates based on the figures you enter. It is not
        financial, investment, tax, or legal advice. A deterministic rules engine makes every
        decision; the AI advisor only explains it. For major financial decisions, consult a
        licensed professional.
      </p>
    </aside>
  );
}
