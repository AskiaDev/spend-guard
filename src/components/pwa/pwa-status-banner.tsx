"use client";

import { RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PwaStatusBanner({
  isOnline,
  updateReady,
  onReload,
  onRetry,
}: {
  isOnline: boolean;
  updateReady: boolean;
  onReload?: () => void;
  onRetry?: () => void;
}) {
  if (isOnline && !updateReady) {
    return null;
  }

  if (!isOnline) {
    return (
      <div
        role="status"
        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-control border border-caution/30 bg-caution/10 p-3 text-sm text-foreground"
      >
        <span className="flex min-w-0 items-center gap-2">
          <WifiOff className="size-4 shrink-0 text-caution" aria-hidden="true" />
          <span>
            <strong>Offline.</strong> Showing saved workspace data. New saves are paused.
          </span>
        </span>
        {onRetry ? (
          <Button type="button" variant="ghost" size="sm" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-control border border-primary/30 bg-primary/10 p-3 text-sm text-foreground"
    >
      <span>A newer SpendGuard build is ready.</span>
      <Button type="button" variant="ghost" size="sm" onClick={onReload}>
        <RefreshCw className="size-4" aria-hidden="true" />
        Reload now
      </Button>
    </div>
  );
}
