export type AuthActionState =
  | { status: "idle"; message: "" }
  | { status: "error"; message: string }
  | { status: "check_email"; message: string }
  | { status: "authenticated"; message: string };

export const initialAuthActionState: AuthActionState = {
  status: "idle",
  message: "",
};

export function resolveSignUpResult({
  errorMessage,
  hasSession,
}: {
  errorMessage: string | null;
  hasSession: boolean;
}): AuthActionState {
  if (errorMessage) {
    return { status: "error", message: errorMessage };
  }

  if (!hasSession) {
    return {
      status: "check_email",
      message: "Check your email to confirm your account, then sign in.",
    };
  }

  return { status: "authenticated", message: "Account created." };
}
