import { SpendGuardLogo } from "@/components/brand/spendguard-logo";
import { AuthStatus } from "@/features/auth/components/auth-status";

export function AppHeader({
  userEmail,
  signOutAction,
}: {
  userEmail: string;
  signOutAction: () => Promise<void>;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-md items-center justify-between gap-4">
        <SpendGuardLogo compact markLabel="" />
        <AuthStatus email={userEmail} signOutAction={signOutAction} />
      </div>
    </header>
  );
}
