const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicSupabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const env = {
  supabaseUrl: publicSupabaseUrl,
  supabasePublishableKey: publicSupabasePublishableKey,
  hasSupabaseConfig: Boolean(publicSupabaseUrl && publicSupabasePublishableKey),
};

export function requireSupabaseConfig() {
  if (!env.hasSupabaseConfig || !env.supabaseUrl || !env.supabasePublishableKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  return {
    url: env.supabaseUrl,
    publishableKey: env.supabasePublishableKey,
  };
}
