"use client";

import { GraduationCap } from "lucide-react";

import { FinancialDisclaimer } from "@/components/legal/financial-disclaimer";
import { getEducationalLesson } from "@/lib/advisor/lessons";
import { buildAdvisorPrompt, buildAdvisorSystemPrompt } from "@/lib/advisor/prompt";
import type { ModelClient } from "@/lib/ai/types";
import { useStreamedExplanation } from "@/hooks/use-streamed-explanation";
import type { PurchaseCheck, PurchaseDecisionResult } from "@/types/finance";

// Stable empty chain disables streaming (e.g. the static example) without breaking
// the Rules of Hooks by conditionally calling the hook.
const NO_CLIENTS: ModelClient[] = [];

function toDecisionResult(check: PurchaseCheck): PurchaseDecisionResult {
  return {
    decision: check.decision,
    riskScore: check.riskScore,
    safeToSpend: check.safeToSpend,
    monthlyFreeCashFlow: check.monthlyFreeCashFlow,
    emergencyProgress: check.emergencyProgress ?? 0,
    debtPressure: check.debtPressure ?? 0,
    goalDelayMonths: check.goalDelayMonths ?? 0,
    cooldownDays: check.cooldownDays,
    savingsAfterPurchase: check.savingsAfterPurchase,
    healthScore: check.healthScore ?? 0,
    reasons: check.reasons,
  };
}

/**
 * Renders the advisor explanation. When a model is configured it streams in
 * progressively (and is labelled as AI-generated); otherwise it shows the
 * deterministic narrative the check was saved with — unlabelled, because that copy
 * is the app's own. The decision itself is never shown from here.
 */
export function AdvisorExplanation({
  check,
  live,
  clients,
}: {
  check: PurchaseCheck;
  live: boolean;
  /** Test seam: overrides the env-resolved chain. */
  clients?: ModelClient[];
}) {
  const result = toDecisionResult(check);
  const { text, isStreaming, usedModel } = useStreamedExplanation({
    system: buildAdvisorSystemPrompt(),
    prompt: buildAdvisorPrompt(result, check),
    fallback: check.advisorText,
    clients: clients ?? (live ? undefined : NO_CLIENTS),
  });

  return (
    <div className="grid gap-2">
      {usedModel || isStreaming ? (
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
          AI explanation
          {isStreaming ? (
            <span className="inline-flex items-center gap-1 text-primary">
              <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-primary" />
              generating
            </span>
          ) : null}
        </p>
      ) : null}
      <p aria-live="polite" className="text-sm leading-6 text-muted">
        {text}
        {isStreaming ? (
          <span aria-hidden="true" className="ml-0.5 inline-block animate-pulse">
            ▍
          </span>
        ) : null}
      </p>
      <FinancialDisclaimer variant="inline" />
    </div>
  );
}

/** One deterministic educational lesson, chosen from the check's signals. */
export function LessonBlock({ check }: { check: PurchaseCheck }) {
  const lesson = getEducationalLesson(toDecisionResult(check));

  return (
    <div className="rounded-control border border-border bg-slate-50 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
        <GraduationCap aria-hidden="true" className="size-3.5" />
        Lesson
      </p>
      <p className="mt-2 text-sm font-semibold text-foreground">{lesson.title}</p>
      <p className="mt-1 text-sm leading-6 text-muted">{lesson.body}</p>
    </div>
  );
}
