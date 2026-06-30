"use client";

import { useEffect, useState } from "react";
import { isBrowserOnline } from "@/lib/pwa/network";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(isBrowserOnline);

  useEffect(() => {
    function updateStatus() {
      setIsOnline(isBrowserOnline());
    }

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  return isOnline;
}
