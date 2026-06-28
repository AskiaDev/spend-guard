import { z } from "zod";

export const LEDGER_CATEGORIES = [
  "food",
  "groceries",
  "transport",
  "bills",
  "shopping",
  "health",
  "transfer",
  "income_salary",
  "income_other",
  "uncategorized",
] as const;

export type LedgerCategory = (typeof LEDGER_CATEGORIES)[number];

// Output of one classify call. Date is a permissive string so the model is not
// forced to retry on format; it is strictly validated again at confirm time.
export const ledgerCandidateSchema = z.object({
  occurredAt: z
    .string()
    .nullable()
    .describe("Transaction date as YYYY-MM-DD, or null if not visible."),
  direction: z.enum(["income", "expense"]),
  amount: z.number().positive().describe("Transaction total as a positive number."),
  counterparty: z
    .string()
    .nullable()
    .describe("Merchant, sender, or recipient name. Null if not identifiable."),
  category: z.enum(LEDGER_CATEGORIES),
  confidence: z.number().min(0).max(1).describe("0..1 certainty of this extraction."),
});

export type LedgerCandidate = z.infer<typeof ledgerCandidateSchema>;

const reviewedEntrySchema = z.object({
  occurredAt: z
    .string()
    .min(1)
    .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date."),
  direction: z.enum(["income", "expense"]),
  amount: z.number().positive(),
  counterparty: z.string().nullable(),
  category: z.enum(LEDGER_CATEGORIES),
  confidence: z.number().min(0).max(1).nullable(),
  sourceRef: z.string().nullable(),
});

export type ReviewedEntry = z.infer<typeof reviewedEntrySchema>;

export const confirmLedgerSchema = z.object({
  entries: z.array(reviewedEntrySchema).min(1),
});
