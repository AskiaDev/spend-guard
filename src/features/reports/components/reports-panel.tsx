"use client";

import { ArrowUpRight, Download, FileText, Lightbulb, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { InlineNotice } from "@/components/feedback/inline-notice";
import { ProgressRing } from "@/components/finance/progress-ring";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  CurrencyCode,
  FinancialSnapshot,
  PurchaseCheck,
  WeeklyReport,
} from "@/types/finance";

import { generateWeeklyReportInsights } from "../lib/weekly-report";

export function ReportsPanel({
  reports,
  checks,
  snapshot,
  currency,
  onGenerateReport,
}: {
  reports: WeeklyReport[];
  checks: PurchaseCheck[];
  snapshot: FinancialSnapshot;
  currency: FinancialSnapshot["profile"]["currency"];
  onGenerateReport: () => Promise<WeeklyReport>;
}) {
  const sortedReports = [...reports].sort(
    (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  );
  const latestReport = sortedReports[0];
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  async function generateReport() {
    setIsGenerating(true);
    setGenerationError(null);

    try {
      await onGenerateReport();
    } catch {
      setGenerationError(
        "We couldn’t generate this report. Your saved data is unchanged—please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  if (!latestReport) {
    return (
      <Card aria-labelledby="no-report-heading">
        <CardContent className="grid gap-5 p-6">
          <div className="grid max-w-2xl gap-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-primary">
              Weekly advisor report
            </p>
            <h2 id="no-report-heading" className="text-2xl font-semibold text-foreground">
              No weekly report yet
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Generate a local weekly report from saved purchase checks and the rule-based
              financial snapshot. Nothing leaves this browser.
            </p>
          </div>
          {generationError ? (
            <InlineNotice tone="error">{generationError}</InlineNotice>
          ) : null}
          <Button
            type="button"
            className="w-fit"
            isLoading={isGenerating}
            loadingText="Generating..."
            onClick={() => void generateReport()}
          >
            Generate Report
          </Button>
        </CardContent>
      </Card>
    );
  }

  const weekRange = formatWeekRange(latestReport.weekStart);
  const insights = generateWeeklyReportInsights({
    snapshot,
    checks,
    weekStart: latestReport.weekStart,
    currency,
  });
  const insightCards = [
    { label: "Improved Items", detail: insights.improvedItems },
    { label: "Current Risks", detail: insights.currentRisks },
    { label: "Goal Progress", detail: insights.goalProgress },
    { label: "Next Best Action", detail: insights.nextBestAction },
  ];
  const pastReports = sortedReports.slice(1);

  return (
    <div className="grid gap-5 pb-24 lg:pb-0">
      <Card aria-labelledby="weekly-report-heading">
        <CardContent className="grid gap-5 p-6 lg:grid-cols-[auto_minmax(0,1fr)_10rem_auto] lg:items-center">
          <div className="rounded-full bg-advisor p-3 text-primary">
            <FileText aria-hidden="true" className="size-6" />
          </div>
          <div className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-normal text-primary">
              Weekly advisor report
            </p>
            <h2 id="weekly-report-heading" className="text-2xl font-semibold text-foreground">
              {weekRange}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{latestReport.summary}</p>
          </div>
          <Image
            src="/illustrations/progress-overview.svg"
            alt="Person reviewing a weekly progress overview"
            width={220}
            height={180}
            className="hidden h-auto w-36 lg:block"
          />
          <Button type="button" variant="secondary" onClick={() => downloadReport(latestReport, currency)}>
            <Download aria-hidden="true" className="size-4" />
            Download Report
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card aria-labelledby="health-score-heading">
          <CardContent className="grid min-h-64 place-items-center gap-3 text-center">
            <div>
              <p id="health-score-heading" className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                Weekly health
              </p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {latestReport.healthScore}/100
              </p>
            </div>
            <ProgressRing
              value={latestReport.healthScore}
              label="Weekly health score"
              size={116}
              strokeWidth={10}
            />
          </CardContent>
        </Card>
        <MetricCard
          label="Good Decisions"
          value={String(insights.goodDecisions)}
          detail="Checks that stayed inside your guardrails this week."
        />
        <MetricCard
          label="Purchases Avoided"
          value={formatCurrency(insights.amountPreserved, currency)}
          detail={`${insights.purchasesAvoided} ${
            insights.purchasesAvoided === 1 ? "want" : "wants"
          } skipped to protect your plan.`}
        />
      </div>

      <Card aria-labelledby="reference-insights-heading">
        <CardHeader>
          <CardTitle id="reference-insights-heading">Reference insights</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          {insightCards.map((insight) => (
            <InsightCard key={insight.label} {...insight} />
          ))}
        </CardContent>
      </Card>

      <Card aria-labelledby="coach-tip-heading">
        <CardContent className="grid gap-4 md:grid-cols-[auto_1fr] md:items-start">
          <div className="grid size-11 place-items-center rounded-control bg-advisor text-primary">
            <Lightbulb aria-hidden="true" className="size-5" />
          </div>
          <div className="grid gap-2">
            <p id="coach-tip-heading" className="text-xs font-semibold uppercase tracking-normal text-primary">
              Coach Tip
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              Keep using purchase checks before credit-card or installment decisions. The safest
              habit is checking the monthly payment against free cash flow before you commit.
            </p>
            <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Educational Tip
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              A safe-to-spend number is not spare cash. It is the amount left after protecting bills,
              debt payments, emergency savings, and active goals.
            </p>
          </div>
        </CardContent>
      </Card>

      {pastReports.length > 0 ? (
        <Card aria-labelledby="report-history-heading">
          <CardHeader>
            <CardTitle id="report-history-heading">Report history</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {pastReports.map((report) => (
              <article
                key={report.id}
                className="grid gap-1 rounded-control border border-border bg-muted/30 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">
                    {formatWeekRange(report.weekStart)}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{report.summary}</p>
                </div>
                <p className="text-sm font-semibold text-foreground sm:text-right">
                  {report.healthScore}/100
                </p>
              </article>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div
        data-testid="mobile-report-cta"
        className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 rounded-card border border-border bg-background/95 p-3 shadow-elevated backdrop-blur lg:static lg:p-0 lg:shadow-none lg:border-0 lg:bg-transparent"
      >
        <Link
          href="/checker"
          className={cn(
            "inline-flex h-11 w-full items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:w-fit"
          )}
        >
          Take Action
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card aria-label={`${label} card`}>
      <CardContent className="grid min-h-64 content-between gap-5">
        <div className="grid size-11 place-items-center rounded-control bg-advisor text-primary">
          <Sparkles aria-hidden="true" className="size-5" />
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{label}</h3>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightCard({ label, detail }: { label: string; detail: string }) {
  return (
    <article className="rounded-control border border-border bg-muted/30 p-4">
      <h3 className="text-sm font-semibold text-foreground">{label}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
    </article>
  );
}

const dateComponentPattern = /^(\d{4})-(\d{2})-(\d{2})/;

function parseDisplayDate(value: string) {
  const match = dateComponentPattern.exec(value);

  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  return new Date(value);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatWeekRange(weekStart: string) {
  const start = parseDisplayDate(weekStart);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return `${formatDate(start)} – ${formatDate(end)}`;
}

function buildDownloadText(report: WeeklyReport, currency: CurrencyCode) {
  return [
    "SpendGuard Weekly Advisor Report",
    formatWeekRange(report.weekStart),
    "",
    `Health score: ${report.healthScore}/100`,
    `Safe to spend: ${formatCurrency(report.safeToSpend, currency)}`,
    "",
    report.summary,
  ].join("\n");
}

function downloadReport(report: WeeklyReport, currency: CurrencyCode) {
  if (typeof URL.createObjectURL !== "function") {
    return;
  }

  const blob = new Blob([buildDownloadText(report, currency)], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `spendguard-weekly-report-${report.weekStart}.txt`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
