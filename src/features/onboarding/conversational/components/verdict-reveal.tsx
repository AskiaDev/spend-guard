"use client";

import { motion, useReducedMotion } from "motion/react";
import { formatCurrency } from "@/lib/utils";
import type {
  CurrencyCode,
  PurchaseDecision,
  PurchaseDecisionResult,
  PurchaseInput,
} from "@/types/finance";

// ---- Verdict copy + tone (verbatim from docs/BRAND_VOICE.md) ----------------
// Single source of truth shared by the onboarding first check and the explore sandbox.

export const VERDICT: Record<
  PurchaseDecision,
  { word: string; line: string; tone: "go" | "hold" }
> = {
  SAFE_TO_BUY: {
    word: "Safe to buy.",
    line: "This purchase does not affect your protected bills, emergency buffer, or savings goals.",
    tone: "go",
  },
  BUY_WITH_CAUTION: {
    word: "Buy with caution.",
    line: "You can afford this, but it reduces your breathing room until your next payday.",
    tone: "go",
  },
  WAIT: {
    word: "Waiting is the safer move.",
    line: "This purchase would put pressure on money already reserved for upcoming commitments.",
    tone: "hold",
  },
  NOT_RECOMMENDED: {
    word: "Not recommended right now.",
    line: "This would use money that should stay protected for bills, debt, savings, or your emergency buffer.",
    tone: "hold",
  },
};

// ---- Stat tile --------------------------------------------------------------

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        flex: "1 1 120px",
        minWidth: 110,
        padding: "12px 14px",
        borderRadius: "var(--vault-radius-ctl)",
        background: "color-mix(in srgb, var(--vault-accent) 5%, transparent)",
        border: "1px solid var(--vault-border)",
      }}
    >
      <span
        style={{
          display: "block",
          fontSize: "0.62rem",
          letterSpacing: "0.16em",
          fontWeight: 700,
          color: "var(--vault-muted)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        className="vault-display"
        style={{ display: "block", marginTop: 4, fontSize: "1.05rem", color: "var(--vault-text)" }}
      >
        {value}
      </span>
    </div>
  );
}

// ---- Verdict reveal ---------------------------------------------------------

export function VerdictReveal({
  result,
  purchase,
  currency,
}: {
  result: PurchaseDecisionResult;
  purchase: PurchaseInput;
  currency: CurrencyCode;
}) {
  const reduced = useReducedMotion();
  const verdict = VERDICT[result.decision];
  const accent = verdict.tone === "go" ? "var(--vault-accent)" : "var(--vault-danger)";

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={reduced ? false : { opacity: 0, y: 12, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 18,
        padding: "22px 22px 24px",
        borderRadius: "var(--vault-radius-card)",
        background: `color-mix(in srgb, ${accent} 8%, var(--vault-surface))`,
        border: `1px solid color-mix(in srgb, ${accent} 35%, var(--vault-border))`,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span
          className="vault-eyebrow"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, color: accent }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: accent,
              boxShadow: `0 0 0 4px color-mix(in srgb, ${accent} 22%, transparent)`,
            }}
          />
          The verdict
        </span>
        <h2
          className="vault-display"
          style={{ margin: 0, fontSize: "clamp(1.6rem, 5vw, 2.4rem)", lineHeight: 1.1, color: accent }}
        >
          {verdict.word}
        </h2>
        <p className="vault-muted" style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.5 }}>
          {verdict.line}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <Stat label="This purchase" value={formatCurrency(purchase.amount, currency)} />
        <Stat label="Safe to spend" value={formatCurrency(result.safeToSpend, currency)} />
        <Stat label="Suggested pause" value={`${result.cooldownDays}-day cooldown`} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span className="vault-eyebrow" style={{ color: "var(--vault-muted)" }}>
          Why SpendGuard says this
        </span>
        <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
          {result.reasons.map((reason) => (
            <li
              key={reason}
              style={{ fontSize: "0.85rem", color: "var(--vault-text)", lineHeight: 1.45 }}
            >
              {reason}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
