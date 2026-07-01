import type { Metadata } from "next";
import { DashboardGreetingTitle, DashboardPageContent } from "../_components/page-adapters";
import { PageFrame } from "../_components/page-frame";

export const metadata: Metadata = {
  title: "Dashboard | SpendGuard",
};

export default function DashboardPage() {
  return (
    <PageFrame
      title={<DashboardGreetingTitle />}
      description="Start with your safe-to-spend picture before making a purchase decision."
    >
      <DashboardPageContent />
    </PageFrame>
  );
}
