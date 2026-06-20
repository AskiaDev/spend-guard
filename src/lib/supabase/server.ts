import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { requireSupabaseConfig } from "@/config/env";
import type { Database } from "@/types/database";

export async function createServerSupabaseClient() {
  const config = requireSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient<Database>(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Setting cookies from a Server Component can fail; Server Actions and Proxy handle writes.
        }
      },
    },
  });
}

export async function requireUserId() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Authentication required.");
  }

  return { supabase, userId: user.id };
}
