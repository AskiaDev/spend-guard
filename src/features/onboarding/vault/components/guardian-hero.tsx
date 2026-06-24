import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export function GuardianHero({ variant }: { variant: "loop" | "lock" }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const draw = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 40 });
  const pulse = interpolate(frame % 90, [0, 90], [0.6, 1.25]);
  const pulseOpacity = interpolate(frame % 90, [0, 90], [0.7, 0]);
  const lock = variant === "lock" ? spring({ frame, fps, config: { damping: 200 } }) : 0;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", background: "transparent" }}>
      <div
        style={{
          position: "absolute",
          width: 220,
          height: 220,
          borderRadius: "50%",
          border: "2px solid rgba(198,242,78,0.45)",
          transform: `scale(${pulse})`,
          opacity: pulseOpacity,
        }}
      />
      <svg
        viewBox="0 0 100 100"
        width={180}
        height={180}
        style={{ filter: "drop-shadow(0 0 18px rgba(198,242,78,0.5))" }}
      >
        <path
          d="M50 8 L83 20 V50 C83 71 68 86 50 93 C32 86 17 71 17 50 V20 Z"
          fill={variant === "lock" ? `rgba(198,242,78,${0.12 + lock * 0.2})` : "rgba(198,242,78,0.10)"}
          stroke="#c6f24e"
          strokeWidth={3}
          strokeLinejoin="round"
          strokeDasharray={300}
          strokeDashoffset={300 - draw * 300}
        />
        <path
          d="M35 51 l11 12 l21 -26"
          fill="none"
          stroke="#c6f24e"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={60}
          strokeDashoffset={variant === "lock" ? 60 - interpolate(draw, [0.4, 1], [0, 1], { extrapolateLeft: "clamp" }) * 60 : 60}
        />
      </svg>
    </AbsoluteFill>
  );
}
