"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  ArrowRight,
  CircleCheck,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form-fields";
import {
  initialAuthActionState,
  type AuthActionState,
} from "../api/auth-result";

// ponytail: brandmark inlined rather than importing the marketing route's
// private _components (feature -> route coupling). ~10 lines; promote to
// src/components/brand if a third consumer appears.
function Brandmark() {
  return (
    <span className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-lg bg-brand font-poster text-xl leading-none text-ink">
        SG
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-poster text-xl tracking-tight text-ink-inverse">SpendGuard</span>
        <span className="font-ledger text-[10px] uppercase tracking-[0.18em] text-ink-inverse/55">
          See the real tradeoff
        </span>
      </span>
    </span>
  );
}

const TRUST = [
  { icon: ShieldCheck, label: "Bank-level security" },
  { icon: Lock, label: "Your data is private" },
  { icon: CircleCheck, label: "You're in control" },
] as const;

const fieldClass =
  "h-12 rounded-xl border-white/10 bg-white/[0.04] pr-11 text-ink-inverse placeholder:text-ink-inverse/35 focus-visible:border-brand/60 focus-visible:ring-[3px] focus-visible:ring-brand/25";
const labelClass =
  "font-ledger text-xs font-semibold uppercase tracking-[0.08em] text-ink-inverse/70";

const slatePanel = {
  background:
    "radial-gradient(circle at 15% 12%, rgba(184,242,12,0.08), transparent 36%), linear-gradient(160deg, #101412 0%, #090b0a 100%)",
};

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
    <div className="relative min-h-dvh overflow-hidden" style={slatePanel}>
      {/* fine dot grain over the dark panel */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: "radial-gradient(rgba(248,245,238,0.06) 0.6px, transparent 0.6px)",
          backgroundSize: "6px 6px",
        }}
      />

      <div className="relative flex min-h-dvh flex-col px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-700">
          <Brandmark />
        </div>

        <div className="flex flex-1 flex-col justify-center py-12">
          <div className="w-full max-w-md">
            <p className="animate-in fade-in slide-in-from-bottom-3 delay-100 duration-700 font-ledger text-xs font-bold uppercase tracking-[0.16em] text-brand">
              <span className="text-brand/50">— </span>
              {isLogin ? "Welcome back" : "Get protected"}
            </p>

            <h1 className="animate-in fade-in slide-in-from-bottom-3 delay-150 duration-700 mt-4 font-poster text-[clamp(2.5rem,4.6vw,4rem)] uppercase leading-[0.88] tracking-[-0.01em] text-ink-inverse">
              <span className="block">Check</span>
              <span className="block text-brand">Before</span>
              <span className="block">You buy.</span>
            </h1>

            <p className="animate-in fade-in slide-in-from-bottom-3 delay-200 duration-700 mt-6 max-w-sm text-base leading-relaxed text-ink-inverse/65">
              {isLogin
                ? "Know if a purchase fits your budget and protects your future, every time."
                : "Create your account and get a clear verdict on every purchase, before you spend."}
            </p>

            <div className="animate-in fade-in slide-in-from-bottom-3 delay-300 duration-700 mt-8">
              <form action={formAction} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email" className={labelClass}>
                    Email
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="you@example.com"
                      className={fieldClass}
                    />
                    <Mail
                      aria-hidden="true"
                      className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-ink-inverse/40"
                      strokeWidth={2}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password" className={labelClass}>
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete={isLogin ? "current-password" : "new-password"}
                      minLength={8}
                      required
                      placeholder="At least 8 characters"
                      className={fieldClass}
                    />
                    <Lock
                      aria-hidden="true"
                      className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-ink-inverse/40"
                      strokeWidth={2}
                    />
                  </div>
                </div>

                {notice ? (
                  <p
                    role="alert"
                    className="rounded-xl border border-[#ff9d9d]/30 bg-[#d94b4b]/10 p-3 text-sm text-[#ffb3b3]"
                  >
                    {notice}
                  </p>
                ) : null}
                {state.status === "error" ? (
                  <p
                    role="alert"
                    className="rounded-xl border border-[#ff9d9d]/30 bg-[#d94b4b]/10 p-3 text-sm text-[#ffb3b3]"
                  >
                    {state.message}
                  </p>
                ) : null}
                {state.status === "check_email" ? (
                  <p
                    role="status"
                    className="rounded-xl border border-brand/30 bg-brand/10 p-3 text-sm text-brand-soft"
                  >
                    {state.message}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  disabled={pending}
                  className="group h-12 w-full rounded-xl bg-brand font-ledger text-sm font-bold uppercase tracking-[0.04em] text-ink hover:bg-brand-soft hover:brightness-100"
                >
                  {pending ? "Working..." : isLogin ? "Sign in" : "Sign up"}
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    strokeWidth={2.5}
                  />
                </Button>
              </form>

              <div className="mt-7 flex items-center gap-4">
                <span className="h-px flex-1 bg-white/10" />
                <span className="font-ledger text-[11px] uppercase tracking-[0.2em] text-ink-inverse/40">
                  or
                </span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <p className="mt-6 text-sm text-ink-inverse/60">
                {isLogin ? "No account yet?" : "Already have an account?"}{" "}
                <Link
                  href={isLogin ? "/signup" : "/login"}
                  className="inline-flex items-center gap-1 font-semibold text-brand underline-offset-4 hover:text-brand-soft hover:underline"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                  <ArrowRight aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="animate-in fade-in delay-500 duration-1000 flex flex-wrap items-center gap-x-6 gap-y-2 font-ledger text-[11px] uppercase tracking-[0.08em] text-ink-inverse/45">
          {TRUST.map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <Icon aria-hidden="true" className="size-3.5" strokeWidth={2} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
