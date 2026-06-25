import { Schibsted_Grotesk, Hanken_Grotesk } from "next/font/google";
import { redirect } from "next/navigation";
import { env } from "@/config/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import "@/features/onboarding/vault/vault.css";

const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const dynamic = "force-dynamic";

// Auth + onboarding gating is handled centrally by src/proxy.ts:
// - unauthenticated -> /login
// - authenticated but not onboarded -> kept on /onboarding
// - onboarded -> redirected away to /
// The auth check below is a defense-in-depth fallback mirroring (app)/layout.tsx.
// The onboarding-completed redirect intentionally stays in proxy.ts only.
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

  return <div className={`vault ${schibsted.variable} ${hanken.variable}`}>{children}</div>;
}
