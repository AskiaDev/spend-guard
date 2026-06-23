"use client";

import { LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuthStatusProps {
  email: string;
  signOutAction: () => Promise<void>;
}

export function AuthStatus(props: AuthStatusProps) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900">
      <UserRound className="size-4 text-zinc-500" aria-hidden="true" />
      <span className="max-w-36 truncate text-xs font-medium" title={props.email}>
        {props.email}
      </span>
      <form action={props.signOutAction}>
        <Button type="submit" variant="ghost" size="sm">
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </Button>
      </form>
    </div>
  );
}
