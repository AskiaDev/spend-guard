const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export interface DebtPressureInput {
  monthlyIncome: number;
  minimumDebtPayments: number;
}

export function calculateDebtPressure(input: DebtPressureInput): number {
  if (input.monthlyIncome <= 0) {
    return input.minimumDebtPayments > 0 ? 1 : 0;
  }

  return clamp(input.minimumDebtPayments / input.monthlyIncome, 0, 1);
}

export function calculateDebtPressureScore(input: DebtPressureInput): number {
  const pressure = calculateDebtPressure(input);

  return Math.round((1 - clamp(pressure / 0.45, 0, 1)) * 100);
}
