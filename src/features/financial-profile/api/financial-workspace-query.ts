import { queryOptions } from "@tanstack/react-query";

import { loadFinancialWorkspaceAction } from "./load-financial-workspace";
import type { FinancialWorkspace } from "@/types/finance";

export const financialWorkspaceKeys = {
  all: ["finance"] as const,
  workspace: () => [...financialWorkspaceKeys.all, "workspace"] as const,
};

export async function fetchFinancialWorkspace(): Promise<FinancialWorkspace> {
  const result = await loadFinancialWorkspaceAction();

  if (!result.ok) {
    throw new Error(result.error);
  }

  return result.data;
}

export function financialWorkspaceQueryOptions() {
  return queryOptions({
    queryKey: financialWorkspaceKeys.workspace(),
    queryFn: fetchFinancialWorkspace,
    staleTime: 60_000,
  });
}

export function isFinancialWorkspaceEmpty(workspace: FinancialWorkspace) {
  return (
    workspace.snapshot.expenses.length === 0 &&
    workspace.snapshot.debts.length === 0 &&
    workspace.snapshot.goals.length === 0 &&
    workspace.checks.length === 0 &&
    workspace.cooldownItems.length === 0 &&
    workspace.weeklyReports.length === 0
  );
}
