"use client";

import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  CircleAlert,
  Coins,
  CreditCard,
  Landmark,
  MoreVertical,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Target,
  TriangleAlert,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ProgressRing } from "@/components/finance/progress-ring";
import { StatusBadge } from "@/components/finance/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  const cashFlowSeries = buildCashFlowSeries(snapshot, metrics, now);

  return (
    <div className="grid gap-4">
      <section className="grid gap-4 lg:grid-cols-2 lg:gap-3 xl:grid-cols-[1.18fr_1fr_1fr_1fr]">
        <HealthStatusBanner status={healthStatus} score={metrics.healthScore} />
        <SafeToSpendCard
          icon={<WalletCards className="size-5" />}
          safeToSpend={metrics.safeToSpend}
          freeCashFlow={metrics.monthlyFreeCashFlow}
          currency={currency}
        />
        <EmergencyProgressCard
          currentSavings={snapshot.profile.currentSavings}
          emergencyTarget={snapshot.profile.emergencyFundTarget}
          monthlyGoalFunding={monthlyGoalFunding}
          progress={emergencyProgress}
          currency={currency}
        />
        <FreeCashFlowCard
          currency={currency}
          freeCashFlow={metrics.monthlyFreeCashFlow}
          series={cashFlowSeries}
        />
      </section>

      <div
        data-testid="dashboard-kpi-grid"
        className="glass grid grid-cols-2 overflow-hidden rounded-card bg-card lg:grid-cols-3 xl:grid-cols-6"
      >
        <KpiCard
          icon={<PiggyBank className="size-5" />}
          label="Current Savings"
          value={formatCurrency(snapshot.profile.currentSavings, currency)}
          helper="Emergency reserve"
          tone="safe"
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
          icon={<Coins className="size-5" />}
          label="Variable Expenses"
          value={formatCurrency(variableExpenses, currency)}
          helper="Estimated, factored into free cash flow"
          tone="neutral"
        />
        <KpiCard
          icon={<CreditCard className="size-5" />}
          label="Total Debt Balance"
          value={formatCurrency(totalDebtBalance, currency)}
          helper={`${snapshot.debts.length} active accounts`}
          tone={totalDebtBalance > 0 ? "caution" : "safe"}
        />
        <KpiCard
          icon={<Activity className="size-5" />}
          label="Goal Funding"
          value={formatCurrency(monthlyGoalFunding, currency)}
          helper="Committed to goals"
          tone={monthlyGoalFunding <= metrics.monthlyFreeCashFlow ? "safe" : "caution"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.88fr)_minmax(340px,0.96fr)]">
        <CashFlowCard
          currency={currency}
          data={cashFlowSeries}
          income={snapshot.profile.monthlyIncome}
          expenses={snapshot.profile.monthlyIncome - metrics.monthlyFreeCashFlow}
          freeCashFlow={metrics.monthlyFreeCashFlow}
        />

        <Card
          data-testid="upcoming-debt-card"
          aria-labelledby="upcoming-debt-heading"
          className="min-h-[360px] gap-4 overflow-hidden py-0"
        >
          <CardHeader className="px-5 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle
                  id="upcoming-debt-heading"
                  className="flex items-center gap-2 text-[13px] uppercase tracking-normal text-muted-foreground"
                >
                  <CalendarDays aria-hidden="true" className="size-3.5" />
                  Upcoming Debt (30 days)
                </CardTitle>
                <CardDescription className="mt-3 text-sm leading-6">
                  <span className="text-2xl font-semibold text-foreground">
                    {formatCurrency(upcomingDebtTotal, currency)}
                  </span>{" "}
                  due across {upcomingDebts.length}{" "}
                  {upcomingDebts.length === 1 ? "payment" : "payments"} from{" "}
                  {upcomingDebtGroups.length} {upcomingDebtGroups.length === 1 ? "debt" : "debts"}
                </CardDescription>
              </div>
              <TextActionLink href="/debts">
                View all debts
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </TextActionLink>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 px-5 pb-5">
            {upcomingDebts.length > 0 ? (
              <ul className="relative grid gap-0 before:absolute before:bottom-5 before:left-[4.125rem] before:top-5 before:w-px before:bg-border">
                {upcomingDebts.map((item, index) => (
                  <li
                    key={`${item.debt.id}-${item.nextDueDate}`}
                    className="relative grid grid-cols-[2.75rem_1.25rem_1fr_auto] items-center gap-3 border-b border-border/70 py-3.5 last:border-b-0"
                  >
                    <time
                      dateTime={item.nextDueDate}
                      className="grid justify-items-center text-xs font-semibold uppercase text-muted-foreground"
                    >
                      <span>{formatShortDateParts(item.nextDueDate).month}</span>
                      <span className="text-base leading-none text-foreground">
                        {formatShortDateParts(item.nextDueDate).day}
                      </span>
                    </time>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "z-10 justify-self-center rounded-full border-2 ring-4 ring-[var(--card-solid)]",
                        index === 0
                          ? "size-4 border-caution bg-caution shadow-[0_0_0_3px_rgb(240_180_80/0.12)]"
                          : "size-3 border-muted-foreground/60 bg-[var(--card-solid)]"
                      )}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-foreground">
                        {item.debt.label}
                      </p>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {formatDueWindow(item.daysUntilDue)}
                      </p>
                    </div>
                    <div className="grid justify-items-end gap-1">
                      <p className="shrink-0 font-semibold text-foreground">
                        {formatCurrency(item.debt.minimumPayment, currency)}
                      </p>
                      {item.daysUntilDue <= 1 ? (
                        <span className="rounded-full border border-caution/35 bg-caution/10 px-2 py-0.5 text-[10px] font-semibold text-caution">
                          Due soon
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                No debt payments are due in the next 30 days. Debts you add with a due date will show
                up here.
              </p>
            )}
            <TextActionLink href="/debts" className="mt-auto justify-self-start">
              View all debt payments
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </TextActionLink>
          </CardContent>
        </Card>

        <GoalsProgressCard goals={snapshot.goals} currency={currency} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card aria-labelledby="recent-checks-heading" className="gap-4 overflow-hidden py-0">
          <CardHeader className="px-5 pt-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <CardTitle
                  id="recent-checks-heading"
                  className="flex items-center gap-2 text-[13px] uppercase tracking-normal text-muted-foreground"
                >
                  <Activity aria-hidden="true" className="size-3.5" />
                  Recent Checks & Spending Intelligence
                </CardTitle>
                <CardDescription className="mt-1 text-sm leading-6">
                  Latest purchase decisions saved in SpendGuard
                </CardDescription>
              </div>
              <TextActionLink href="/checker">
                View all checks
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </TextActionLink>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 px-5 pb-5">
            {recentChecks.length > 0 ? (
              <>
                <div className="grid gap-2">
                  {recentChecks.map((check) => (
                    <RecentCheckRow key={check.id} check={check} currency={currency} />
                  ))}
                </div>
                <div className="grid grid-cols-[2.25rem_1fr] gap-3 rounded-control border border-caution/35 bg-caution/10 p-4">
                  <span className="grid size-9 place-items-center rounded-control bg-caution/15 text-caution">
                    <Sparkles aria-hidden="true" className="size-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-foreground">
                      You’ve run {recentChecks.length} checks this month
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Great job being intentional with your spending.
                    </p>
                  </div>
                </div>
              </>
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

        <Card aria-labelledby="advisor-insight-heading" className="gap-4 overflow-hidden py-0">
          <CardContent className="grid gap-6 p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_8.5rem] lg:items-start">
              <div className="grid gap-3">
                <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-normal text-primary">
                  <Target aria-hidden="true" className="size-4" />
                  Advisor insight
                </p>
                <h2 id="advisor-insight-heading" className="text-2xl font-semibold text-foreground">
                  {advisor.title}
                </h2>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  {advisor.body} You currently have{" "}
                  {formatCurrency(metrics.monthlyFreeCashFlow, currency)} in monthly free cash flow
                  after committed expenses, debt payments, and goal funding.
                </p>
              </div>
              <div className="hidden justify-items-center gap-2 lg:grid">
                <ProgressRing
                  value={metrics.healthScore}
                  label="Advisor execution score"
                  size={104}
                  strokeWidth={8}
                >
                  <span className="grid leading-none">
                    <span className="text-lg font-semibold">{Math.round(metrics.healthScore)} / 100</span>
                    <span className="mt-1 text-[10px] font-semibold text-muted-foreground">
                      Execution Score
                    </span>
                  </span>
                </ProgressRing>
                <p className="text-xs font-semibold text-safe">Good Progress</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <AdvisorAction
                label="Prioritize debt payoff"
                value="Reduce upcoming pressure"
                nextStep="Focus on upcoming payments"
                impact="High Impact"
                icon={<Landmark className="size-4" />}
              />
              <AdvisorAction
                label="Grow emergency fund"
                value="Increase security & flexibility"
                nextStep="Keep monthly funding active"
                impact="Medium Impact"
                icon={<ShieldCheck className="size-4" />}
              />
              <AdvisorAction
                label="Optimize cash flow"
                value="Reduce spending leakage"
                nextStep="Review subscriptions"
                impact="Low Effort"
                icon={<Activity className="size-4" />}
              />
            </div>

            <TextActionLink href="/reports" className="justify-self-start">
              View full strategy report
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </TextActionLink>
          </CardContent>
        </Card>
      </div>
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
  Strong: { Icon: ShieldCheck, className: "border-safe/35 text-safe" },
  Stable: { Icon: Activity, className: "border-primary/35 text-primary" },
  Caution: { Icon: TriangleAlert, className: "border-caution/35 text-caution" },
  Risky: { Icon: CircleAlert, className: "border-risk/35 text-risk" },
};

function HealthStatusBanner({
  status,
  score,
}: {
  status: HealthStatus;
  score: number;
}) {
  const { Icon, className } = healthStatusPresentation[status];

  return (
    <Card
      data-testid="health-status-banner"
      role="region"
      aria-label="Financial health status"
      className={cn(
        "relative min-h-[164px] overflow-hidden py-0",
        "bg-[linear-gradient(115deg,rgba(95,208,138,0.12),rgba(255,255,255,0.045)_52%,rgba(255,255,255,0.035))]",
        className
      )}
    >
      <CardContent className="relative flex h-full flex-col gap-4 p-5 sm:p-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          <Icon aria-hidden="true" className="size-4" />
          Financial Health
        </p>
        <div className="grid flex-1 grid-cols-[5.75rem_minmax(0,1fr)] items-center gap-5 sm:grid-cols-[7.25rem_1fr]">
          <ProgressRing
            value={score}
            label="Financial health score"
            role="meter"
            size={92}
            strokeWidth={8}
          >
            <span className="grid leading-none">
              <span className="text-2xl font-semibold">{Math.round(score)}</span>
              <span className="mt-1 text-[11px] font-semibold text-muted-foreground">/100</span>
            </span>
          </ProgressRing>
          <div className="min-w-0 border-l border-border pl-4 sm:pl-5">
            <p className="flex items-center gap-2 text-xl font-semibold text-current">
              {status}
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {describeHealthStatus(status)}
            </p>
            <ActionLink href="/reports" className="mt-4 h-9 px-3 text-xs">
              View full analysis
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </ActionLink>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDueWindow(daysUntilDue: number) {
  if (daysUntilDue === 0) {
    return "Due today";
  }

  if (daysUntilDue === 1) {
    return "Due tomorrow";
  }

  return `Due in ${daysUntilDue} days`;
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

function TextActionLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-semibold text-chart-3 transition hover:text-primary",
        className
      )}
    >
      {children}
    </Link>
  );
}

interface CashFlowPoint {
  label: string;
  income: number;
  expenses: number;
  freeCashFlow: number;
}

function SafeToSpendCard({
  icon,
  safeToSpend,
  freeCashFlow,
  currency,
}: {
  icon: ReactNode;
  safeToSpend: number;
  freeCashFlow: number;
  currency: CurrencyCode;
}) {
  const percent = getPercentage(safeToSpend, Math.max(freeCashFlow, 1));

  return (
    <Card aria-label="Safe to Spend card" className="min-h-[164px] overflow-hidden py-0">
      <CardContent className="flex h-full flex-col p-5 sm:p-4">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            Safe to Spend
          </h3>
          <span className="grid size-9 place-items-center rounded-control bg-chart-3/10 text-chart-3">
            {icon}
          </span>
        </div>
        <div className="mt-6 sm:mt-8">
          <p className="truncate text-3xl font-semibold text-foreground">
            {formatCurrency(safeToSpend, currency)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            of {formatCurrency(freeCashFlow, currency)} free cash flow
          </p>
          <div className="mt-4 h-2 rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", safeToSpend > 0 ? "bg-primary" : "bg-muted")}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{percent}% of free cash flow</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmergencyProgressCard({
  currentSavings,
  emergencyTarget,
  monthlyGoalFunding,
  progress,
  currency,
}: {
  currentSavings: number;
  emergencyTarget: number;
  monthlyGoalFunding: number;
  progress: number;
  currency: CurrencyCode;
}) {
  return (
    <Card aria-label="Emergency Progress card" className="min-h-[164px] overflow-hidden py-0">
      <CardContent className="h-full p-5 sm:p-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            <ShieldCheck aria-hidden="true" className="size-4 text-safe" />
            Emergency Progress
          </h3>
          <span className="grid size-9 place-items-center rounded-control bg-safe/10 text-safe">
            <ShieldCheck aria-hidden="true" className="size-4" />
          </span>
        </div>
        <div className="mt-5 grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-5 sm:mt-4 sm:gap-4">
          <ProgressRing
            value={progress}
            label="Emergency fund progress"
            size={72}
            strokeWidth={7}
          />
          <div className="min-w-0 border-l border-border pl-4">
            <p className="text-xl font-semibold text-foreground">
              {formatCurrency(currentSavings, currency)}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                of {formatCurrency(emergencyTarget, currency)}
              </span>
            </p>
            <p className="mt-2 text-xs font-semibold text-safe">On track</p>
            <p className="mt-3 text-xs text-muted-foreground">
              {formatCurrency(monthlyGoalFunding, currency)} monthly contribution
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FreeCashFlowCard({
  currency,
  freeCashFlow,
  series,
}: {
  currency: CurrencyCode;
  freeCashFlow: number;
  series: CashFlowPoint[];
}) {
  const status = freeCashFlow >= 0 ? "Positive" : "Tight";

  return (
    <Card aria-label="Free Cash Flow card" className="min-h-[164px] overflow-hidden py-0">
      <CardContent className="grid h-full gap-4 p-5 sm:gap-3 sm:p-4">
        <div>
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            <Activity aria-hidden="true" className="size-4 text-chart-3" />
            Free Cash Flow (Month)
          </h3>
          <div className="mt-5 flex min-w-0 flex-wrap items-center gap-2">
            <p className="truncate text-2xl font-semibold text-foreground">
              {formatCurrency(freeCashFlow, currency)}
            </p>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                freeCashFlow >= 0 ? "bg-safe/10 text-safe" : "bg-risk/10 text-risk"
              )}
            >
              <ArrowUpRight aria-hidden="true" className="size-3" />
              {status}
            </span>
          </div>
          <p className="mt-1 text-xs text-safe">After committed outflow</p>
        </div>
        <CashFlowSparkline
          values={series.map((point) => point.freeCashFlow)}
          className="h-20 w-full self-end sm:h-16"
        />
      </CardContent>
    </Card>
  );
}

function CashFlowCard({
  currency,
  data,
  income,
  expenses,
  freeCashFlow,
}: {
  currency: CurrencyCode;
  data: CashFlowPoint[];
  income: number;
  expenses: number;
  freeCashFlow: number;
}) {
  return (
    <Card
      aria-labelledby="cash-flow-heading"
      className="min-h-[400px] gap-4 overflow-hidden py-0 sm:min-h-[440px]"
    >
      <CardHeader className="px-5 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle
              id="cash-flow-heading"
              className="flex items-center gap-2 text-[13px] uppercase tracking-normal text-muted-foreground"
            >
              <Activity aria-hidden="true" className="size-3.5" />
              Cash Flow Overview
            </CardTitle>
            <CardDescription className="mt-3 text-sm">
              <span className="text-2xl font-semibold text-foreground">
                {formatCurrency(freeCashFlow, currency)}
              </span>{" "}
              free cash flow this month
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <ChartLegend color="bg-safe" label="Income" />
            <ChartLegend color="bg-chart-3" label="Expenses" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 px-5 pb-5 sm:gap-5">
        <div
          data-testid="cash-flow-chart"
          className="relative min-h-56 flex-1 rounded-control border border-border bg-background/30 p-3 sm:min-h-64 sm:p-4"
        >
          <CashFlowAreaSvg data={data} currency={currency} />
          <CashFlowTooltipLayer data={data} currency={currency} />
        </div>
        <div className="mt-auto grid grid-cols-3 gap-3 border-t border-border pt-4 sm:gap-4">
          <SummaryMetric label="Income" value={formatCurrency(income, currency)} tone="safe" />
          <SummaryMetric label="Expenses" value={formatCurrency(expenses, currency)} tone="risk" />
          <SummaryMetric
            label="Net Cash Flow"
            value={formatCurrency(freeCashFlow, currency)}
            tone={freeCashFlow >= 0 ? "safe" : "risk"}
          />
        </div>
        <TextActionLink href="/reports" className="justify-self-start">
          View full cash flow report
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </TextActionLink>
      </CardContent>
    </Card>
  );
}

function ChartLegend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn("size-2 rounded-full", color)} />
      {label}
    </span>
  );
}

function CashFlowSparkline({
  values,
  className,
}: {
  values: number[];
  className?: string;
}) {
  const width = 180;
  const height = 64;
  const padding = { top: 8, right: 6, bottom: 10, left: 6 };
  const points = mapChartPoints(values, width, height, padding);
  const linePath = buildLinePath(points);
  const areaPath = buildAreaPath(points, height - padding.bottom);

  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      preserveAspectRatio="none"
      viewBox={`0 0 ${width} ${height}`}
    >
      <path d={areaPath} fill="url(#free-cash-spark-area)" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--chart-3)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <defs>
        <linearGradient id="free-cash-spark-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--chart-3)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--chart-3)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function CashFlowAreaSvg({
  data,
  currency,
}: {
  data: CashFlowPoint[];
  currency: CurrencyCode;
}) {
  const width = 720;
  const height = 240;
  const padding = { top: 18, right: 16, bottom: 28, left: 54 };
  const values = data.flatMap((point) => [point.income, point.expenses]);
  const incomePoints = mapChartPoints(
    data.map((point) => point.income),
    width,
    height,
    padding,
    values
  );
  const expensePoints = mapChartPoints(
    data.map((point) => point.expenses),
    width,
    height,
    padding,
    values
  );
  const bottom = height - padding.bottom;

  return (
    <svg
      aria-label="Cash flow overview chart"
      className="h-full w-full"
      preserveAspectRatio="none"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <linearGradient id="income-area-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--safe)" stopOpacity="0.36" />
          <stop offset="100%" stopColor="var(--safe)" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="expense-area-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--chart-3)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--chart-3)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((ratio) => (
        <line
          key={ratio}
          stroke="rgba(255,255,255,0.08)"
          strokeDasharray="4 8"
          x1={padding.left}
          x2={width - padding.right}
          y1={padding.top + (bottom - padding.top) * ratio}
          y2={padding.top + (bottom - padding.top) * ratio}
        />
      ))}
      <path d={buildAreaPath(incomePoints, bottom)} fill="url(#income-area-fill)" />
      <path d={buildAreaPath(expensePoints, bottom)} fill="url(#expense-area-fill)" />
      <path
        d={buildLinePath(incomePoints)}
        fill="none"
        stroke="var(--safe)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path
        d={buildLinePath(expensePoints)}
        fill="none"
        stroke="var(--chart-3)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <text fill="var(--muted-foreground)" fontSize="12" x="0" y={padding.top + 4}>
        {formatCompactCurrency(Math.max(...values), currency)}
      </text>
      <text fill="var(--muted-foreground)" fontSize="12" x="0" y={bottom}>
        {formatCompactCurrency(0, currency)}
      </text>
      {data.map((point, index) => (
        <text
          key={point.label}
          fill="var(--muted-foreground)"
          fontSize="12"
          textAnchor={index === data.length - 1 ? "end" : "middle"}
          x={incomePoints[index]?.x ?? padding.left}
          y={height - 6}
        >
          {point.label}
        </text>
      ))}
    </svg>
  );
}

