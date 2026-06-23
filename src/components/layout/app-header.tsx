import { AdvisorAvatar } from "@/components/brand/advisor-avatar";
import { SpendGuardLogo } from "@/components/brand/spendguard-logo";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-md items-center justify-between gap-4">
        <SpendGuardLogo compact markLabel="" />
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden min-w-0 text-right min-[360px]:block">
            <p className="truncate text-xs font-semibold text-foreground">Money coach</p>
            <p className="truncate text-xs text-muted">Ready to help</p>
          </div>
          <AdvisorAvatar />
        </div>
      </div>
    </header>
  );
}
