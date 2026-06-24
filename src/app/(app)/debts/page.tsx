import type { Metadata } from "next";
import { DebtsPageContent } from "../_components/page-adapters";
import { PageFrame } from "../_components/page-frame";

export const metadata: Metadata = {
  title: "Debts | SpendGuard",
};

export default function DebtsPage() {
  return (
    <PageFrame
      eyebrow="Debt pressure"
      title="Debts"
      description="Keep balances, minimums, and due dates current for the 30-day debt window."
    >
      <DebtsPageContent />
    </PageFrame>
  );
}
