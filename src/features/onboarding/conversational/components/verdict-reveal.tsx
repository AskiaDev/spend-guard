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
    <div className="flex-[1_1_120px] min-w-[110px] py-3 px-[14px] rounded-control bg-primary/5 border border-border">
      <span className="block text-[0.62rem] tracking-[0.16em] font-bold text-muted-foreground uppercase">
        {label}
      </span>
      <span className="font-display block mt-1 text-[1.05rem] text-foreground">
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
  // ponytail: accent is data-driven (verdict.tone) — used in computed style props below
  const accent = verdict.tone === "go" ? "var(--primary)" : "var(--destructive)";

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={reduced ? false : { opacity: 0, y: 12, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-[18px] pt-[22px] pb-6 px-[22px] rounded-[var(--radius-card)]"
      style={{ // ponytail: background and border depend on computed accent (verdict.tone)
        background: `color-mix(in srgb, ${accent} 8%, var(--card))`,
        border: `1px solid color-mix(in srgb, ${accent} 35%, var(--border))`,
      }}
    >
      <div className="flex flex-col gap-2">
        <span
          className="text-[0.7rem] font-bold tracking-[0.2em] text-primary inline-flex items-center gap-2"
          style={{ // ponytail: color depends on computed accent (verdict.tone)
            color: accent,
          }}
        >
          <span
            aria-hidden="true"
            className="w-2 h-2 rounded-full"
            style={{ // ponytail: background and boxShadow depend on computed accent (verdict.tone)
              background: accent,
              boxShadow: `0 0 0 4px color-mix(in srgb, ${accent} 22%, transparent)`,
            }}
          />
          The verdict
        </span>
        <h2
          className="font-display m-0 text-[clamp(1.6rem,5vw,2.4rem)] leading-[1.1]"
          style={{ // ponytail: color depends on computed accent (verdict.tone)
            color: accent,
          }}
        >
          {verdict.word}
        </h2>
        <p className="text-muted-foreground m-0 text-[0.95rem] leading-[1.5]">
          {verdict.line}
        </p>
      </div>

      <div className="flex flex-wrap gap-[10px]">
        <Stat label="This purchase" value={formatCurrency(purchase.amount, currency)} />
        <Stat label="Safe to spend" value={formatCurrency(result.safeToSpend, currency)} />
        <Stat label="Suggested pause" value={`${result.cooldownDays}-day cooldown`} />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[0.7rem] font-bold tracking-[0.2em] text-muted-foreground">
          Why SpendGuard says this
        </span>
        <ul className="m-0 pl-[18px] flex flex-col gap-[6px]">
          {result.reasons.map((reason) => (
            <li
              key={reason}
              className="text-[0.85rem] text-foreground leading-[1.45]"
            >
              {reason}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
