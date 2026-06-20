"use client";

import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { FinancialSnapshot, WeeklyReport } from "@/types/finance";

export function ReportsPanel({
  reports,
  currency,
  onGenerateReport,
}: {
  reports: WeeklyReport[];
  currency: FinancialSnapshot["profile"]["currency"];
  onGenerateReport: () => Promise<WeeklyReport>;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-md bg-zinc-100 text-zinc-700">
              <FileText className="size-5" aria-hidden="true" />
            </div>
            <CardTitle>Weekly Reports</CardTitle>
          </div>
          <Button type="button" variant="secondary" onClick={() => void onGenerateReport()}>
            Generate report
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {reports.map((report) => (
          <article key={report.id} className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold text-zinc-950">Week of {report.weekStart}</h3>
              <p className="text-sm font-medium text-zinc-600">
                {formatCurrency(report.safeToSpend, currency)} safe
              </p>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-700">{report.summary}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-normal text-zinc-500">
              health score {report.healthScore}/100
            </p>
          </article>
        ))}
        {reports.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 p-5 text-sm text-zinc-600">
            Reports use the rule-based fallback and saved purchase history.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
