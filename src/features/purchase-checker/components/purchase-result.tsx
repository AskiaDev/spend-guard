"use client";

import {
  ArrowLeft,
  CheckCircle2,
  LayoutDashboard,
  PauseCircle,
  Target,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { ScoreGauge } from "@/components/finance/score-gauge";
import { StatusBadge } from "@/components/finance/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  CurrencyCode,
  PurchaseCheck,
  PurchaseCheckStatus,
  PurchaseDecision,
} from "@/types/finance";

interface PurchaseResultProps {
  check?: PurchaseCheck;
  currency: CurrencyCode;
  onAddGoal: (check: PurchaseCheck) => Promise<unknown> | unknown;
  onAddCooldown: (check: PurchaseCheck) => Promise<unknown> | unknown;
  onMarkStatus?: (
    check: PurchaseCheck,
    status: Exclude<PurchaseCheckStatus, "checked">
  ) => Promise<unknown> | unknown;
}

const decisionConfidence = 92;

type MutationAction = "goal" | "cooldown" | "bought" | "skipped";

const mutationErrorMessages: Record<MutationAction, string> = {
  goal: "We couldn’t add this purchase to a goal. Please try again.",
  cooldown: "We couldn’t add this purchase to cooldown. Please try again.",
  bought: "We couldn’t update this purchase status. Please try again.",
  skipped: "We couldn’t update this purchase status. Please try again.",
};

const statusLabels: Record<PurchaseCheckStatus, string> = {
  checked: "Checked",
  bought: "Bought",
  skipped: "Skipped",
};

const examplePurchaseCheck: PurchaseCheck = {
  id: "example_iphone",
  createdAt: "2026-06-20T00:00:00.000Z",
  itemName: "iPhone Pro Max 1TB",
  amount: 170000,
  urgency: "can_wait",
  paymentMethod: "installment",
  installmentMonths: 24,
  monthlyPayment: 6000,
  decision: "NOT_RECOMMENDED",
  riskScore: 95,
  safeToSpend: 20000,
  monthlyFreeCashFlow: 10000,
  savingsAfterPurchase: 120000,
  emergencyProgress: 0.5,
  debtPressure: 0.18,
  goalDelayMonths: 3,
  healthScore: 74,
  cooldownDays: 30,
  status: "checked",
  advisorText:
    "Waiting protects your emergency savings and keeps your monthly plan flexible.",
  reasons: [
    "The price is above the current safe-to-spend amount.",
    "The monthly payment would reduce free cash flow.",
    "Emergency savings should stay available for unexpected costs.",
    "This purchase can wait without affecting essentials.",
    "A savings goal avoids adding a long payment commitment.",
  ],
};

const decisionExplanations: Record<PurchaseDecision, string> = {
  SAFE_TO_BUY: "This purchase fits within your current plan without displacing essential spending.",
  BUY_WITH_CAUTION:
    "This purchase may fit, but it would leave less room for changes or unexpected costs.",
  WAIT: "Waiting would give your monthly plan more room and reduce pressure on your priorities.",
  NOT_RECOMMENDED:
    "This purchase is not recommended right now because it would put too much pressure on your current plan.",
};

const recommendedActions: Record<PurchaseDecision, string> = {
  SAFE_TO_BUY: "Keep the purchase within the checked amount and avoid adding new financing costs.",
  BUY_WITH_CAUTION:
    "Compare a lower-cost option and keep enough cash available for essentials and surprises.",
  WAIT: "Use the cooldown period to review the need and build more room in your plan.",
  NOT_RECOMMENDED:
    "Pause this purchase, use the cooldown period, and save toward it as a goal.",
};

