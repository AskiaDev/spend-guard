import { describe, expect, it } from "vitest";
import { resolveSignUpResult } from "./auth-result";

describe("resolveSignUpResult", () => {
  it("returns a visible error when Supabase rejects signup", () => {
    expect(
      resolveSignUpResult({
        errorMessage: "Invalid API key",
        hasSession: false,
      })
    ).toEqual({
      status: "error",
      message: "Invalid API key",
    });
  });

  it("asks the user to confirm their email when signup has no session", () => {
    expect(resolveSignUpResult({ errorMessage: null, hasSession: false })).toEqual({
      status: "check_email",
      message: "Check your email to confirm your account, then sign in.",
    });
  });

  it("reports an authenticated signup when Supabase creates a session", () => {
    expect(resolveSignUpResult({ errorMessage: null, hasSession: true })).toEqual({
      status: "authenticated",
      message: "Account created.",
    });
  });
});
