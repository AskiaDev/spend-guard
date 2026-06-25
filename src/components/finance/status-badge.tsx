import { CircleX, Clock3, ShieldCheck, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PurchaseDecision } from "@/types/finance";

export const decisionLabels: Record<PurchaseDecision, string> = {
  SAFE_TO_BUY: "Safe to Buy",
  BUY_WITH_CAUTION: "Buy with Caution",
  WAIT: "Wait",
  NOT_RECOMMENDED: "Not Recommended",
};

const decisionPresentation = {
  SAFE_TO_BUY: { Icon: ShieldCheck, variant: "safe" },
  BUY_WITH_CAUTION: { Icon: TriangleAlert, variant: "caution" },
  WAIT: { Icon: Clock3, variant: "caution" },
  NOT_RECOMMENDED: { Icon: CircleX, variant: "risk" },
} as const satisfies Record<
  PurchaseDecision,
  { Icon: typeof ShieldCheck; variant: "safe" | "caution" | "risk" }
>;

export interface StatusBadgeProps {
  decision: PurchaseDecision;
  className?: string;
}

export function StatusBadge({ decision, className }: StatusBadgeProps) {
  const { Icon, variant } = decisionPresentation[decision];

  return (
    <Badge variant={variant} className={cn("gap-1.5", className)}>
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      {decisionLabels[decision]}
    </Badge>
  );
}
