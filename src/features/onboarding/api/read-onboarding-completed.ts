import type { createServerSupabaseClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

export async function readOnboardingCompleted(
  supabase: SupabaseServerClient,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(data?.onboarding_completed);
}
