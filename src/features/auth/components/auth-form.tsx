"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/form-fields";
import {
  initialAuthActionState,
  type AuthActionState,
} from "../api/auth-result";

export function AuthForm({
  mode,
  action,
  notice,
}: {
  mode: "login" | "signup";
  action: (previousState: AuthActionState, formData: FormData) => Promise<AuthActionState>;
  notice?: string;
}) {
  const isLogin = mode === "login";
  const [state, formAction, pending] = useActionState(action, initialAuthActionState);

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
          <form action={formAction} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" minLength={8} required />
            </div>
            {notice ? (
              <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {notice}
              </p>
            ) : null}
            {state.status === "error" ? (
              <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {state.message}
              </p>
            ) : null}
            {state.status === "check_email" ? (
              <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                {state.message}
              </p>
            ) : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Working..." : isLogin ? "Sign in" : "Sign up"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-zinc-600">
            {isLogin ? "No account yet?" : "Already have an account?"}{" "}
            <Link className="font-semibold text-emerald-700" href={isLogin ? "/signup" : "/login"}>
              {isLogin ? "Sign up" : "Sign in"}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
