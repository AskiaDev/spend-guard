import type { Metadata } from "next";
import { PurchaseResultPageContent } from "../../_components/page-adapters";
import { PageFrame } from "../../_components/page-frame";

export const metadata: Metadata = {
  title: "Purchase Result | SpendGuard",
};

export default function PurchaseCheckerResultPage() {
  return (
    <PageFrame
      eyebrow="Latest recommendation"
      title="Purchase Checker"
      description="Review the latest purchase decision and choose the next safe action."
    >
      <PurchaseResultPageContent />
    </PageFrame>
  );
}
