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
      <aside className="glass fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col px-4 py-5 lg:flex">
        <SpendGuardLogo />

        <div className="mt-8 flex-1">
          <AppDesktopNavigation />
        </div>

        <div className="grid min-w-0 gap-3">
          <div className="glass-elevated min-w-0 rounded-control p-3">
            <div className="flex items-center gap-3">
              <AdvisorAvatar className="size-10" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Advisor ready</p>
                <p className="mt-0.5 truncate text-xs leading-5 text-muted-foreground">
                  Check before you spend.
                </p>
              </div>
            </div>
          </div>

          <AuthStatus email={userEmail} signOutAction={signOutAction} />
        </div>
      </aside>

      <AppHeader userEmail={userEmail} signOutAction={signOutAction} />

      <div className="lg:pl-[240px]">
        <main className="flex min-h-screen w-full flex-col px-4 py-5 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-6 lg:px-8 lg:py-8 lg:pb-8">
          <div className="flex-1">{children}</div>
          <FinancialDisclaimer />
        </main>
      </div>

      <AppMobileNavigation />
    </div>
  );
}
