"use client";

import { LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AuthStatus() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-zinc-900">
      <UserRound className="size-4 text-zinc-500" aria-hidden="true" />
      <Badge tone="zinc">local mode</Badge>
      <Button type="button" variant="ghost" size="sm">
        <LogOut className="size-4" aria-hidden="true" />
        Sign out
      </Button>
    </div>
  );
}
