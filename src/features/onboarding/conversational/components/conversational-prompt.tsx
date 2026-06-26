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
    <div className="conv-prompt flex flex-col gap-2">
      {eyebrow && (
        <p className="vault-eyebrow m-0">
          {eyebrow}
        </p>
      )}

      <h2
        className="vault-display m-0 text-[clamp(1.5rem,4vw,2.25rem)] font-bold leading-[1.15] text-foreground tracking-[-0.02em]"
      >
        {headline}
      </h2>

      {subtext && (
        <p
          className="vault-muted m-0 text-base leading-[1.5]"
        >
          {subtext}
        </p>
      )}

      {why && (
        <p className="m-0 text-xs text-muted-foreground opacity-70 leading-[1.4]">
          {why}
        </p>
      )}
    </div>
  );
}
