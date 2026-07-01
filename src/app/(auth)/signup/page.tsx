import { env } from "@/config/env";
import { AuthScreen } from "@/features/auth";
import { signUpAction } from "@/features/auth/api/actions";

export default function SignupPage() {
  const notice = !env.hasSupabaseConfig
    ? "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY before using SpendGuard."
    : undefined;

  return <AuthScreen mode="signup" action={signUpAction} notice={notice} />;
}
