import type { AuthActionState } from "../api/auth-result";
import { AuthForm } from "./auth-form";
import { AuthShowcase } from "./auth-showcase";

// Split screen: the dark form (the app you're entering) on the left, the paper
// brand promise on the right. Showcase collapses away below lg to stay form-first.
export function AuthScreen({
  mode,
  action,
  notice,
}: {
  mode: "login" | "signup";
  action: (previousState: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  notice?: string;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <AuthForm mode={mode} action={action} notice={notice} />
      <AuthShowcase />
    </div>
  );
}
