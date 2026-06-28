import type { Metadata } from "next";

import { ImportWizard } from "@/features/ledger/components/import-wizard";

import { PageFrame } from "../_components/page-frame";

export const metadata: Metadata = {
  title: "Import | SpendGuard",
};

export default function ImportPage() {
  return (
    <PageFrame
      eyebrow="Ledger"
      title="Import transactions"
      description="Upload GCash, bank, or receipt screenshots. Review what we read, then save."
    >
      <ImportWizard />
    </PageFrame>
  );
}
