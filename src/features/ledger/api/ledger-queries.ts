import { queryOptions } from "@tanstack/react-query";

import {
  listLedgerTransactionsAction,
  type LedgerTransactionPage,
} from "./manage-transactions";

export const ledgerKeys = {
  all: ["ledger"] as const,
  transactions: () => [...ledgerKeys.all, "transactions"] as const,
  transactionsPage: (page: number) => [...ledgerKeys.transactions(), { page }] as const,
};

export async function fetchLedgerTransactionsPage(page: number): Promise<LedgerTransactionPage> {
  const result = await listLedgerTransactionsAction({ page });

  if (!result.ok) {
    throw new Error(result.error);
  }

  return result.data;
}

export function ledgerTransactionsPageQueryOptions(
  page: number,
  initialData?: LedgerTransactionPage
) {
  return queryOptions({
    queryKey: ledgerKeys.transactionsPage(page),
    queryFn: () => fetchLedgerTransactionsPage(page),
    initialData,
    staleTime: 30_000,
  });
}
