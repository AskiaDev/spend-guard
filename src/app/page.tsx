import { redirect } from "next/navigation";
import { env } from "@/config/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SpendGuardClient } from "./spendguard-client";

export const dynamic = "force-dynamic";

export default async function Home() {
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

  return <SpendGuardClient userEmail={user.email ?? "Signed in"} />;
}
