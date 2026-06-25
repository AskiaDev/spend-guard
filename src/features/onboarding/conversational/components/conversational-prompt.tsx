"use client";

interface ConversationalPromptProps {
  eyebrow?: string;
  headline: string;
  subtext?: string;
  why?: string;
}

export function ConversationalPrompt({
  eyebrow,
  headline,
  subtext,
  why,
}: ConversationalPromptProps) {
  return (
    <div className="conv-prompt" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {eyebrow && (
        <p className="vault-eyebrow" style={{ margin: 0 }}>
          {eyebrow}
        </p>
      )}

      <h2
        className="vault-display"
        style={{
          margin: 0,
          fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
          fontWeight: 700,
          lineHeight: 1.15,
          color: "var(--vault-text)",
          letterSpacing: "-0.02em",
        }}
      >
        {headline}
      </h2>

      {subtext && (
        <p
          className="vault-muted"
          style={{
            margin: 0,
            fontSize: "1rem",
            lineHeight: 1.5,
          }}
        >
          {subtext}
        </p>
      )}

      {why && (
        <p
          style={{
            margin: 0,
            fontSize: "0.75rem",
            color: "var(--vault-muted)",
            opacity: 0.7,
            lineHeight: 1.4,
          }}
        >
          {why}
        </p>
      )}
    </div>
  );
}
