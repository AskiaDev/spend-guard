"use client";

import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  CircleAlert,
  Coins,
  Landmark,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  TriangleAlert,
  WalletCards,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { ProgressRing } from "@/components/finance/progress-ring";
import { ScoreGauge } from "@/components/finance/score-gauge";
import { StatusBadge } from "@/components/finance/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  describeHealthStatus,
  generateAdvisorInsight,
} from "@/features/dashboard/lib/advisor-insight";
import {
  exampleOnlyPurchaseReferences,
  referenceGoals,
  referencePurchases,
} from "@/features/reference-data";
import { getHealthStatus, type HealthStatus } from "@/lib/calculations/health-score";
import { getMonthlyRecurringAmount } from "@/lib/calculations/next-due-date";
import { getUpcomingDebts, getUpcomingDebtTotal } from "@/lib/calculations/upcoming-debt";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  CurrencyCode,
  FinancialSnapshot,
  Goal,
  PurchaseCheck,
  PurchaseUrgency,
} from "@/types/finance";

interface DashboardOverviewProps {
  snapshot: FinancialSnapshot;
  checks: PurchaseCheck[];
  metrics: {
    safeToSpend: number;
    monthlyFreeCashFlow: number;
    healthScore: number;
  };
  /** Reference "today" for the upcoming-debt window. Defaults to now; injectable for deterministic tests. */
  referenceDate?: Date;
}

