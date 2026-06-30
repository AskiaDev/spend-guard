"use client";

import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  CreditCard,
  LayoutDashboard,
  Lightbulb,
  PauseCircle,
  Search,
  ShieldCheck,
  Target,
  TriangleAlert,
  WalletCards,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { ScoreGauge } from "@/components/finance/score-gauge";
import { StatusBadge } from "@/components/finance/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import { AdvisorExplanation, LessonBlock } from "./advisor-explanation";
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

const navigationActionClass =
  "inline-flex h-12 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-control bg-secondary px-4 text-sm font-semibold text-foreground ring-1 ring-border transition-[background-color,box-shadow,filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const decisionVisuals = {
  SAFE_TO_BUY: {
    Icon: ShieldCheck,
    panelClass: "border-safe/45 shadow-[0_0_0_1px_rgb(95_208_138/0.12)]",
    iconClass: "border-safe text-safe",
    titleClass: "text-safe",
    metricClass: "text-safe",
    actionTitle: "Keep the plan intact",
    actionCopy: "Buy only at the checked amount and avoid adding extra financing.",
    nudge:
      "This fits your plan. Keep the purchase inside the checked amount so the buffer stays protected.",
  },
  BUY_WITH_CAUTION: {
    Icon: TriangleAlert,
    panelClass: "border-caution/45 shadow-[0_0_0_1px_rgb(240_180_80/0.12)]",
    iconClass: "border-caution text-caution",
    titleClass: "text-caution",
    metricClass: "text-caution",
    actionTitle: "Compare before buying",
    actionCopy: "Use the checked amount as a ceiling and keep cash available for surprises.",
    nudge:
      "A lower-cost option or shorter commitment can keep this from crowding out your priorities.",
  },
  WAIT: {
    Icon: Clock3,
    panelClass: "border-caution/45 shadow-[0_0_0_1px_rgb(240_180_80/0.12)]",
    iconClass: "border-caution text-caution",
    titleClass: "text-caution",
    metricClass: "text-caution",
    actionTitle: "Use the cooldown",
    actionCopy: "Give the purchase more time and check it again after your plan has more room.",
    nudge:
      "Waiting now gives your monthly plan more room and lowers the chance of a rushed decision.",
  },
  NOT_RECOMMENDED: {
    Icon: CircleAlert,
    panelClass: "border-risk/45 shadow-[0_0_0_1px_rgb(255_133_133/0.12)]",
    iconClass: "border-risk text-risk",
    titleClass: "text-risk",
    metricClass: "text-risk",
    actionTitle: "Pause this purchase",
    actionCopy: "Use the cooldown period, and save toward it as a goal.",
    nudge:
      "Take time to reassess. A short pause now can help protect your goals and financial stability.",
  },
} satisfies Record<
  PurchaseDecision,
  {
    Icon: typeof ShieldCheck;
    panelClass: string;
    iconClass: string;
    titleClass: string;
    metricClass: string;
    actionTitle: string;
    actionCopy: string;
    nudge: string;
  }
