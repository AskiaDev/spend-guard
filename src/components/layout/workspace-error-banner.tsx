"use client";

import { Button } from "@/components/ui/button";
import { useFinancialStateContext } from "@/providers/financial-state-provider";

export function WorkspaceErrorBanner() {
  const {
    error,
    refresh,
    isFetching,
    isHydrated,
    isLoading,
    isStale,
    hasWorkspaceData,
  } = useFinancialStateContext();

  if (error) {
    return (
      <div
        role="alert"
        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-control border border-risk/30 bg-risk/10 p-4 text-sm text-risk"
      >
        <span>{error}</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => void refresh()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!isHydrated || !hasWorkspaceData || isLoading) {
    return null;
  }

  if (isFetching) {
    return (
      <p
        role="status"
        className="mb-4 rounded-control border border-border bg-card px-3 py-2 text-sm text-muted-foreground"
      >
        Refreshing financial workspace...
      </p>
    );
  }

  if (isStale) {
    return (
      <div
        role="status"
        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-control border border-border bg-card p-3 text-sm text-muted-foreground"
      >
        <span>Showing saved financial workspace data.</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => void refresh()}>
          Refresh
        </Button>
      </div>
    );
  }

  return null;
}
