import { AuthForm } from "@/features/auth";
import { signUpAction } from "@/features/auth/api/actions";

export default function SignupPage() {
  async function signup(formData: FormData) {
    "use server";
    await signUpAction(formData);
  }

  return <AuthForm mode="signup" action={signup} />;
}
