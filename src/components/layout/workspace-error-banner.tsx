"use client";

import { Button } from "@/components/ui/button";
import { useFinancialStateContext } from "@/providers/financial-state-provider";

export function WorkspaceErrorBanner() {
  const { error, refresh } = useFinancialStateContext();

  if (!error) {
    return null;
  }

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
