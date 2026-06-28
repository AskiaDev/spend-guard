type LedgerAmountRow = { amount: number; direction: string | null };

export function confirmedSavingsDelta(rows: LedgerAmountRow[]): number {
  return rows.reduce((total, row) => {
    if (row.direction === "income") return total + row.amount;
    if (row.direction === "expense") return total - row.amount;
    return total;
  }, 0);
}
