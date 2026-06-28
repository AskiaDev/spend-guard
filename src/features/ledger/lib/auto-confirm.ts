import type { LedgerCandidate } from "@/lib/schemas/ledger";

export const AUTO_CONFIRM_THRESHOLD = 0.8;

export function isAutoConfirmEligible(candidate: LedgerCandidate): boolean {
  return (
    candidate.confidence >= AUTO_CONFIRM_THRESHOLD &&
    candidate.category !== "uncategorized" &&
    candidate.amount > 0 &&
    candidate.occurredAt !== null
  );
}
