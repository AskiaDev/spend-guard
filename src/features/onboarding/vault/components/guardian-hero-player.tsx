"use client";
import { useReducedMotion } from "motion/react";
import { GuardianHero } from "./guardian-hero";
import { GuardianShieldStatic } from "./guardian-shield-static";

export function GuardianHeroPlayer({ variant }: { variant: "loop" | "lock" }) {
  const reduced = useReducedMotion();
  if (reduced) return <GuardianShieldStatic locked={variant === "lock"} />;
  return <GuardianHero variant={variant} />;
}
