"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action-result";

export async function signInAction(formData: FormData): Promise<ActionResult<null>> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { ok: false, error: error.message };
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to sign in.",
    };
  }

  redirect("/");
}

export async function signUpAction(formData: FormData): Promise<ActionResult<null>> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      return { ok: false, error: error.message };
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to sign up.",
    };
  }

  redirect("/");
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}
