"use client";

import { useCallback, useEffect, useState } from "react";
import { PwaStatusBanner } from "./pwa-status-banner";
import { useNetworkStatus } from "./use-network-status";

export function PwaLifecycle() {
  const isOnline = useNetworkStatus();
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }

    let disposed = false;

    void navigator.serviceWorker.register("/sw.js").then((nextRegistration) => {
      if (disposed) {
        return;
      }

      setRegistration(nextRegistration);
      setUpdateReady(Boolean(nextRegistration.waiting));

      nextRegistration.addEventListener("updatefound", () => {
        const worker = nextRegistration.installing;

        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            setUpdateReady(true);
          }
        });
      });
    });

    return () => {
      disposed = true;
    };
  }, []);

  const reloadApp = useCallback(() => {
    registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
    window.location.reload();
  }, [registration]);

  return (
    <PwaStatusBanner
      isOnline={isOnline}
      updateReady={updateReady}
      onReload={reloadApp}
      onRetry={() => window.location.reload()}
    />
  );
}
