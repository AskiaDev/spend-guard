import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/form-fields";

export function AuthForm({
  mode,
  action,
}: {
  mode: "login" | "signup";
  action: (formData: FormData) => void | Promise<void>;
}) {
  const isLogin = mode === "login";

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f8f4] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isLogin ? "Sign in" : "Create account"}</CardTitle>
          <p className="mt-1 text-sm text-zinc-600">
            Supabase Auth keeps remote data scoped to your account.
          </p>
        </CardHeader>
        <CardContent>
          <form action={action} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" minLength={8} required />
            </div>
            <Button type="submit">{isLogin ? "Sign in" : "Sign up"}</Button>
          </form>
          <p className="mt-4 text-sm text-zinc-600">
            {isLogin ? "No account yet?" : "Already have an account?"}{" "}
            <Link className="font-semibold text-emerald-700" href={isLogin ? "/signup" : "/login"}>
              {isLogin ? "Sign up" : "Sign in"}
            </Link>
          </p>
          <Link className="mt-3 inline-flex text-sm font-semibold text-zinc-700" href="/">
            Continue in local mode
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
