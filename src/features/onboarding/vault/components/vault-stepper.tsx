"use client";

interface VaultStepperProps {
  step: number;
  labels: string[];
}

export function VaultStepper({ step, labels }: VaultStepperProps) {
  const total = labels.length;
  const progress = total > 0 ? (step / total) * 100 : 0;

  return (
    <div style={{ width: "100%" }}>
      {/* Progress bar track */}
      <div
        style={{
          height: "2px",
          background: "var(--vault-border)",
          borderRadius: "1px",
          overflow: "hidden",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: "100%",
            background: "var(--vault-accent)",
            borderRadius: "1px",
            transformOrigin: "left center",
            transform: `scaleX(${progress / 100})`,
            transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>

      {/* Step labels */}
      <div
        style={{
          display: "flex",
          gap: "4px",
        }}
      >
        {labels.map((label, index) => {
          const isActive = index + 1 === step;
          const isDone = index + 1 < step;
          return (
            <div
              key={index}
              style={{
                flex: 1,
                fontSize: "0.65rem",
                letterSpacing: "0.12em",
                fontWeight: 700,
                textTransform: "uppercase",
                color: isActive
                  ? "var(--vault-accent)"
                  : isDone
                    ? "var(--vault-muted)"
                    : "var(--vault-border)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                transition: "color 0.3s ease",
              }}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
