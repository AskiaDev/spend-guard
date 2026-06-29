import type { Metadata } from "next";

import { listLedgerTransactionsAction } from "@/features/ledger/api/manage-transactions";
import { ImportWizard } from "@/features/ledger/components/import-wizard";
import { TransactionsPanel } from "@/features/ledger/components/transactions-panel";

import { PageFrame } from "../_components/page-frame";

export const metadata: Metadata = {
  title: "Import | SpendGuard",
};

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const query = await searchParams;
  const result = await listLedgerTransactionsAction({ page: firstParam(query.page) });
  const ledgerPage = result.ok
    ? result.data
    : {
        transactions: [],
        pagination: { page: 1, pageSize: 10, total: 0, pageCount: 1 },
      };

  return (
    <PageFrame
      eyebrow="Ledger"
      title="Import transactions"
      description="Upload GCash, bank, or receipt screenshots. Review what we read, then save."
    >
      <div className="grid gap-8">
        <ImportWizard />
        <TransactionsPanel {...ledgerPage} loadError={result.ok ? undefined : result.error} />
      </div>
    </PageFrame>
  );
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
