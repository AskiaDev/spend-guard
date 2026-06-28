import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const emailOtpTypes: EmailOtpType[] = [
  "email",
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
];

function safeNextPath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/onboarding";
}

function confirmationResultUrl(request: NextRequest, status: "success" | "error", next: string) {
  const resultUrl = new URL("/auth/confirmed", request.url);
  resultUrl.searchParams.set("status", status);

  if (status === "success") {
    resultUrl.searchParams.set("next", next);
  }

  return resultUrl;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(url.searchParams.get("next"));
  const supabase = await createServerSupabaseClient();

  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type && emailOtpTypes.includes(type)
      ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      : { error: new Error("Missing confirmation parameters.") };

  if (!result.error) {
    return NextResponse.redirect(confirmationResultUrl(request, "success", next));
  }

  return NextResponse.redirect(confirmationResultUrl(request, "error", next));
}