>;

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
  const [mutationSuccess, setMutationSuccess] = useState<string | null>(null);
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
  const decisionVisual = decisionVisuals[activeCheck.decision];
  const DecisionIcon = decisionVisual.Icon;

  const impactItems: Array<{
    label: string;
    value: string;
    detail: string | null;
    valueClass?: string;
  }> = [
    {
      label: "Purchase price",
      value: formatCurrency(activeCheck.amount, displayCurrency),
      detail: null,
    },
    {
      label: "Risk score",
      value: `${activeCheck.riskScore} / 100`,
      detail: riskLabel(activeCheck.riskScore),
      valueClass: decisionVisual.metricClass,
    },
    {
      label: "Goal delay",
      value: formatMonths(activeCheck.goalDelayMonths ?? 0),
      detail: "To current goals",
    },
    {
      label: "Safe to spend",
      value: formatCurrency(activeCheck.safeToSpend, displayCurrency),
      detail: "After commitments",
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
    setMutationSuccess(null);

    try {
      await callback(activeCheck);
      setMutationSuccess(
        mutation === "goal" ? "Goal created from this check." : "Cooldown item created."
      );
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
    setMutationSuccess(null);

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
    <div className="grid gap-5">
      {isExample ? (
        <div className="rounded-card border border-caution/30 bg-caution/10 px-4 py-3 text-sm text-foreground">
          <p className="font-semibold text-caution">Example decision</p>
          <p className="mt-1 text-muted-foreground">
            Sample only — this is not your financial data. Values are shown in PHP.
          </p>
        </div>
      ) : null}

      <section
        aria-labelledby="plan-impact-heading"
        className={cn(
          "overflow-hidden rounded-card border bg-[linear-gradient(135deg,rgb(255_255_255/0.075),rgb(255_255_255/0.035))] p-5 shadow-card backdrop-blur md:p-7",
          decisionVisual.panelClass
        )}
      >
        <h2 id="plan-impact-heading" className="sr-only">
          Plan impact
        </h2>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(30rem,0.95fr)] xl:items-center">
          <div className="flex min-w-0 gap-4 md:items-center md:gap-6">
            <span
              aria-hidden="true"
              className={cn(
                "flex size-20 shrink-0 items-center justify-center rounded-full border-4 bg-background/20 md:size-24",
                decisionVisual.iconClass
              )}
            >
              <DecisionIcon className="size-10 md:size-12" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <StatusBadge decision={activeCheck.decision} className="mb-3" />
              <h2
                className={cn(
                  "text-3xl font-bold leading-tight tracking-tight md:text-4xl",
                  decisionVisual.titleClass
                )}
              >
                {decisionHeadline(activeCheck.decision)}
              </h2>
              <p className="mt-2 max-w-2xl text-base leading-7 text-muted-foreground">
                {decisionExplanations[activeCheck.decision]}
              </p>
            </div>
          </div>

          <dl className="grid gap-0 border-t border-border pt-5 sm:grid-cols-2 xl:border-l xl:border-t-0 xl:pt-0">
            {impactItems.map((item) => (
              <div
                key={item.label}
                className="min-w-0 border-border py-3 sm:px-5 sm:[&:nth-child(odd)]:border-r xl:border-r xl:first:pt-0 xl:last:border-r-0"
              >
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </dt>
                <dd
                  className={cn(
                    "mt-2 truncate text-2xl font-bold tabular-nums text-foreground",
                    item.valueClass
                  )}
                >
                  {item.value}
                </dd>
                {item.detail ? (
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{item.detail}</p>
                ) : null}
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] xl:items-start">
        <div className="grid gap-5">
          <Card aria-labelledby="purchase-summary-heading" className="overflow-hidden">
            <CardHeader>
              <CardTitle id="purchase-summary-heading" className="text-2xl">
                Purchase summary
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-[minmax(0,1fr)_15rem] md:items-center">
              <dl className="grid gap-4 text-sm">
                <SummaryRow label="Product" icon={WalletCards}>
                  {activeCheck.itemName}
                </SummaryRow>
                <SummaryRow label="Payment method" icon={CreditCard}>
                  {formatPaymentMethod(activeCheck)}
                </SummaryRow>
                <SummaryRow label="Urgency" icon={Clock3}>
                  {formatLabel(activeCheck.urgency)}
                </SummaryRow>
                {activeCheck.monthlyPayment ? (
                  <SummaryRow label="Monthly payment" icon={CreditCard}>
                    {formatCurrency(activeCheck.monthlyPayment, displayCurrency)}
                  </SummaryRow>
                ) : null}
                {activeCheck.category ? (
                  <SummaryRow label="Category">{formatLabel(activeCheck.category)}</SummaryRow>
                ) : null}
                {activeCheck.location ? (
                  <SummaryRow label="Location">{activeCheck.location}</SummaryRow>
                ) : null}
                {activeCheck.saleDeadline ? (
                  <SummaryRow label="Sale deadline">
                    {formatDateLabel(activeCheck.saleDeadline)}
                  </SummaryRow>
                ) : null}
                {activeCheck.notes ? (
                  <SummaryRow label="Notes">{activeCheck.notes}</SummaryRow>
                ) : null}
                <SummaryRow label="Status">{statusLabels[currentStatus]}</SummaryRow>
              </dl>

              <div className="border-t border-border pt-5 text-center md:border-l md:border-t-0 md:pt-0 md:pl-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Decision confidence
                </p>
                <ScoreGauge
                  score={decisionConfidence}
                  label="Decision confidence"
                  className="mt-3"
                />
                <p className="mt-2 text-base font-semibold text-primary">
                  {confidenceLabel(decisionConfidence)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card aria-labelledby="decision-reasons-heading" className="overflow-hidden">
            <CardHeader>
              <CardTitle id="decision-reasons-heading" className="text-2xl">
                Why this decision
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2.5">
                {displayedReasons.map((reason, index) => (
                  <li
                    key={`${index}-${reason}`}
                    className="flex gap-3 text-sm leading-6 text-muted-foreground"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2 size-2 shrink-0 rounded-full bg-primary shadow-[0_0_14px_rgb(198_242_78/0.45)]"
                    />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card aria-label="Advisor explanation" className="overflow-hidden">
          <CardContent className="grid gap-6 p-6 md:p-7">
            <div className="flex gap-4">
              <span
                aria-hidden="true"
                className="flex size-14 shrink-0 items-center justify-center rounded-full border border-border bg-muted/20 text-primary"
              >
                <ShieldCheck className="size-7" />
              </span>
              <div className="min-w-0">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Recommended action
                </h2>
                <p className="mt-2 text-xl font-bold leading-tight text-primary">
                  {decisionVisual.actionTitle}
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  {decisionVisual.actionCopy}
                </p>
              </div>
            </div>

            <div className="border-t border-border pt-5">
              <h3 className="text-xl font-bold tracking-tight text-foreground">Advisor note</h3>
              <div className="mt-3">
                <AdvisorExplanation key={activeCheck.id} check={activeCheck} live={!isExample} />
              </div>
            </div>

            <div className="flex gap-4 rounded-control border border-primary/30 bg-primary/10 p-4 text-primary">
              <Lightbulb aria-hidden="true" className="mt-0.5 size-7 shrink-0" />
              <p className="text-sm font-semibold leading-6">{decisionVisual.nudge}</p>
            </div>

            <LessonBlock check={activeCheck} />
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 -mx-2 rounded-card border border-border bg-card/95 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-elevated backdrop-blur lg:bottom-4 lg:mx-0 lg:p-3">
        {mutationError ? (
          <p role="alert" className="mb-3 rounded-control bg-risk/10 px-3 py-2 text-sm text-risk">
            {mutationError}
          </p>
        ) : null}
        {mutationSuccess ? (
          <p role="status" className="mb-3 rounded-control bg-safe/10 px-3 py-2 text-sm text-safe">
            {mutationSuccess}
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          <Button
            type="button"
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
            disabled={mutationActionsDisabled}
            isLoading={pendingMutation === "goal"}
            loadingText="Adding to goal..."
            onClick={() => void runMutation("goal", onAddGoal)}
          >
            <Target className="size-4" aria-hidden="true" />
            Add to Goal
          </Button>
          <Link href="/checker" className={cn(navigationActionClass, "col-span-2 md:col-span-1")}>
            <Search className="size-4" aria-hidden="true" />
            Check Another Purchase
          </Link>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
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
          <Link href="/" className={cn(navigationActionClass, "text-primary")}>
            <LayoutDashboard className="size-4" aria-hidden="true" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  children,
  icon: Icon,
}: {
  label: string;
  children: React.ReactNode;
  icon?: typeof WalletCards;
}) {
  return (
    <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)] items-start gap-3">
      <span aria-hidden="true" className="mt-0.5 text-primary">
        {Icon ? <Icon className="size-5" /> : null}
      </span>
      <dt className="min-w-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-foreground break-words">{children}</dd>
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

function riskLabel(score: number) {
  if (score >= 85) {
    return "Very high";
  }

  if (score >= 65) {
    return "High";
  }

  if (score >= 35) {
    return "Moderate";
  }

  return "Low";
}

function confidenceLabel(score: number) {
  if (score >= 85) {
    return "High confidence";
  }

  if (score >= 60) {
    return "Moderate confidence";
  }

  return "Low confidence";
}
