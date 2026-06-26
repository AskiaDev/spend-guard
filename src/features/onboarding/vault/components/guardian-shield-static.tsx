interface GuardianShieldStaticProps {
  locked?: boolean;
}

export function GuardianShieldStatic({ locked = false }: GuardianShieldStaticProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={180}
      height={180}
      aria-hidden="true"
      className="drop-shadow-[0_0_18px_rgba(198,242,78,0.5)]"
    >
      <path
        d="M50 8 L83 20 V50 C83 71 68 86 50 93 C32 86 17 71 17 50 V20 Z"
        fill={locked ? "rgba(198,242,78,0.32)" : "rgba(198,242,78,0.10)"}
        stroke="#c6f24e"
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <path
        d="M35 51 l11 12 l21 -26"
        fill="none"
        stroke="#c6f24e"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
