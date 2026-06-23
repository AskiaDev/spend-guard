import type { Metadata } from "next";
import { ReportsPageContent } from "../_components/page-adapters";
import { PageFrame } from "../_components/page-frame";

export const metadata: Metadata = {
  title: "Weekly Advisor Report | SpendGuard",
};

export default function ReportsPage() {
  return (
    <PageFrame
      eyebrow="Weekly reflection"
      title="Weekly Advisor Report"
      description="Review the latest local report, reference insights, and the next action for safer purchase decisions."
    >
      <ReportsPageContent />
    </PageFrame>
  );
}
