"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

type CountUpProps = {
  to: number;
  format: (value: number) => string;
  className?: string;
  duration?: number;
  delay?: number;
  // "view" counts up when scrolled into view; "mount" counts up immediately (above the fold).
  trigger?: "view" | "mount";
};

// Animates a number from 0 to `to`, formatted for display. Static under reduced motion.
export function CountUp({
  to,
  format,
  className,
  duration = 1.1,
  delay = 0,
  trigger = "view",
}: CountUpProps) {
  const reduced = useReducedMotion();
  const value = useMotionValue(0);
  const text = useTransform(value, format);

  useEffect(() => {
    if (reduced || trigger !== "mount") return;
    const controls = animate(value, to, { duration, delay, ease: EASE });
    return () => controls.stop();
  }, [value, to, duration, delay, trigger, reduced]);

  if (reduced) return <span className={className}>{format(to)}</span>;

  if (trigger === "mount") return <motion.span className={className}>{text}</motion.span>;

  return (
    <motion.span
      className={className}
      viewport={{ once: true, amount: 0.6 }}
      onViewportEnter={() => animate(value, to, { duration, delay, ease: EASE })}
    >
      {text}
    </motion.span>
  );
}
