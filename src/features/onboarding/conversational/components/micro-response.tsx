"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

interface MicroResponseProps {
  show: boolean;
  children: ReactNode;
}

export function MicroResponse({ show, children }: MicroResponseProps) {
  const reduced = useReducedMotion();

  if (!show) return null;

  if (reduced) {
    return (
      <p role="status" className="text-muted-foreground text-sm m-0">
        {children}
      </p>
    );
  }

  return (
    <motion.p
      role="status"
      className="text-muted-foreground text-sm m-0"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.p>
  );
}
