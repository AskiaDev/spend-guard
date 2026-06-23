"use client";

import { createContext, useContext } from "react";
import { useFinancialState } from "@/hooks/use-financial-state";

type FinancialStateContextValue = ReturnType<typeof useFinancialState>;

const FinancialStateContext = createContext<FinancialStateContextValue | null>(null);

export function FinancialStateProvider({ children }: { children: React.ReactNode }) {
  const state = useFinancialState();

  return (
    <FinancialStateContext.Provider value={state}>{children}</FinancialStateContext.Provider>
  );
}

export function useFinancialStateContext() {
  const state = useContext(FinancialStateContext);

  if (!state) {
    throw new Error("useFinancialStateContext must be used within FinancialStateProvider.");
  }

  return state;
}
