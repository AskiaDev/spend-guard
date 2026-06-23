import { AdvisorAvatar } from "@/components/brand/advisor-avatar";
import { SpendGuardLogo } from "@/components/brand/spendguard-logo";
import { AppHeader } from "@/components/layout/app-header";
import { AppDesktopNavigation, AppMobileNavigation } from "@/components/layout/app-navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col border-r border-border bg-surface px-4 py-5 lg:flex">
        <SpendGuardLogo />

        <div className="mt-8 flex-1">
          <AppDesktopNavigation />
        </div>

        <div className="rounded-card border border-border bg-advisor p-3">
          <div className="flex items-center gap-3">
            <AdvisorAvatar className="size-10" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Advisor ready</p>
              <p className="mt-0.5 text-xs leading-5 text-muted">Check before you spend.</p>
            </div>
          </div>
        </div>
      </aside>

      <AppHeader />

      <div className="lg:pl-[240px]">
        <main className="mx-auto min-h-screen w-full max-w-[1180px] px-4 py-5 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-6 lg:px-8 lg:py-8 lg:pb-8">
          {children}
        </main>
      </div>

      <AppMobileNavigation />
    </div>
  );
}
