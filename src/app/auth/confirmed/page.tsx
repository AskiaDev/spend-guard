import Link from "next/link";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function safeNextPath(value: string | string[] | undefined): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/onboarding";
}

export default async function EmailConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; next?: string | string[] }>;
}) {
  const query = await searchParams;
  const confirmed = query.status === "success";
  const next = safeNextPath(query.next);

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <Card className="glass-elevated w-full max-w-md">
        <CardHeader>
          {confirmed ? (
            <CheckCircle2 className="size-9 text-safe" aria-hidden="true" />
          ) : (
            <CircleAlert className="size-9 text-risk" aria-hidden="true" />
          )}
          <CardTitle className="font-display">
            {confirmed ? "Email confirmed" : "Confirmation link expired"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm text-muted-foreground">
            {confirmed
              ? "Your SpendGuard account is ready."
              : "Request a fresh confirmation email by signing up again."}
          </p>
          <Link
            className={cn(buttonVariants({ variant: confirmed ? "default" : "secondary" }))}
            href={confirmed ? next : "/signup"}
          >
            {confirmed ? "Continue" : "Back to signup"}
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
