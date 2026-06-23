import type { Metadata } from "next";
import { PurchaseCheckerPageContent } from "../_components/page-adapters";
import { PageFrame } from "../_components/page-frame";

export const metadata: Metadata = {
  title: "Purchase Checker | SpendGuard",
};

export default function PurchaseCheckerPage() {
  return (
    <PageFrame
      eyebrow="Decision support"
      title="Purchase Checker"
      description="Check affordability, understand the reasons, and turn decisions into goals or cooldowns."
    >
      <PurchaseCheckerPageContent />
    </PageFrame>
  );
}
