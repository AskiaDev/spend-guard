import {
  calculateFinancialHealthScore,
  calculateSafeToSpend,
} from "@/lib/calculations/purchase-decision";
import { formatCurrency } from "@/lib/utils";
import type { CurrencyCode, FinancialSnapshot, PurchaseCheck } from "@/types/finance";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_DAYS = 7;

export interface WeeklyReportInsights {
  goodDecisions: number;
  purchasesAvoided: number;
  amountPreserved: number;
  improvedItems: string;
  currentRisks: string;
  goalProgress: string;
  nextBestAction: string;
  narrative: string;
}

export interface WeeklyReportInput {
  snapshot: FinancialSnapshot;
  checks: PurchaseCheck[];
  /** Local `YYYY-MM-DD` Monday that starts the report week. */
  weekStart: string;
  currency: CurrencyCode;
}

/**
 * Deterministic, rule-based weekly report. No LLM: this is the always-available fallback the
 * LiteRT-LM advisor (P10) will later wrap with prose. Reads §19 engine outputs and the week's
 * purchase-check history for display only; it never changes a decision.
 */
export function generateWeeklyReportInsights({
  snapshot,
  checks,
  weekStart,
  currency,
}: WeeklyReportInput): WeeklyReportInsights {
  const weekChecks = checks.filter((check) => isInWeek(check.createdAt, weekStart));

  const skipped = weekChecks.filter((check) => check.status === "skipped");
  const goodDecisions = weekChecks.filter(
    (check) => check.decision === "SAFE_TO_BUY" || check.status === "skipped"
  ).length;
  const purchasesAvoided = skipped.length;
  const amountPreserved = skipped.reduce((total, check) => total + check.amount, 0);
  const risksBought = weekChecks.filter(
    (check) => check.status === "bought" && check.decision === "NOT_RECOMMENDED"
  );

  const safeToSpend = calculateSafeToSpend(snapshot);
  const healthScore = calculateFinancialHealthScore(snapshot);
  const nextBestAction = selectNextBestAction(snapshot);

  const improvedItems = describeImprovedItems(purchasesAvoided, goodDecisions);
  const currentRisks = describeCurrentRisks(risksBought.length, snapshot);
  const goalProgress = describeGoalProgress(snapshot, safeToSpend, currency);

  const narrative =
    `This week you logged ${weekChecks.length} purchase ${plural(weekChecks.length, "check")} ` +
    `and made ${goodDecisions} guardrail-aligned ${plural(goodDecisions, "decision")}, ` +
    `preserving ${formatCurrency(amountPreserved, currency)}. ` +
    `Health score is ${healthScore}/100 with ${formatCurrency(safeToSpend, currency)} safe to spend. ` +
    `Next: ${nextBestAction}`;

  return {
    goodDecisions,
    purchasesAvoided,
    amountPreserved,
    improvedItems,
    currentRisks,
    goalProgress,
    nextBestAction,
    narrative,
  };
}

function isInWeek(createdAt: string, weekStart: string): boolean {
  const [year, month, day] = weekStart.split("-").map(Number);
  const start = new Date(year, month - 1, day).getTime();
  const end = start + WEEK_DAYS * DAY_MS;
  const at = new Date(createdAt).getTime();
  return at >= start && at < end;
}

function selectNextBestAction(snapshot: FinancialSnapshot): string {
  if (snapshot.profile.currentSavings < snapshot.profile.emergencyFundTarget) {
    return "Build your emergency fund toward its target before new wants.";
  }

  if (snapshot.debts.length > 0) {
    return "Check each installment's monthly payment against free cash flow before approval.";
  }

  return "Run a purchase check before your next flexible want.";
}

function describeImprovedItems(purchasesAvoided: number, goodDecisions: number): string {
  if (purchasesAvoided > 0) {
    return `${purchasesAvoided} ${plural(purchasesAvoided, "want")} paused before becoming payment commitments.`;
  }

  if (goodDecisions > 0) {
    return `${goodDecisions} guardrail-aligned ${plural(goodDecisions, "decision")} this week.`;
  }

  return "No checks yet this week — run one before your next want.";
}

function describeCurrentRisks(risksBought: number, snapshot: FinancialSnapshot): string {
  if (risksBought > 0) {
    return `${risksBought} not recommended ${plural(risksBought, "purchase")} went through. Re-check before the next one.`;
  }

  if (snapshot.debts.length > 0) {
    return "Installment and debt payments still need a monthly-payment check before approval.";
  }

  return "No flagged risks this week. Keep checking before credit or installment buys.";
}

function describeGoalProgress(
  snapshot: FinancialSnapshot,
  safeToSpend: number,
  currency: CurrencyCode
): string {
  if (snapshot.goals.length === 0) {
    return "Add a savings goal to see weekly goal tradeoffs here.";
  }

  return `${formatCurrency(safeToSpend, currency)} stays available as a guardrail while goals keep funding.`;
}

function plural(count: number, word: string): string {
  return count === 1 ? word : `${word}s`;
}
