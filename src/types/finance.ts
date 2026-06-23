export type CurrencyCode = "PHP" | "USD" | "EUR" | "JPY" | "SGD";

export type PurchaseDecision =
  | "SAFE_TO_BUY"
  | "BUY_WITH_CAUTION"
  | "WAIT"
  | "NOT_RECOMMENDED";

export type PaymentMethod = "cash" | "installment" | "credit_card" | "loan" | "bnpl";

export type PurchaseUrgency = "need_now" | "need_this_month" | "can_wait" | "want";

export type GoalPriority = "high" | "medium" | "low";

export interface FinancialProfile {
  currency: CurrencyCode;
  monthlyIncome: number;
  currentSavings: number;
  emergencyFundTarget: number;
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
  urgency: PurchaseUrgency;
  paymentMethod: PaymentMethod;
  installmentMonths?: number;
  monthlyPayment?: number;
}

export interface PurchaseCheck extends PurchaseInput {
  id: string;
  createdAt: string;
  decision: PurchaseDecision;
  safeToSpend: number;
  monthlyFreeCashFlow: number;
  cooldownDays: number;
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
  safeToSpend: number;
  monthlyFreeCashFlow: number;
  emergencyProgress: number;
  debtPressure: number;
  goalDelayMonths: number;
  cooldownDays: number;
  healthScore: number;
  reasons: string[];
}

export interface VoicePurchaseDraft extends Partial<PurchaseInput> {
  transcript: string;
  requiresConfirmation: true;
  confidence: number;
}
