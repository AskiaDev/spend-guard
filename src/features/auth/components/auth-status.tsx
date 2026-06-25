"use client";

import { LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuthStatusProps {
  email: string;
  signOutAction: () => Promise<void>;
}

export function AuthStatus(props: AuthStatusProps) {
  return (
    <div
      data-testid="auth-status"
      className="grid min-w-0 gap-2 rounded-control border border-border bg-surface p-3 text-foreground"
    >
      <div className="flex min-w-0 items-center gap-2">
        <UserRound className="size-4 shrink-0 text-muted" aria-hidden="true" />
        <span className="min-w-0 truncate text-xs font-medium" title={props.email}>
          {props.email}
        </span>
      </div>
      <form action={props.signOutAction} className="w-full">
        <Button type="submit" variant="ghost" size="sm" className="h-9 w-full justify-start px-2">
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </Button>
      </form>
    </div>
  );
}
