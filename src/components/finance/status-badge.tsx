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
  SAFE_TO_BUY: { Icon: ShieldCheck, tone: "green" },
  BUY_WITH_CAUTION: { Icon: TriangleAlert, tone: "amber" },
  WAIT: { Icon: Clock3, tone: "amber" },
  NOT_RECOMMENDED: { Icon: CircleX, tone: "red" },
} as const satisfies Record<
  PurchaseDecision,
  { Icon: typeof ShieldCheck; tone: "green" | "amber" | "red" }
>;

export interface StatusBadgeProps {
  decision: PurchaseDecision;
  className?: string;
}

export function StatusBadge({ decision, className }: StatusBadgeProps) {
  const { Icon, tone } = decisionPresentation[decision];

  return (
    <Badge tone={tone} className={cn("gap-1.5", className)}>
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      {decisionLabels[decision]}
    </Badge>
  );
}
