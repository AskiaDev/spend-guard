"use client";

import { GooeyToaster } from "goey-toast";
import "goey-toast/styles.css";

export function ToastProvider() {
  return (
    <GooeyToaster
      theme="dark"
      position="bottom-right"
      toastOptions={{ classNames: { toast: "font-sans" } }}
    />
  );
}
