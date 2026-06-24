import { AdvisorAvatar } from "@/components/brand/advisor-avatar";
import { SpendGuardLogo } from "@/components/brand/spendguard-logo";
import { AppHeader } from "@/components/layout/app-header";
import { AppDesktopNavigation, AppMobileNavigation } from "@/components/layout/app-navigation";
import { FinancialDisclaimer } from "@/components/legal/financial-disclaimer";
import { AuthStatus } from "@/features/auth/components/auth-status";

export function AppShell({
  children,
  userEmail,
  signOutAction,
}: {
  children: React.ReactNode;
  userEmail: string;
  signOutAction: () => Promise<void>;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col border-r border-border bg-surface px-4 py-5 lg:flex">
        <SpendGuardLogo />

        <div className="mt-8 flex-1">
          <AppDesktopNavigation />
        </div>

        <div className="grid gap-3">
          <div className="rounded-card border border-border bg-advisor p-3">
            <div className="flex items-center gap-3">
              <AdvisorAvatar className="size-10" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Advisor ready</p>
                <p className="mt-0.5 text-xs leading-5 text-muted">Check before you spend.</p>
              </div>
            </div>
          </div>

          <AuthStatus email={userEmail} signOutAction={signOutAction} />
        </div>
      </aside>

      <AppHeader userEmail={userEmail} signOutAction={signOutAction} />

      <div className="lg:pl-[240px]">
        <main className="mx-auto flex min-h-screen w-full max-w-[1180px] flex-col px-4 py-5 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-6 lg:px-8 lg:py-8 lg:pb-8">
          <div className="flex-1">{children}</div>
          <FinancialDisclaimer />
        </main>
      </div>

      <AppMobileNavigation />
    </div>
  );
}
