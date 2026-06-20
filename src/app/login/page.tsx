import { AuthForm } from "@/features/auth";
import { signInAction } from "@/features/auth/api/actions";

export default function LoginPage() {
  async function login(formData: FormData) {
    "use server";
    await signInAction(formData);
  }

  return <AuthForm mode="login" action={login} />;
}
