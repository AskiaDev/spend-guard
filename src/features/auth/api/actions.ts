"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveAuthRedirectOrigin } from "./auth-redirect-origin";
import {
  initialAuthActionState,
  resolveSignUpResult,
  type AuthActionState,
} from "./auth-result";

const credentialsSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

function readCredentials(formData: FormData):
  | { success: true; data: z.infer<typeof credentialsSchema> }
  | { success: false; state: AuthActionState } {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      state: {
        status: "error",
        message: parsed.error.issues[0]?.message ?? "Check your email and password.",
      },
    };
  }

  return { success: true, data: parsed.data };
}

export async function signInAction(
  previousState: AuthActionState = initialAuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  void previousState;
  const credentials = readCredentials(formData);

  if (!credentials.success) {
    return credentials.state;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword(credentials.data);

    if (error) {
      return { status: "error", message: error.message };
    }
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to sign in.",
    };
  }

  redirect("/");
}

export async function signUpAction(
  previousState: AuthActionState = initialAuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  void previousState;
  const credentials = readCredentials(formData);

  if (!credentials.success) {
    return credentials.state;
  }

  try {
    const requestHeaders = await headers();
    const origin = resolveAuthRedirectOrigin(requestHeaders.get("origin"));
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      ...credentials.data,
      options: {
        emailRedirectTo: new URL("/auth/confirm", origin).toString(),
      },
    });
    const result = resolveSignUpResult({
      errorMessage: error?.message ?? null,
      hasSession: Boolean(data.session),
    });

    if (result.status !== "authenticated") {
      return result;
    }
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to sign up.",
    };
  }

  redirect("/onboarding");
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}
