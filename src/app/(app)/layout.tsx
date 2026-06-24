import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { WorkspaceErrorBanner } from "@/components/layout/workspace-error-banner";
import { env } from "@/config/env";
import { signOutAction } from "@/features/auth/api/actions";
import { readOnboardingCompleted } from "@/features/onboarding/api/read-onboarding-completed";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { FinancialStateProvider } from "@/providers/financial-state-provider";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!env.hasSupabaseConfig) {
    redirect("/login?error=configuration");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!(await readOnboardingCompleted(supabase, user.id))) {
    redirect("/onboarding");
  }

  return (
    <FinancialStateProvider>
      <AppShell userEmail={user.email ?? "Signed in"} signOutAction={signOutAction}>
        <WorkspaceErrorBanner />
        {children}
      </AppShell>
    </FinancialStateProvider>
  );
}
