"use client";
import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import type { PlayerPropsWithoutZod } from "@remotion/player";
import { GuardianHero } from "./guardian-hero";
import { GuardianShieldStatic } from "./guardian-shield-static";

type GuardianHeroProps = { variant: "loop" | "lock" };

const Player = dynamic(
  () => import("@remotion/player").then((m) => m.Player),
  { ssr: false },
) as ComponentType<PlayerPropsWithoutZod<GuardianHeroProps>>;

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined") return () => {};
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}

export function GuardianHeroPlayer({ variant }: { variant: "loop" | "lock" }) {
  const reduced = usePrefersReducedMotion();
  if (reduced) return <GuardianShieldStatic locked={variant === "lock"} />;
  return (
    <Player
      component={GuardianHero}
      inputProps={{ variant }}
      durationInFrames={variant === "loop" ? 90 : 60}
      fps={30}
      compositionWidth={360}
      compositionHeight={360}
      loop={variant === "loop"}
      autoPlay
      controls={false}
      style={{ width: "100%", maxWidth: 320 }}
    />
  );
}
