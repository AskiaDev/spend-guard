export interface SafeToSpendInput {
  currentSavings: number;
  emergencyBuffer: number;
  upcomingBills30Days: number;
  upcomingDebt30Days: number;
  reservedGoalAmount: number;
}

export interface MonthlyFreeCashFlowInput {
  monthlyIncome: number;
  fixedExpenses: number;
  estimatedVariableExpenses: number;
  minimumDebtPayments: number;
}

export function calculateSafeToSpend(input: SafeToSpendInput): number {
  const safeToSpend =
    input.currentSavings -
    input.emergencyBuffer -
    input.upcomingBills30Days -
    input.upcomingDebt30Days -
    input.reservedGoalAmount;

  return Math.max(0, safeToSpend);
}

export function calculateMonthlyFreeCashFlow(input: MonthlyFreeCashFlowInput): number {
  return (
    input.monthlyIncome -
    input.fixedExpenses -
    input.estimatedVariableExpenses -
    input.minimumDebtPayments
  );
}
