"use client";

import { useFinancialStateContext } from "@/providers/financial-state-provider";

export function WorkspaceErrorBanner() {
  const { error, refresh } = useFinancialStateContext();

  if (!error) {
    return null;
  }

  return (
    <div
      role="alert"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-control border border-risk/30 bg-red-50 p-4 text-sm text-risk"
    >
      <span>{error}</span>
      <button type="button" className="font-semibold underline" onClick={() => void refresh()}>
        Retry
      </button>
    </div>
  );
}
