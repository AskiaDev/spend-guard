"use client";

import { type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { VaultStepper } from "./vault-stepper";

interface OnboardingShellProps {
  step: number;
  labels?: string[];
  hero: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  /**
   * Optional progress indicator slot. When provided it replaces the built-in
   * VaultStepper + "STEP x / y" eyebrow (the conversational flow supplies its
   * own ProgressPath and per-screen eyebrows). When omitted the shell keeps its
   * original VaultStepper behaviour for the vault wizard.
   */
  progress?: ReactNode;
}

export function OnboardingShell({
  step,
  labels = [],
  hero,
  children,
  footer,
  progress,
}: OnboardingShellProps) {
  const prefersReducedMotion = useReducedMotion();

  const total = labels.length;
  const currentLabel = labels[step - 1];

  return (
    <div className="vault">
      <div
        className="vault-shell-grid"
        style={{
          flex: 1,
          display: "grid",
          minHeight: "100dvh",
        }}
      >
        {/* LEFT STAGE - brand + hero */}
        <div
          className="vault-shell-left"
          style={{
            display: "flex",
            flexDirection: "column",
            position: "relative",
            overflow: "hidden",
            background: "linear-gradient(160deg, var(--vault-deep) 0%, var(--vault-ink) 70%)",
          }}
        >
          {/* Brand mark */}
          <div
            style={{
              padding: "28px 32px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                color: "var(--vault-accent)",
                fontSize: "1rem",
                lineHeight: 1,
              }}
            >
              ◆
            </span>
            <span
              className="vault-display"
              style={{
                fontWeight: 700,
                fontSize: "0.95rem",
                letterSpacing: "-0.01em",
                color: "var(--vault-text)",
              }}
            >
              SpendGuard
            </span>
          </div>

          {/* Hero slot - centered, fills remaining space */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 32px",
            }}
          >
            {hero}
          </div>

          {/* Value prop line */}
          <div
            style={{
              padding: "24px 32px 32px",
              flexShrink: 0,
            }}
          >
            <p
              style={{
                fontSize: "0.78rem",
                color: "var(--vault-muted)",
                lineHeight: 1.5,
                margin: 0,
                letterSpacing: "0.01em",
              }}
            >
              Local-first checks. Your money stays yours.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN - stepper + form + footer */}
        <div
          className="vault-shell-right"
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          {/* Progress indicator: caller-supplied slot, or the default stepper + eyebrow */}
          {progress ? (
            <div style={{ flexShrink: 0, marginBottom: "28px" }}>{progress}</div>
          ) : (
            <>
              <div style={{ flexShrink: 0, marginBottom: "28px" }}>
                <VaultStepper step={step} labels={labels} />
              </div>
              <div style={{ flexShrink: 0, marginBottom: "20px" }}>
                <span className="vault-eyebrow">
                  STEP {step} / {total} - {currentLabel}
                </span>
              </div>
            </>
          )}

          {/* Step body - animated on step change. The vault wizard uses
              mode="wait" (one panel at a time). The conversational flow (which
              supplies its own `progress`) uses the default sync mode so the
              incoming step mounts immediately and cross-fades, with no flash of
              empty content across its many short screens. */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <AnimatePresence mode={progress ? "sync" : "wait"} initial={false}>
              <motion.div
                key={step}
                initial={{
                  opacity: 0,
                  x: prefersReducedMotion ? 0 : 12,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                exit={{
                  opacity: 0,
                  x: prefersReducedMotion ? 0 : -12,
                }}
                transition={{
                  duration: 0.22,
                  ease: [0.4, 0, 0.2, 1],
                }}
                style={{ flex: 1, display: "flex", flexDirection: "column" }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer / nav buttons */}
          <div style={{ flexShrink: 0, paddingTop: "24px" }}>
            {footer}
          </div>
        </div>
      </div>

      <style>{`
        .vault-shell-grid {
          grid-template-columns: 1fr;
        }
        .vault-shell-left {
          border-right: none;
          border-bottom: 1px solid var(--vault-border);
          min-height: 220px;
        }
        .vault-shell-right {
          padding: 24px 20px 28px;
        }
        @media (min-width: 768px) {
          .vault-shell-grid {
            grid-template-columns: 42% 58%;
          }
          .vault-shell-left {
            border-right: 1px solid var(--vault-border);
            border-bottom: none;
            min-height: 100dvh;
          }
          .vault-shell-right {
            padding: 28px 40px 32px;
            min-height: 100dvh;
          }
        }
      `}</style>
    </div>
  );
}