export function DashboardOverview({
  snapshot,
  checks,
  metrics,
  referenceDate,
}: DashboardOverviewProps) {
  const currency = snapshot.profile.currency;
  const totalExpenses = snapshot.expenses.reduce(
    (total, expense) =>
      total +
      (expense.isRecurring
        ? getMonthlyRecurringAmount(expense.amount, expense.paymentCadence)
        : expense.amount),
    0
  );
  const totalDebtPayments = snapshot.debts.reduce(
    (total, debt) =>
      total + getMonthlyRecurringAmount(debt.minimumPayment, debt.paymentCadence),
    0
  );
  const totalDebtBalance = snapshot.debts.reduce(
    (total, debt) => total + debt.outstandingBalance,
    0
  );
  const monthlyGoalFunding = snapshot.goals.reduce(
    (total, goal) => total + goal.monthlyContribution,
    0
  );
  const emergencyProgress = getPercentage(
    snapshot.profile.currentSavings,
    snapshot.profile.emergencyFundTarget
  );
  const recentChecks = checks.slice(0, 3);
  const variableExpenses = snapshot.profile.estimatedVariableExpenses ?? 0;
  const healthStatus = getHealthStatus(metrics.healthScore);
  const now = referenceDate ?? new Date();
  const upcomingDebts = getUpcomingDebts(snapshot.debts, now);
  const upcomingDebtGroups = groupUpcomingDebts(upcomingDebts);
  const upcomingDebtTotal = getUpcomingDebtTotal(snapshot.debts, now);
  const advisor = generateAdvisorInsight({ metrics, snapshot });

  return (
    <div className="grid gap-5">
      <HealthStatusBanner status={healthStatus} />

      <InlineNotice tone="warning" title="Spending guardrail">
        Safe to spend is a guardrail, not permission to drain savings. Re-check expensive wants
        before using credit.
      </InlineNotice>

      <div data-testid="dashboard-kpi-grid" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KpiCard
          icon={<PiggyBank className="size-5" />}
          label="Current Savings"
          value={formatCurrency(snapshot.profile.currentSavings, currency)}
          helper={`${formatCurrency(snapshot.profile.emergencyFundTarget, currency)} emergency target`}
          tone="safe"
        />
        <KpiCard
          icon={<WalletCards className="size-5" />}
          label="Safe to Spend"
          value={formatCurrency(metrics.safeToSpend, currency)}
          helper="Calculated from today’s plan"
          tone={metrics.safeToSpend > 0 ? "safe" : "risk"}
        />
        <KpiCard
          icon={<ShieldCheck className="size-5" />}
          label="Emergency Progress"
          value={`${emergencyProgress}%`}
          helper={`${formatCurrency(snapshot.profile.currentSavings, currency)} saved`}
          tone={emergencyProgress >= 80 ? "safe" : "caution"}
          aside={
            <ProgressRing
              value={emergencyProgress}
              label="Emergency fund progress"
              size={60}
              strokeWidth={6}
            />
          }
        />
        <KpiCard
          icon={<ReceiptText className="size-5" />}
          label="Monthly Expenses"
          value={formatCurrency(totalExpenses, currency)}
          helper={`${snapshot.expenses.length} recurring bills`}
          tone="neutral"
        />
        <KpiCard
          icon={<Landmark className="size-5" />}
          label="Debt Payments"
          value={formatCurrency(totalDebtPayments, currency)}
          helper={`${formatCurrency(totalDebtBalance, currency)} total balance`}
          tone={totalDebtBalance > 0 ? "caution" : "safe"}
        />
        <KpiCard
          icon={<Activity className="size-5" />}
          label="Free Cash Flow"
          value={formatCurrency(metrics.monthlyFreeCashFlow, currency)}
          helper={`${formatCurrency(monthlyGoalFunding, currency)} goal funding`}
          tone={metrics.monthlyFreeCashFlow > 0 ? "safe" : "risk"}
        />
        <KpiCard
          icon={<Coins className="size-5" />}
          label="Variable Expenses"
          value={formatCurrency(variableExpenses, currency)}
          helper="Estimated, factored into free cash flow"
          tone="neutral"
        />
      </div>

      <Card data-testid="upcoming-debt-card" aria-labelledby="upcoming-debt-heading">
        <CardHeader>
          <CardTitle id="upcoming-debt-heading">Upcoming Debt (30 days)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {upcomingDebts.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {formatCurrency(upcomingDebtTotal, currency)}
                </span>{" "}
                due across {upcomingDebts.length}{" "}
                {upcomingDebts.length === 1 ? "payment" : "payments"} from{" "}
                {upcomingDebtGroups.length} {upcomingDebtGroups.length === 1 ? "debt" : "debts"}
              </p>
              <ul className="grid gap-3">
                {upcomingDebtGroups.map((group) => (
                  <li
                    key={group.debt.id}
                    className="flex items-center justify-between gap-3 rounded-control border border-border bg-muted/30 p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{group.debt.label}</p>
                      <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarDays aria-hidden="true" className="size-3.5" />
                        {formatUpcomingDebtDetail(group)}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold text-foreground">
                      {formatCurrency(group.total, currency)}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              No debt payments are due in the next 30 days. Debts you add with a due date will show
              up here.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card aria-labelledby="active-goals-heading">
          <CardHeader>
            <CardTitle id="active-goals-heading">Active Goals</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {snapshot.goals.length > 0 ? (
              snapshot.goals.map((goal) => (
                <GoalRow key={goal.id} goal={goal} currency={currency} />
              ))
            ) : (
              <EmptyState
                title="No active goals yet"
                description="Add one savings target so SpendGuard can show goal tradeoffs on the dashboard."
                action={<ActionLink href="/goals">Add first goal</ActionLink>}
                illustration={{
                  src: "/illustrations/personal-finance.svg",
                  alt: "Person reviewing personal finance goals",
                  width: 180,
                  height: 150,
                }}
                className="min-h-52"
              />
            )}
          </CardContent>
        </Card>

        <Card aria-labelledby="recent-checks-heading">
          <CardHeader>
            <CardTitle id="recent-checks-heading">Recent Checks</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {recentChecks.length > 0 ? (
              recentChecks.map((check, index) => (
                <RecentCheckRow
                  key={check.id}
                  check={check}
                  currency={currency}
                  className={index > 0 ? "hidden lg:grid" : undefined}
                />
              ))
            ) : (
              <div className="grid gap-4">
                <EmptyState
                  title="Run your first purchase check"
                  description="Your real checks will appear here with clear status labels once they are saved."
                  action={<ActionLink href="/checker">Run your first purchase check</ActionLink>}
                  illustration={{
                    src: "/illustrations/payment-info.svg",
                    alt: "Person entering payment details",
                    width: 180,
                    height: 150,
                  }}
                  className="min-h-52"
                />
                <div className="rounded-control border border-dashed border-border bg-muted/40 p-4 text-xs leading-5 text-muted-foreground">
                  <p className="font-semibold uppercase tracking-normal text-foreground">
                    Example-only empty content
                  </p>
                  <ul className="mt-2 grid gap-1">
                    {exampleOnlyPurchaseReferences.map((reference) => (
                      <li key={reference}>{reference}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card aria-labelledby="advisor-insight-heading" className="lg:col-span-full">
        <CardContent className="grid gap-5 md:grid-cols-[auto_1fr] md:items-center lg:grid-cols-[auto_minmax(0,1fr)_14rem]">
          <ScoreGauge score={metrics.healthScore} label="Financial health score" />
          <div className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-normal text-primary">
              Advisor insight
            </p>
            <h2 id="advisor-insight-heading" className="text-xl font-semibold text-foreground">
              {advisor.title}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {advisor.body} You currently have{" "}
              {formatCurrency(metrics.monthlyFreeCashFlow, currency)} in monthly free cash flow
              after committed expenses, debt payments, and goal funding.
            </p>
          </div>
          <div className="grid gap-3 justify-items-start">
            <Image
              src="/illustrations/personal-finance.svg"
              alt="Person reviewing personal finance progress"
              width={224}
              height={180}
              loading="eager"
              className="hidden h-auto w-44 lg:block"
            />
            <ActionLink href="/reports">
              Read full insight
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </ActionLink>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type UpcomingDebtItem = ReturnType<typeof getUpcomingDebts>[number];

interface UpcomingDebtGroup {
  debt: UpcomingDebtItem["debt"];
  payments: UpcomingDebtItem[];
  total: number;
}

function groupUpcomingDebts(items: UpcomingDebtItem[]): UpcomingDebtGroup[] {
  const byDebtId = new Map<string, UpcomingDebtGroup>();

  for (const item of items) {
    const previous = byDebtId.get(item.debt.id);
    const next = previous
      ? {
          ...previous,
          payments: [...previous.payments, item],
          total: previous.total + item.debt.minimumPayment,
        }
      : {
          debt: item.debt,
          payments: [item],
          total: item.debt.minimumPayment,
        };

    byDebtId.set(item.debt.id, next);
  }

  return [...byDebtId.values()];
}

const healthStatusPresentation: Record<
  HealthStatus,
  { Icon: typeof ShieldCheck; className: string }
> = {
  Strong: { Icon: ShieldCheck, className: "border-safe/25 bg-safe/10 text-safe" },
  Stable: { Icon: Activity, className: "border-primary/25 bg-primary/10 text-primary" },
  Caution: { Icon: TriangleAlert, className: "border-caution/25 bg-caution/10 text-caution" },
  Risky: { Icon: CircleAlert, className: "border-risk/25 bg-risk/10 text-risk" },
};

function HealthStatusBanner({ status }: { status: HealthStatus }) {
  const { Icon, className } = healthStatusPresentation[status];

  return (
    <div
      data-testid="health-status-banner"
      role="region"
      aria-label="Financial health status"
      className={cn("flex items-start gap-4 rounded-card border px-5 py-4", className)}
    >
      <div className="grid size-11 shrink-0 place-items-center rounded-control bg-card/50">
        <Icon aria-hidden="true" className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-normal">Financial health</p>
        <p className="text-lg font-semibold text-foreground">Your finances are {status}</p>
        <p className="mt-0.5 text-sm leading-5 text-muted-foreground">{describeHealthStatus(status)}</p>
      </div>
    </div>
  );
}

function formatDueWindow(daysUntilDue: number) {
  if (daysUntilDue === 0) {
    return "Due today";
  }

  if (daysUntilDue === 1) {
    return "In 1 day";
  }

  return `In ${daysUntilDue} days`;
}

function formatUpcomingDebtDetail(group: UpcomingDebtGroup) {
  if (group.payments.length === 1) {
    const [payment] = group.payments;
    return `Due ${formatShortDate(payment.nextDueDate)} · ${formatDueWindow(payment.daysUntilDue)}`;
  }

  const dates = group.payments.map((payment) => formatShortDate(payment.nextDueDate)).join(", ");
  return `${group.payments.length} payments · ${dates}`;
}

function ActionLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn(buttonVariants({ variant: "secondary" }), className)}>
      {children}
    </Link>
  );
}

function KpiCard({
  icon,
  label,
  value,
  helper,
  tone,
  aside,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
  tone: "safe" | "caution" | "risk" | "neutral";
  aside?: ReactNode;
}) {
  const iconTone = {
    safe: "bg-safe/10 text-safe",
    caution: "bg-caution/10 text-caution",
    risk: "bg-risk/10 text-risk",
    neutral: "bg-secondary text-muted-foreground",
  }[tone];

  return (
    <Card aria-label={`${label} card`} className="min-w-0">
      <CardContent className="flex min-h-40 flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className={cn("grid size-10 place-items-center rounded-control", iconTone)}>
            {icon}
          </div>
          {aside}
        </div>
        <div className="min-w-0">
          <h3 className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{label}</h3>
          <p className="mt-1 truncate text-2xl font-semibold text-foreground">{value}</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{helper}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function GoalRow({ goal, currency }: { goal: Goal; currency: CurrencyCode }) {
  const progress = getPercentage(goal.savedAmount, goal.targetAmount);
  const helper = referenceGoals[goal.id]?.helperText ?? `${formatPriority(goal.priority)} goal`;

  return (
    <div className="grid gap-4 rounded-control border border-border bg-muted/30 p-4 sm:grid-cols-[auto_1fr] sm:items-center">
      <ProgressRing value={progress} label={`${goal.label} progress`} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-foreground">{goal.label}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatCurrency(goal.savedAmount, currency)} of{" "}
              {formatCurrency(goal.targetAmount, currency)}
            </p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
            {formatPriority(goal.priority)}
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{helper}</p>
        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarDays aria-hidden="true" className="size-3.5" />
          {formatCurrency(goal.monthlyContribution, currency)} monthly contribution
          {goal.targetDate ? ` · Target ${formatShortDate(goal.targetDate)}` : ""}
        </p>
      </div>
    </div>
  );
}

function RecentCheckRow({
  check,
  currency,
  className,
}: {
  check: PurchaseCheck;
  currency: CurrencyCode;
  className?: string;
}) {
  const reference = getPurchaseReference(check);

  return (
    <article
      className={cn(
        "grid gap-3 rounded-control border border-border bg-muted/30 p-4 text-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">{check.itemName}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {reference.vendorStyle} · {reference.category}
          </p>
        </div>
        <StatusBadge decision={check.decision} />
      </div>
      <div className="grid gap-2 text-muted-foreground sm:grid-cols-2">
        <p>{formatCurrency(check.amount, currency)}</p>
        <p className="sm:text-right">Checked {formatShortDate(check.createdAt)}</p>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">{check.reasons[0] ?? check.advisorText}</p>
    </article>
  );
}

function getPurchaseReference(check: PurchaseCheck) {
  return (
    referencePurchases[check.id] ?? {
      category: formatUrgency(check.urgency),
      vendorStyle: "Purchase check",
    }
  );
}

function getPercentage(current: number, target: number) {
  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) {
    return 100;
  }

  return Math.max(0, Math.min(100, Math.round((current / target) * 100)));
}

function formatPriority(priority: Goal["priority"]) {
  const labels = {
    high: "High priority",
    medium: "Medium priority",
    low: "Low priority",
  };

  return labels[priority];
}

function formatUrgency(urgency: PurchaseUrgency) {
  const labels = {
    need_now: "Needed now",
    need_this_month: "Needed this month",
    can_wait: "Can wait",
    want: "Want",
  };

  return labels[urgency];
}

const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

function formatShortDate(value: string) {
  const date = parseDisplayDate(value);

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function parseDisplayDate(value: string) {
  const dateOnlyMatch = dateOnlyPattern.exec(value);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  return new Date(value);
}
