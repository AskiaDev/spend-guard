export type CurrencyCode = "PHP" | "USD" | "EUR" | "JPY" | "SGD";

export type PurchaseDecision =
  | "SAFE_TO_BUY"
  | "BUY_WITH_CAUTION"
  | "WAIT"
  | "NOT_RECOMMENDED";

export type PaymentMethod = "cash" | "installment" | "credit_card" | "loan" | "bnpl";

export type PurchaseUrgency = "need_now" | "need_this_month" | "can_wait" | "want";

export type GoalPriority = "high" | "medium" | "low";

export const PURCHASE_CHECK_STATUSES = ["checked", "bought", "skipped"] as const;

export type PurchaseCheckStatus = (typeof PURCHASE_CHECK_STATUSES)[number];

export const PAY_FREQUENCIES = ["monthly", "semi_monthly", "biweekly", "weekly"] as const;

export type PayFrequency = (typeof PAY_FREQUENCIES)[number];

export const PAY_FREQUENCY_LABELS: Record<PayFrequency, string> = {
  monthly: "Monthly",
  semi_monthly: "Twice a month",
  biweekly: "Every 2 weeks",
  weekly: "Weekly",
};

export interface FinancialProfile {
  currency: CurrencyCode;
  monthlyIncome: number;
  currentSavings: number;
  emergencyFundTarget: number;
  fullName?: string;
  payFrequency?: PayFrequency;
  estimatedVariableExpenses?: number;
}

export interface Expense {
  id: string;
  label: string;
  amount: number;
  dueDay: number;
  isRecurring: boolean;
}

export interface Debt {
  id: string;
  label: string;
  outstandingBalance: number;
  minimumPayment: number;
  dueDay: number;
  interestRate?: number;
}

export interface Goal {
  id: string;
  label: string;
  targetAmount: number;
  savedAmount: number;
  monthlyContribution: number;
  targetDate?: string;
  priority: GoalPriority;
}

export interface PurchaseInput {
  itemName: string;
  amount: number;
  category?: string;
  saleDeadline?: string;
  location?: string;
  notes?: string;
  urgency: PurchaseUrgency;
  paymentMethod: PaymentMethod;
  downPayment?: number;
  installmentMonths?: number;
  monthlyPayment?: number;
  isIncomeGenerating?: boolean;
  currentAlternativeStillWorks?: boolean;
}

export interface PurchaseCheck extends PurchaseInput {
  id: string;
  createdAt: string;
  decision: PurchaseDecision;
  riskScore: number;
  safeToSpend: number;
  monthlyFreeCashFlow: number;
  savingsAfterPurchase: number;
  emergencyProgress?: number;
  debtPressure?: number;
  goalDelayMonths?: number;
  healthScore?: number;
  cooldownDays: number;
  status?: PurchaseCheckStatus;
  advisorText: string;
  reasons: string[];
}

export interface CooldownItem {
  id: string;
  itemName: string;
  amount: number;
  urgency: PurchaseUrgency;
  paymentMethod: PaymentMethod;
  addedAt: string;
  recheckAt: string;
  sourceCheckId?: string;
  downPayment?: number;
  installmentMonths?: number;
  monthlyPayment?: number;
  isIncomeGenerating?: boolean;
  currentAlternativeStillWorks?: boolean;
  baselineDecision?: PurchaseDecision;
  baselineRiskScore?: number;
  baselineSafeToSpend?: number;
}

export interface WeeklyReport {
  id: string;
  createdAt: string;
  weekStart: string;
  summary: string;
  healthScore: number;
  safeToSpend: number;
}

export interface FinancialSnapshot {
  profile: FinancialProfile;
  expenses: Expense[];
  debts: Debt[];
  goals: Goal[];
}

export interface FinancialWorkspace {
  snapshot: FinancialSnapshot;
  checks: PurchaseCheck[];
  cooldownItems: CooldownItem[];
  weeklyReports: WeeklyReport[];
}

export interface PurchaseDecisionResult {
  decision: PurchaseDecision;
  riskScore: number;
  safeToSpend: number;
  monthlyFreeCashFlow: number;
  emergencyProgress: number;
  debtPressure: number;
  goalDelayMonths: number;
  cooldownDays: number;
  savingsAfterPurchase: number;
  healthScore: number;
  reasons: string[];
}

export interface VoicePurchaseDraft extends Partial<PurchaseInput> {
  transcript: string;
  requiresConfirmation: true;
  confidence: number;
}
