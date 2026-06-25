"use client";

interface Step {
  id: string;
  label: string;
}

interface ProgressPathProps {
  steps: Step[];
  currentIndex: number;
}

export function ProgressPath({ steps, currentIndex }: ProgressPathProps) {
  const total = steps.length;
  const progress = total > 0 ? ((currentIndex + 1) / total) * 100 : 0;

  return (
    <div style={{ width: "100%" }}>
      {/* Progress bar track */}
      <div
        style={{
          height: "2px",
          background: "var(--vault-border)",
          borderRadius: "1px",
          overflow: "hidden",
          marginBottom: "10px",
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

      {/* Step labels - dot + label layout for many steps */}
      <div
        style={{
          display: "flex",
          gap: "2px",
          alignItems: "center",
        }}
      >
        {steps.map((step, index) => {
          const isActive = index === currentIndex;
          const isComplete = index < currentIndex;

          return (
            <div
              key={step.id}
              data-active={isActive}
              data-complete={isComplete}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                minWidth: 0,
              }}
            >
              {/* Dot indicator */}
              <div
                style={{
                  width: isActive ? "8px" : "6px",
                  height: isActive ? "8px" : "6px",
                  borderRadius: "50%",
                  background: isActive
                    ? "var(--vault-accent)"
                    : isComplete
                      ? "var(--vault-accent-2)"
                      : "var(--vault-border)",
                  transition: "all 0.3s ease",
                  flexShrink: 0,
                }}
              />
              {/* Label - only visible on wider viewports via font-size clamp */}
              <span
                style={{
                  fontSize: "clamp(0.5rem, 1vw, 0.65rem)",
                  letterSpacing: "0.1em",
                  fontWeight: isActive ? 700 : 500,
                  textTransform: "uppercase",
                  color: isActive
                    ? "var(--vault-accent)"
                    : isComplete
                      ? "var(--vault-muted)"
                      : "var(--vault-border)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                  transition: "color 0.3s ease",
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
