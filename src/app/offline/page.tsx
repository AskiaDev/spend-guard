import type { Metadata } from "next";
import Link from "next/link";
import { SpendGuardLogo } from "@/components/brand/spendguard-logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Offline | SpendGuard",
};

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <section className="glass-elevated grid w-full max-w-md gap-5 rounded-card p-6">
        <SpendGuardLogo />
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            Offline
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            Reconnect to open SpendGuard
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Your financial workspace stays protected online. Once the connection returns,
            continue to sign in or refresh the app.
          </p>
        </div>
        <Link className={cn(buttonVariants())} href="/">
          Try again
        </Link>
      </section>
    </main>
  );
}
