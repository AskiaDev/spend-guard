import type { Metadata } from "next";
import { ExpensesPageContent } from "../_components/page-adapters";
import { PageFrame } from "../_components/page-frame";

export const metadata: Metadata = {
  title: "Expenses | SpendGuard",
};

export default function ExpensesPage() {
  return (
    <PageFrame
      eyebrow="Committed cash"
      title="Expenses"
      description="Edit bills and recurring costs so the checker protects money already assigned."
    >
      <ExpensesPageContent />
    </PageFrame>
  );
}
