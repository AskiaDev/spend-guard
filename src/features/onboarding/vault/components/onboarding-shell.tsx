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
    // ponytail: #17244e has no shadcn token (lives only inside --vault-gradient). Hardcoded here. Promote to globals if ever reused.
    <div className="grid grid-cols-1 md:grid-cols-[42%_58%] min-h-[100dvh]">
      {/* LEFT STAGE - brand + hero */}
      <div className="flex flex-col relative overflow-hidden border-b border-border md:border-b-0 md:border-r min-h-[220px] md:min-h-[100dvh] bg-[linear-gradient(160deg,#17244e_0%,var(--background)_70%)]">
        {/* Brand mark */}
        <div className="flex items-center gap-2 shrink-0 py-7 px-8">
          <span className="text-primary text-base leading-none">◆</span>
          <span className="font-[family-name:var(--font-schibsted)] font-bold text-[0.95rem] tracking-[-0.01em] text-foreground">
            SpendGuard
          </span>
        </div>

        {/* Hero slot - centered, fills remaining space */}
        <div className="flex-1 flex items-center justify-center px-8">
          {hero}
        </div>

        {/* Value prop line */}
        <div className="shrink-0 pt-6 px-8 pb-8">
          <p className="text-[0.78rem] text-muted-foreground leading-normal m-0 tracking-[0.01em]">
            Local-first checks. Your money stays yours.
          </p>
        </div>
      </div>

      {/* RIGHT COLUMN - stepper + form + footer */}
      <div className="flex flex-col min-h-0 pt-6 px-5 pb-7 md:pt-7 md:px-10 md:pb-8 md:min-h-[100dvh]">
        {/* Progress indicator: caller-supplied slot, or the default stepper + eyebrow */}
        {progress ? (
          <div className="shrink-0 mb-7">{progress}</div>
        ) : (
          <>
            <div className="shrink-0 mb-7">
              <VaultStepper step={step} labels={labels} />
            </div>
            <div className="shrink-0 mb-5">
              <span className="text-[0.7rem] font-bold tracking-[0.2em] text-primary">
                STEP {step} / {total} - {currentLabel}
              </span>
            </div>
          </>
        )}

        {/* Step body - animated on step change. The vault wizard uses
            mode="wait" (one panel at a time). The conversational flow (which
            supplies its own `progress`) uses sync mode so the incoming step
            mounts immediately, avoiding the one-frame empty gap of wait mode.
            The container is a single-cell grid and both motion.div children
            occupy that same cell (gridArea "1 / 1"), so the exiting and
            entering steps overlap and cross-fade with zero layout shift
            instead of stacking vertically. In wait mode only one child is ever
            mounted, so it simply fills the single cell - harmless. */}
        <div className="flex-1 grid grid-cols-[minmax(0,1fr)] min-h-0">
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
              className="[grid-area:1/1] flex flex-col min-w-0"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer / nav buttons */}
        <div className="shrink-0 pt-6">
          {footer}
        </div>
      </div>
    </div>
  );
}
