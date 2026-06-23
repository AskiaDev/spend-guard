import type { Metadata } from "next";
import { GoalsPageContent } from "../_components/page-adapters";
import { PageFrame } from "../_components/page-frame";

export const metadata: Metadata = {
  title: "Goals | SpendGuard",
};

export default function GoalsPage() {
  return (
    <PageFrame
      eyebrow="Savings plan"
      title="Savings goals"
      description="Review every target, monthly contribution, and safe-buy date before flexible spending wins."
    >
      <GoalsPageContent />
    </PageFrame>
  );
}
