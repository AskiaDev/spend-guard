import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/config/env";
import { getAuthRedirect } from "@/features/auth/api/auth-routing";
import type { Database } from "@/types/database";

interface OnboardingStatusClient {
  from(table: "profiles"): {
    select(columns: "onboarding_completed"): {
      eq(
        column: "user_id",
        value: string
      ): {
        maybeSingle(): PromiseLike<{
          data: { onboarding_completed: boolean } | null;
          error: unknown;
        }>;
      };
    };
  };
}

export async function readOnboardingCompleted(
  supabase: OnboardingStatusClient,
  userId: string
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Unable to read onboarding status", error);
    return true;
  }

  return data?.onboarding_completed ?? false;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!env.hasSupabaseConfig || !env.supabaseUrl || !env.supabasePublishableKey) {
    return response;
  }

  const supabase = createServerClient<Database>(
    env.supabaseUrl,
    env.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const onboardingCompleted = user
    ? await readOnboardingCompleted(supabase as unknown as OnboardingStatusClient, user.id)
    : false;

  const redirectPath = getAuthRedirect(
    request.nextUrl.pathname,
    Boolean(user),
    onboardingCompleted
  );

  if (redirectPath) {
    const redirectResponse = NextResponse.redirect(new URL(redirectPath, request.url));
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
