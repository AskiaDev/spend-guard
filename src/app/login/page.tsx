import { env } from "@/config/env";
import { AuthForm } from "@/features/auth";
import { signInAction } from "@/features/auth/api/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const notice =
    !env.hasSupabaseConfig || query.error === "configuration"
      ? "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY before using SpendGuard."
      : query.error === "confirmation"
      ? "The confirmation link is invalid or expired. Request a new signup email."
      : undefined;

  return <AuthForm mode="login" action={signInAction} notice={notice} />;
}