const navigationActionClass =
  "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-control px-4 text-sm font-semibold text-slate-700 ring-1 ring-border transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function PurchaseResult({
  check,
  currency,
  onAddGoal,
  onAddCooldown,
  onMarkStatus,
}: PurchaseResultProps) {
  const activeCheck = check ?? examplePurchaseCheck;
  const isExample = check === undefined;
  const displayCurrency = isExample ? "PHP" : currency;
  const [pendingMutation, setPendingMutation] = useState<MutationAction | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [statusOverride, setStatusOverride] = useState<{
    checkId: string;
    status: PurchaseCheckStatus;
  } | null>(null);
  const mutationInFlight = useRef(false);
  const displayedReasons = buildDisplayedReasons(activeCheck, displayCurrency);
  const currentStatus =
    statusOverride?.checkId === activeCheck.id
      ? statusOverride.status
      : activeCheck.status ?? "checked";

  const impactItems = [
    {
      label: "Purchase price",
      value: formatCurrency(activeCheck.amount, displayCurrency),
      detail: "Total amount included in this decision.",
    },
    {
      label: "Risk score",
      value: `${activeCheck.riskScore} / 100`,
      detail: "Higher scores mean more pressure on the current plan.",
    },
    {
      label: "Savings after purchase",
      value: formatCurrency(activeCheck.savingsAfterPurchase, displayCurrency),
      detail: "Projected savings left after the payment made today.",
    },
    {
      label: "Emergency fund impact",
      value: `${Math.round((activeCheck.emergencyProgress ?? 0) * 100)}% funded`,
      detail: "Emergency-buffer progress recorded when this check ran.",
    },
    {
      label: "Debt conflict",
      value: `${Math.round((activeCheck.debtPressure ?? 0) * 100)}% debt pressure`,
      detail: "Minimum debt payments compared with monthly income.",
    },
    {
      label: "Goal delay",
      value: formatMonths(activeCheck.goalDelayMonths ?? 0),
      detail: "Estimated delay to current goals from buying now.",
    },
    {
      label: "Safe to spend",
      value: formatCurrency(activeCheck.safeToSpend, displayCurrency),
      detail: "Current flexible amount after plan commitments.",
    },
    {
      label: "Monthly free cash",
      value: formatCurrency(activeCheck.monthlyFreeCashFlow, displayCurrency),
      detail: "Cash flow remaining after monthly commitments.",
    },
    {
      label: "Cooldown recommendation",
      value: `${activeCheck.cooldownDays} ${activeCheck.cooldownDays === 1 ? "day" : "days"}`,
      detail: "Time to pause before checking this purchase again.",
    },
  ];
  const mutationActionsDisabled = isExample || pendingMutation !== null;
  const statusActionsDisabled = mutationActionsDisabled || !onMarkStatus;

  async function runMutation(
    mutation: MutationAction,
    callback: (check: PurchaseCheck) => Promise<unknown> | unknown
  ) {
    if (isExample || mutationInFlight.current) {
      return;
    }

    mutationInFlight.current = true;
    setPendingMutation(mutation);
    setMutationError(null);

    try {
      await callback(activeCheck);
    } catch {
      setMutationError(mutationErrorMessages[mutation]);
    } finally {
      mutationInFlight.current = false;
      setPendingMutation(null);
    }
  }

  async function runStatusMutation(status: Exclude<PurchaseCheckStatus, "checked">) {
    if (isExample || !onMarkStatus || mutationInFlight.current) {
      return;
    }

    mutationInFlight.current = true;
    setPendingMutation(status);
    setMutationError(null);

    try {
      await onMarkStatus(activeCheck, status);
      setStatusOverride({ checkId: activeCheck.id, status });
    } catch {
      setMutationError(mutationErrorMessages[status]);
    } finally {
      mutationInFlight.current = false;
      setPendingMutation(null);
    }
  }

  return (
    <div className="grid gap-6">
      {isExample ? (
        <div className="rounded-card border border-caution/30 bg-caution/10 px-4 py-3 text-sm text-foreground">
          <p className="font-semibold text-caution">Example decision</p>
          <p className="mt-1 text-muted">
            Sample only — this is not your financial data. Values are shown in PHP.
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(15rem,0.38fr)_minmax(0,0.62fr)] lg:items-start">
        <Card aria-labelledby="purchase-summary-heading">
          <CardHeader>
            <CardTitle id="purchase-summary-heading">Purchase summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div>
              <p className="text-sm text-muted">Product</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{activeCheck.itemName}</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                {formatCurrency(activeCheck.amount, displayCurrency)}
              </p>
            </div>

            <dl className="grid gap-3 border-t border-border pt-4 text-sm">
              <SummaryRow label="Payment method">
                {formatPaymentMethod(activeCheck)}
              </SummaryRow>
              {activeCheck.category ? (
                <SummaryRow label="Category">{formatLabel(activeCheck.category)}</SummaryRow>
              ) : null}
              <SummaryRow label="Urgency">{formatLabel(activeCheck.urgency)}</SummaryRow>
              <SummaryRow label="Status">{statusLabels[currentStatus]}</SummaryRow>
              {activeCheck.location ? (
                <SummaryRow label="Location">{activeCheck.location}</SummaryRow>
              ) : null}
              {activeCheck.saleDeadline ? (
                <SummaryRow label="Sale deadline">
                  {formatDateLabel(activeCheck.saleDeadline)}
                </SummaryRow>
              ) : null}
              {activeCheck.monthlyPayment ? (
                <SummaryRow label="Monthly payment">
                  {formatCurrency(activeCheck.monthlyPayment, displayCurrency)}
                </SummaryRow>
              ) : null}
              {activeCheck.notes ? (
                <SummaryRow label="Notes">{activeCheck.notes}</SummaryRow>
              ) : null}
            </dl>

            <div className="rounded-control bg-slate-50 p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Decision confidence
              </p>
              <ScoreGauge
                score={decisionConfidence}
                label="Decision confidence"
                className="mt-2"
              />
              <p className="mt-1 text-xs leading-5 text-muted">
                Presentation confidence for this explanation, not a financial score.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardContent className="grid gap-4 p-6">
              <StatusBadge decision={activeCheck.decision} className="w-fit" />
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  {decisionHeadline(activeCheck.decision)}
                </h2>
                <p className="mt-2 max-w-2xl text-base leading-7 text-muted">
                  {decisionExplanations[activeCheck.decision]}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card aria-labelledby="plan-impact-heading">
            <CardHeader>
              <CardTitle id="plan-impact-heading">Plan impact</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3 sm:grid-cols-2">
                {impactItems.map((item) => (
                  <li key={item.label} className="rounded-control border border-border bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {item.label}
                    </p>
                    <p className="mt-2 text-xl font-bold text-foreground">{item.value}</p>
                    <p className="mt-1 text-xs leading-5 text-muted">{item.detail}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card aria-labelledby="decision-reasons-heading">
              <CardHeader>
                <CardTitle id="decision-reasons-heading">Why this decision</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-3">
                  {displayedReasons.map((reason, index) => (
                    <li key={`${index}-${reason}`} className="flex gap-3 text-sm leading-6 text-muted">
                      <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card aria-labelledby="advisor-explanation-heading">
              <CardHeader>
                <CardTitle id="advisor-explanation-heading">Advisor explanation</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5">
                <p className="text-sm leading-6 text-muted">{activeCheck.advisorText}</p>
                <div className="rounded-control border border-primary/20 bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Recommended action
                  </p>
                  <p className="mt-2 text-sm font-medium leading-6 text-foreground">
                    {recommendedActions[activeCheck.decision]}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 -mx-2 rounded-card border border-border bg-surface/95 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-elevated backdrop-blur lg:bottom-4 lg:mx-0 lg:p-3">
        {mutationError ? (
          <p role="alert" className="mb-3 rounded-control bg-risk/10 px-3 py-2 text-sm text-risk">
            {mutationError}
          </p>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          <Button
            type="button"
            variant="secondary"
            disabled={mutationActionsDisabled}
            isLoading={pendingMutation === "goal"}
            loadingText="Adding to goal..."
            onClick={() => void runMutation("goal", onAddGoal)}
          >
            <Target className="size-4" aria-hidden="true" />
            Add to Goal
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={mutationActionsDisabled}
            isLoading={pendingMutation === "cooldown"}
            loadingText="Adding to cooldown..."
            onClick={() => void runMutation("cooldown", onAddCooldown)}
          >
            <PauseCircle className="size-4" aria-hidden="true" />
            Add to Cooldown
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={statusActionsDisabled || currentStatus === "bought"}
            isLoading={pendingMutation === "bought"}
            loadingText="Marking bought..."
            onClick={() => void runStatusMutation("bought")}
          >
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Mark as bought
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={statusActionsDisabled || currentStatus === "skipped"}
            isLoading={pendingMutation === "skipped"}
            loadingText="Marking skipped..."
            onClick={() => void runStatusMutation("skipped")}
          >
            <XCircle className="size-4" aria-hidden="true" />
            Mark as skipped
          </Button>
          <Link href="/checker" className={navigationActionClass}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Check Another Purchase
          </Link>
          <Link href="/" className={cn(navigationActionClass, "text-primary")}>
            <LayoutDashboard className="size-4" aria-hidden="true" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-foreground">{children}</dd>
    </div>
  );
}

function formatPaymentMethod(check: PurchaseCheck) {
  const paymentMethod = formatLabel(check.paymentMethod);

  if (!check.installmentMonths) {
    return paymentMethod;
  }

  return `${paymentMethod} · ${check.installmentMonths} months`;
}

function formatMonths(months: number) {
  return `${months} ${months === 1 ? "month" : "months"}`;
}

function formatDateLabel(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function buildDisplayedReasons(check: PurchaseCheck, currency: CurrencyCode) {
  const reasons = [...check.reasons];

  if (reasons.length >= 5) {
    return reasons;
  }

  const referenceExplanations = [
    `This check compares a ${formatCurrency(check.amount, currency)} purchase with ${formatCurrency(check.safeToSpend, currency)} marked safe to spend.`,
    `Monthly free cash flow recorded for this check is ${formatCurrency(check.monthlyFreeCashFlow, currency)}.`,
    `The payment method recorded for this check is ${formatLabel(check.paymentMethod)}.`,
    `The suggested pause before checking again is ${check.cooldownDays} ${check.cooldownDays === 1 ? "day" : "days"}.`,
    `The purchase urgency is recorded as ${formatLabel(check.urgency)}.`,
  ];

  for (const explanation of referenceExplanations) {
    if (reasons.length >= 5) {
      break;
    }

    if (!reasons.includes(explanation)) {
      reasons.push(explanation);
    }
  }

  return reasons;
}

function decisionHeadline(decision: PurchaseDecision) {
  if (decision === "SAFE_TO_BUY") {
    return "This fits your current plan";
  }

  if (decision === "BUY_WITH_CAUTION") {
    return "Proceed only with a little extra care";
  }

  if (decision === "WAIT") {
    return "Give this purchase more time";
  }

  return "Not recommended right now";
}
