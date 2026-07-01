"use client";

import { type Variants, useReducedMotion } from "motion/react";

// Shared reveal choreography for the landing sections, so the whole page
// animates as one system instead of each section reinventing the cadence.
export const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
} satisfies Variants;

export const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
} satisfies Variants;

export const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
} satisfies Variants;

// Staggered container that reveals its children once on scroll-in: spread `flow`
// on the wrapper and `beat` on each child. Reduced motion collapses to a no-op.
export function useReveal(amount = 0.2) {
  const reduced = useReducedMotion();
  if (reduced) return { flow: {}, beat: {} };
  return {
    flow: {
      variants: container,
      initial: "hidden" as const,
      whileInView: "show" as const,
      viewport: { once: true, amount },
    },
    beat: { variants: item },
  };
}

// A single element that rises in once on scroll-in. Reduced motion = no-op.
export function useRise(amount = 0.2) {
  const reduced = useReducedMotion();
  if (reduced) return {};
  return {
    variants: rise,
    initial: "hidden" as const,
    whileInView: "show" as const,
    viewport: { once: true, amount },
  };
}
