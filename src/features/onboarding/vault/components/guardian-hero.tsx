"use client";
import { motion } from "motion/react";

const SHIELD_PATH = "M50 8 L83 20 V50 C83 71 68 86 50 93 C32 86 17 71 17 50 V20 Z";
const CHECK_PATH = "M35 51 l11 12 l21 -26";
const ACCENT = "#c6f24e";

export function GuardianHero({ variant }: { variant: "loop" | "lock" }) {
  const isLock = variant === "lock";

  return (
    <div
      style={{
        position: "relative",
        width: 180,
        height: 180,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Outer pulse ring */}
      <motion.div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 180,
          height: 180,
          borderRadius: "50%",
          border: `1.5px solid ${ACCENT}`,
          transformOrigin: "center center",
        }}
        animate={
          isLock
            ? { scale: 1, opacity: 0.28 }
            : { scale: [1, 1.55, 1.55], opacity: [0.55, 0, 0] }
        }
        transition={
          isLock
            ? { duration: 0.4 }
            : { repeat: Infinity, duration: 2.6, ease: "easeOut", times: [0, 0.7, 1] }
        }
      />

      {/* Inner pulse ring */}
      <motion.div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 180,
          height: 180,
          borderRadius: "50%",
          border: `1.5px solid ${ACCENT}`,
          transformOrigin: "center center",
        }}
        animate={
          isLock
            ? { scale: 1, opacity: 0.18 }
            : { scale: [1, 1.3, 1.3], opacity: [0.45, 0, 0] }
        }
        transition={
          isLock
            ? { duration: 0.4 }
            : {
                repeat: Infinity,
                duration: 2.6,
                ease: "easeOut",
                delay: 0.55,
                times: [0, 0.7, 1],
              }
        }
      />

      {/* Shield SVG */}
      <svg
        viewBox="0 0 100 100"
        width={180}
        height={180}
        aria-hidden="true"
        style={{
          position: "absolute",
          filter: `drop-shadow(0 0 ${isLock ? "22px" : "14px"} rgba(198,242,78,${isLock ? "0.65" : "0.42"}))`,
          transition: "filter 0.6s ease",
        }}
      >
        {/* Shield fill - intensifies on lock */}
        <motion.path
          d={SHIELD_PATH}
          stroke="none"
          animate={{
            fill: isLock
              ? "rgba(198,242,78,0.32)"
              : ["rgba(198,242,78,0.08)", "rgba(198,242,78,0.14)", "rgba(198,242,78,0.08)"],
          }}
          transition={
            isLock
              ? { duration: 0.5, delay: 0.35 }
              : { repeat: Infinity, duration: 3.2, ease: "easeInOut" }
          }
        />

        {/* Shield outline - draws in once */}
        <motion.path
          d={SHIELD_PATH}
          fill="none"
          stroke={ACCENT}
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={1}
          style={{ pathLength: undefined }}
          initial={{ pathLength: 0, opacity: 0.7 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
        />

        {/* Checkmark - lock variant only, stamps in after shield */}
        {isLock && (
          <motion.path
            d={CHECK_PATH}
            fill="none"
            stroke={ACCENT}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            style={{ pathLength: undefined }}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              pathLength: { duration: 0.38, ease: "easeOut", delay: 0.7 },
              opacity: { duration: 0.15, delay: 0.7 },
            }}
          />
        )}
      </svg>
    </div>
  );
}
