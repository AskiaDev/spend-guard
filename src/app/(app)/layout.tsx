import { AppShell } from "@/components/layout/app-shell";
import { FinancialStateProvider } from "@/providers/financial-state-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FinancialStateProvider>
      <AppShell>{children}</AppShell>
    </FinancialStateProvider>
  );
}
