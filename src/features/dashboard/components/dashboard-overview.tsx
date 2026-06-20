"use client";

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Landmark, ShieldCheck, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import type { FinancialSnapshot, PurchaseCheck } from "@/types/finance";

interface DashboardOverviewProps {
  snapshot: FinancialSnapshot;
  checks: PurchaseCheck[];
  metrics: {
    safeToSpend: number;
    monthlyFreeCashFlow: number;
    healthScore: number;
  };
}

export function DashboardOverview({ snapshot, checks, metrics }: DashboardOverviewProps) {
  const currency = snapshot.profile.currency;
  const emergencyProgress =
    snapshot.profile.emergencyFundTarget > 0
      ? Math.min(
          100,
          Math.round((snapshot.profile.currentSavings / snapshot.profile.emergencyFundTarget) * 100)
        )
      : 100;
  const chartData = [
    { name: "Income", amount: snapshot.profile.monthlyIncome },
    {
      name: "Expenses",
      amount: snapshot.expenses.reduce((total, expense) => total + expense.amount, 0),
    },
    {
      name: "Debt",
      amount: snapshot.debts.reduce((total, debt) => total + debt.minimumPayment, 0),
    },
    {
      name: "Goals",
      amount: snapshot.goals.reduce((total, goal) => total + goal.monthlyContribution, 0),
    },
  ];

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          icon={<WalletCards className="size-5" />}
          label="Safe to spend"
          value={formatCurrency(metrics.safeToSpend, currency)}
          tone={metrics.safeToSpend > 0 ? "green" : "red"}
        />
        <MetricCard
          icon={<Activity className="size-5" />}
          label="Monthly free cash"
          value={formatCurrency(metrics.monthlyFreeCashFlow, currency)}
          tone={metrics.monthlyFreeCashFlow > 0 ? "green" : "red"}
        />
        <MetricCard
          icon={<ShieldCheck className="size-5" />}
          label="Health score"
          value={`${metrics.healthScore}/100`}
          tone={metrics.healthScore >= 70 ? "green" : metrics.healthScore >= 45 ? "amber" : "red"}
        />
        <MetricCard
          icon={<Landmark className="size-5" />}
          label="Checks run"
          value={String(checks.length)}
          tone="zinc"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Monthly Flow</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="min-w-[680px]">
              <BarChart data={chartData} width={680} height={260}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={80} />
                <Tooltip formatter={(value) => formatCurrency(Number(value), currency)} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} fill="#10b981" />
              </BarChart>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Emergency Readiness</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-3xl font-semibold text-zinc-950">{emergencyProgress}%</p>
                <p className="text-sm text-zinc-600">
                  {formatCurrency(snapshot.profile.currentSavings, currency)} saved of{" "}
                  {formatCurrency(snapshot.profile.emergencyFundTarget, currency)}
                </p>
              </div>
              <Badge tone={emergencyProgress >= 80 ? "green" : "amber"}>
                {emergencyProgress >= 80 ? "steady" : "building"}
              </Badge>
            </div>
            <Progress value={emergencyProgress} />
            <div className="grid gap-3">
              {checks.slice(0, 3).map((check) => (
                <div
                  key={check.id}
                  className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-zinc-950">{check.itemName}</span>
                    <Badge tone={check.decision === "SAFE_TO_BUY" ? "green" : "amber"}>
                      {check.decision.replaceAll("_", " ").toLowerCase()}
                    </Badge>
                  </div>
                  <p className="mt-1 text-zinc-600">
                    {formatCurrency(check.amount, currency)} checked{" "}
                    {new Date(check.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
              {checks.length === 0 ? (
                <p className="rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-600">
                  Purchase checks will appear here.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "green" | "amber" | "red" | "zinc";
}) {
  const iconTone = {
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-rose-100 text-rose-800",
    zinc: "bg-zinc-100 text-zinc-700",
  }[tone];

  return (
    <Card>
      <CardContent className="grid gap-4">
        <div className={`grid size-10 place-items-center rounded-md ${iconTone}`}>{icon}</div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-950">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
