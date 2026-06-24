import { redirect } from "next/navigation";
import { env } from "@/config/env";
import { readOnboardingCompleted } from "@/features/onboarding/api/read-onboarding-completed";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import "@/features/onboarding/vault/vault.css"; // added in Task 4

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
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

  if (await readOnboardingCompleted(supabase, user.id)) {
    redirect("/");
  }

  // .vault scopes the onboarding theme; fonts wired in Task 4.
  return <div className="vault">{children}</div>;
}
