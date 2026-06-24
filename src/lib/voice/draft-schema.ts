import { z } from "zod";

/**
 * Structured shape the model extracts from a voice transcript (§20.5). Shared by
 * the server route (which enforces it via `generateObject`) and the client (which
 * re-validates the response). Mirrors the regex parser's fields so either source
 * fills the same review form. Fields are nullable so the model can say "not stated"
 * instead of inventing a value.
 */
export const extractedPurchaseSchema = z.object({
  itemName: z
    .string()
    .describe("The product or service name, e.g. 'iPhone 15'. Empty string if unclear."),
  amount: z
    .number()
    .nullable()
    .describe("Total price in Philippine pesos as a plain number (no symbol). Null if not stated."),
  downPayment: z
    .number()
    .nullable()
    .describe("Down payment in pesos if financed. Null if none or unclear."),
  installmentMonths: z
    .number()
    .int()
    .nullable()
    .describe("Number of installment months. Null if not financed."),
  monthlyPayment: z
    .number()
    .nullable()
    .describe("Monthly payment in pesos if financed. Null if not stated."),
  paymentMethod: z
    .enum(["cash", "installment", "credit_card", "loan", "bnpl"])
    .nullable()
    .describe("How the user will pay. Null if not stated — do not guess."),
  urgency: z
    .enum(["need_now", "need_this_month", "can_wait", "want"])
    .nullable()
    .describe("How urgently the user needs it. Null if not stated — do not guess."),
});

export type ExtractedPurchase = z.infer<typeof extractedPurchaseSchema>;
