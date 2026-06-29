"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { LEDGER_CATEGORIES, type LedgerCategory } from "@/lib/schemas/ledger";
import { requireUserId } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action-result";
import type { Database } from "@/types/database";

const TRANSACTION_PAGE_SIZE = 10;

type LedgerDirection = "income" | "expense";
type TransactionRow = Database["public"]["Tables"]["transactions"]["Row"];

export type LedgerTransaction = {
  id: string;
  amount: number;
  label: string;
  createdAt: string;
  occurredAt: string | null;
  direction: LedgerDirection | null;
  category: LedgerCategory;
  counterparty: string | null;
  source: string | null;
  sourceRef: string | null;
  confidence: number | null;
};

export type LedgerTransactionPage = {
  transactions: LedgerTransaction[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
};

const pageSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
});

const optionalCounterpartySchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().max(160, "Keep the counterparty under 160 characters.").nullable()
);

const transactionUpdateSchema = z.object({
  occurredAt: z
    .string()
    .min(1, "Add the transaction date.")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Use a valid date."),
  direction: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("Enter an amount above zero."),
  counterparty: optionalCounterpartySchema,
  category: z.enum(LEDGER_CATEGORIES),
});

export async function listLedgerTransactionsAction(
  input: unknown = {}
): Promise<ActionResult<LedgerTransactionPage>> {
  const { page } = pageSchema.parse(input);
  const from = (page - 1) * TRANSACTION_PAGE_SIZE;
  const to = from + TRANSACTION_PAGE_SIZE - 1;

  try {
    const { supabase, userId } = await requireUserId();
    const { data, error, count } = await supabase
      .from("transactions")
      .select(
        "id, amount, label, created_at, occurred_at, direction, category, counterparty, source, source_ref, confidence, status, raw_extract, user_id",
        { count: "exact" }
      )
      .eq("user_id", userId)
      .eq("status", "confirmed")
      .order("occurred_at", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Unable to load Supabase ledger transactions", error);
      return { ok: false, error: "Unable to load transactions." };
    }

    const total = count ?? data?.length ?? 0;

    return {
      ok: true,
      data: {
        transactions: (data ?? []).map(toLedgerTransaction),
        pagination: {
          page,
          pageSize: TRANSACTION_PAGE_SIZE,
          total,
          pageCount: Math.max(1, Math.ceil(total / TRANSACTION_PAGE_SIZE)),
        },
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to load transactions.",
    };
  }
}

export async function updateLedgerTransactionAction(
  id: string,
  input: unknown
): Promise<ActionResult<null>> {
  if (!id) {
    return { ok: false, error: "Transaction ID is required." };
  }

  const parsed = transactionUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the transaction fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { supabase, userId } = await requireUserId();
    const transaction = parsed.data;
    const { error } = await supabase
      .from("transactions")
      .update({
        amount: transaction.amount,
        label: transaction.counterparty ?? transaction.category,
        occurred_at: transaction.occurredAt,
        direction: transaction.direction,
        category: transaction.category,
        counterparty: transaction.counterparty,
      })
      .eq("id", id)
      .eq("user_id", userId)
      .eq("status", "confirmed");

    if (error) {
      console.error("Unable to update Supabase ledger transaction", error);
      return { ok: false, error: "Unable to update this transaction." };
    }

    revalidateLedgerPaths();
    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to update transaction.",
    };
  }
}

export async function deleteLedgerTransactionAction(id: string): Promise<ActionResult<null>> {
  if (!id) {
    return { ok: false, error: "Transaction ID is required." };
  }

  try {
    const { supabase, userId } = await requireUserId();
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .eq("status", "confirmed");

    if (error) {
      console.error("Unable to delete Supabase ledger transaction", error);
      return { ok: false, error: "Unable to remove this transaction." };
    }

    revalidateLedgerPaths();
    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to remove transaction.",
    };
  }
}

function revalidateLedgerPaths() {
  revalidatePath("/");
  revalidatePath("/import");
}

function toLedgerTransaction(row: TransactionRow): LedgerTransaction {
  return {
    id: row.id,
    amount: Number(row.amount),
    label: row.label,
    createdAt: row.created_at,
    occurredAt: row.occurred_at,
    direction: toLedgerDirection(row.direction),
    category: toLedgerCategory(row.category),
    counterparty: row.counterparty,
    source: row.source,
    sourceRef: row.source_ref,
    confidence: row.confidence === null ? null : Number(row.confidence),
  };
}

function toLedgerDirection(value: string | null): LedgerDirection | null {
  return value === "income" || value === "expense" ? value : null;
}

function toLedgerCategory(value: string | null): LedgerCategory {
  return LEDGER_CATEGORIES.includes(value as LedgerCategory)
    ? (value as LedgerCategory)
    : "uncategorized";
}