function CashFlowTooltipLayer({
  data,
  currency,
}: {
  data: CashFlowPoint[];
  currency: CurrencyCode;
}) {
  const width = 720;
  const height = 240;
  const padding = { top: 18, right: 16, bottom: 28, left: 54 };
  const values = data.flatMap((point) => [point.income, point.expenses]);
  const incomePoints = mapChartPoints(
    data.map((point) => point.income),
    width,
    height,
    padding,
    values
  );

  return (
    <TooltipProvider delayDuration={80}>
      <div className="absolute inset-4">
        {data.map((point, index) => {
          const anchor = incomePoints[index] ?? { x: padding.left, y: height - padding.bottom };
          const left = `${(anchor.x / width) * 100}%`;
          const top = `${(anchor.y / height) * 100}%`;
          const triggerWidth = `${100 / Math.max(data.length, 1)}%`;

          return (
            <Tooltip key={`${point.label}-tooltip`}>
              <TooltipTrigger asChild>
                <button
                  aria-label={`${point.label} cash flow values`}
                  className="group absolute top-0 h-full -translate-x-1/2 rounded-sm bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ left, width: triggerWidth }}
                  type="button"
                >
                  <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/15 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                  <span
                    className="absolute left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-safe bg-[var(--card-solid)] opacity-0 ring-2 ring-safe/20 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                    style={{ top }}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent
                align="center"
                className="grid min-w-40 gap-1.5 border border-border bg-[var(--card-solid)] p-3 text-xs text-foreground shadow-elevated"
                side="top"
                sideOffset={8}
              >
                <p className="font-semibold">{point.label}</p>
                <p className="flex items-center justify-between gap-4 text-safe">
                  <span>Income</span>
                  <span>{formatCompactCurrency(point.income, currency)}</span>
                </p>
                <p className="flex items-center justify-between gap-4 text-chart-3">
                  <span>Expenses</span>
                  <span>{formatCompactCurrency(point.expenses, currency)}</span>
                </p>
                <p className="flex items-center justify-between gap-4 text-safe">
                  <span>Free Cash Flow</span>
                  <span>{formatCompactCurrency(point.freeCashFlow, currency)}</span>
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

interface ChartPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface SvgPoint {
  x: number;
  y: number;
}

function mapChartPoints(
  values: number[],
  width: number,
  height: number,
  padding: ChartPadding,
  domainValues = values
): SvgPoint[] {
  const max = Math.max(...domainValues, 1);
  const min = Math.min(...domainValues, 0);
  const range = Math.max(max - min, 1);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  return values.map((value, index) => {
    const ratio = values.length === 1 ? 1 : index / (values.length - 1);

    return {
      x: padding.left + innerWidth * ratio,
      y: padding.top + innerHeight * (1 - (value - min) / range),
    };
  });
}

function buildLinePath(points: SvgPoint[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function buildAreaPath(points: SvgPoint[], bottom: number) {
  if (points.length === 0) {
    return "";
  }

  const [first] = points;
  const last = points[points.length - 1];

  return `${buildLinePath(points)} L ${last.x} ${bottom} L ${first.x} ${bottom} Z`;
}

function SummaryMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "safe" | "risk";
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 truncate text-lg font-semibold",
          tone === "safe" ? "text-safe" : "text-risk"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function AdvisorAction({
  label,
  value,
  nextStep,
  impact,
  icon,
}: {
  label: string;
  value: string;
  nextStep: string;
  impact: string;
  icon: ReactNode;
}) {
  return (
    <div className="grid overflow-hidden rounded-control border border-safe/25 bg-safe/5">
      <div className="grid grid-cols-[2.25rem_1fr] items-start gap-3 p-4">
        <span className="grid size-9 place-items-center rounded-control bg-primary/10 text-primary">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-5 text-foreground">{label}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{value}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-safe/20 bg-background/20 px-4 py-3 text-xs text-muted-foreground">
        <span className="min-w-0 flex-1 leading-4">{nextStep}</span>
        <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          {impact}
        </span>
      </div>
    </div>
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
    <article
      aria-label={`${label} card`}
      className="grid min-h-24 min-w-0 grid-cols-[2.25rem_1fr] items-center gap-3 border-border/70 px-4 py-3 max-xl:border-b xl:border-r xl:last:border-r-0"
    >
      <div className={cn("grid size-8 place-items-center rounded-control", iconTone)}>
        {icon}
      </div>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[10px] font-semibold uppercase tracking-normal text-muted-foreground">
            {label}
          </h3>
          <p className="mt-1 truncate text-lg font-semibold text-foreground">{value}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{helper}</p>
        </div>
        {aside}
      </div>
    </article>
  );
}

function GoalsProgressCard({ goals, currency }: { goals: Goal[]; currency: CurrencyCode }) {
  const featuredGoal = goals[0];
  const otherGoals = goals.slice(1);
  const overallProgress = getGoalsProgress(goals);

  return (
    <Card aria-labelledby="active-goals-heading" className="min-h-[360px] gap-4 overflow-hidden py-0">
      <CardHeader className="px-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle
              id="active-goals-heading"
              className="flex items-center gap-2 text-[13px] uppercase tracking-normal text-muted-foreground"
            >
              <Target aria-hidden="true" className="size-3.5" />
              Goals & Progress
            </CardTitle>
            <CardDescription className="mt-1 text-sm leading-6">
              Funding committed to your savings targets
            </CardDescription>
          </div>
          <TextActionLink href="/goals">
            View all goals
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </TextActionLink>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 px-5 pb-5">
        {featuredGoal ? (
          <>
            <GoalFeaturedRow
              goal={featuredGoal}
              overallProgress={overallProgress}
              currency={currency}
            />
            {otherGoals.length > 0 ? (
              <div className="grid gap-0 rounded-control border border-border bg-muted/20">
                {otherGoals.map((goal) => (
                  <GoalListRow key={goal.id} goal={goal} currency={currency} />
                ))}
              </div>
            ) : null}
            <TextActionLink href="/goals" className="justify-self-start">
              Manage goals
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </TextActionLink>
          </>
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
  );
}

function GoalFeaturedRow({
  goal,
  overallProgress,
  currency,
}: {
  goal: Goal;
  overallProgress: number;
  currency: CurrencyCode;
}) {
  const progress = getPercentage(goal.savedAmount, goal.targetAmount);
  const helper = referenceGoals[goal.id]?.helperText ?? `${formatPriority(goal.priority)} goal`;

  return (
    <div className="grid grid-cols-[5.75rem_minmax(0,1fr)] items-center gap-4 rounded-control border border-border bg-muted/25 p-4 sm:grid-cols-[6.75rem_1fr] sm:gap-5 sm:p-5">
      <ProgressRing value={overallProgress} label="Overall goals progress" size={92}>
        <span className="grid leading-none">
          <span className="text-lg font-semibold">{overallProgress}%</span>
          <span className="mt-1 text-[10px] font-semibold text-muted-foreground">
            Overall Progress
          </span>
        </span>
      </ProgressRing>
      <div className="min-w-0">
        <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">{goal.label}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatCurrency(goal.savedAmount, currency)} of{" "}
              {formatCurrency(goal.targetAmount, currency)}
            </p>
          </div>
          <span className="w-fit rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase text-muted-foreground">
            {formatPriority(goal.priority)}
          </span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-muted">
          <div className="h-full rounded-full bg-safe" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-sm leading-5 text-muted-foreground">{helper}</p>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <CalendarDays aria-hidden="true" className="size-3.5" />
          {formatCurrency(goal.monthlyContribution, currency)} monthly contribution
          {goal.targetDate ? ` · Target ${formatShortDate(goal.targetDate)}` : ""}
        </p>
      </div>
    </div>
  );
}

function GoalListRow({ goal, currency }: { goal: Goal; currency: CurrencyCode }) {
  const progress = getPercentage(goal.savedAmount, goal.targetAmount);

  return (
    <div className="grid grid-cols-[2.25rem_1fr_auto] items-center gap-3 border-b border-border/70 px-3 py-3 last:border-b-0">
      <span className="grid size-8 place-items-center rounded-control bg-primary/10 text-primary">
        <Target aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{goal.label}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {formatCurrency(goal.savedAmount, currency)} / {formatCurrency(goal.targetAmount, currency)}
        </p>
      </div>
      <p className="text-xs font-semibold text-foreground">{progress}%</p>
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
        "grid grid-cols-[2.5rem_1fr_auto_auto_auto] items-center gap-3 rounded-control border border-border bg-muted/25 px-3 py-3 text-sm",
        className
      )}
    >
      <span className="grid size-9 place-items-center rounded-control bg-chart-3/10 text-chart-3">
        <CreditCard aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0">
        <h3 className="truncate font-semibold text-foreground">{check.itemName}</h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {reference.vendorStyle} · {reference.category}
        </p>
      </div>
      <p className="hidden text-right font-semibold text-foreground sm:block">
        {formatCurrency(check.amount, currency)}
      </p>
      <StatusBadge decision={check.decision} />
      <button
        aria-label={`More actions for ${check.itemName}`}
        className="grid size-8 place-items-center rounded-control text-muted-foreground transition hover:bg-muted hover:text-foreground"
        type="button"
      >
        <MoreVertical aria-hidden="true" className="size-4" />
      </button>
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

function getGoalsProgress(goals: Goal[]) {
  const saved = goals.reduce((total, goal) => total + goal.savedAmount, 0);
  const target = goals.reduce((total, goal) => total + goal.targetAmount, 0);

  return getPercentage(saved, target);
}

function buildCashFlowSeries(
  snapshot: FinancialSnapshot,
  metrics: DashboardOverviewProps["metrics"],
  date: Date
): CashFlowPoint[] {
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const checkpoints = [1, 8, 15, 22, monthEnd].filter(
    (day, index, days) => day <= monthEnd && days.indexOf(day) === index
  );
  const income = Math.max(0, snapshot.profile.monthlyIncome);
  const expenses = Math.max(0, income - metrics.monthlyFreeCashFlow);

  return checkpoints.map((day) => {
    const ratio = day / monthEnd;
    const pacedIncome = Math.round(income * ratio);
    const pacedExpenses = Math.round(expenses * ratio);

    return {
      label: `${formatMonth(date)} ${day}`,
      income: pacedIncome,
      expenses: pacedExpenses,
      freeCashFlow: pacedIncome - pacedExpenses,
    };
  });
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("en-PH", { month: "short" }).format(date);
}

function formatCompactCurrency(amount: number, currency: CurrencyCode) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 0,
  }).format(amount);
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

function formatShortDateParts(value: string) {
  const [month, day] = formatShortDate(value).split(" ");

  return { month, day };
}

function parseDisplayDate(value: string) {
  const dateOnlyMatch = dateOnlyPattern.exec(value);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  return new Date(value);
}
