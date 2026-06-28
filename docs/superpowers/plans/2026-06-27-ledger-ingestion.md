# Transaction Ledger + Receipt Ingestion (Slice 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user upload wallet/bank screenshots, have a vision-LLM extract and classify each as a transaction with a confidence score, review/correct them in-session, confirm, and see the dashboard savings + safe-to-spend move.

**Architecture:** Per-image fan-out (design option A) - the browser sends one image per request to a read-only classify API route that calls the existing P10 model resolver and returns one validated candidate. Candidates are reviewed in client state; only confirmed rows are written to the `transactions` ledger by a server action. The dashboard reflects them because `loadFinancialWorkspace` sets `profile.currentSavings = opening + confirmed-ledger-delta`, which both the engine and the dashboard already read - so no engine or dashboard edits.

**Tech Stack:** Next.js App Router, TypeScript, Supabase (Postgres + RLS), Vitest, Vercel AI SDK (`ai` v6 `generateObject`), zod v4. Vision model via existing `resolveServerModel()` (default `anthropic:claude-haiku-4-5`).

## Global Constraints

- **No new dependencies.** Use installed `ai@^6`, `@ai-sdk/anthropic@^3`, `@ai-sdk/openai@^3`, `zod@^4`. Do NOT add `@ai-sdk/google`.
- **Reuse `resolveServerModel()`** from `src/lib/ai/model-spec.ts` for the vision call. It already resolves provider/model from `ADVISOR_MODEL` (default `anthropic:claude-haiku-4-5`, which accepts image input).
- **Tests:** Vitest, colocated `*.test.ts`. Import `{ describe, expect, it }` from `vitest`. Run a single file with `npx vitest run <path>`.
- **Typecheck:** `npx tsc --noEmit` must pass at every checkpoint.
- **Server writes:** server actions with `"use server"`, auth via `requireUserId()` from `src/lib/supabase/server.ts`, return `ActionResult<T>` from `@/types/action-result`, validate input with zod `safeParse` first. Mirror `src/features/goals/api/create-goal.ts`.
- **Immutability:** never mutate inputs; spread to copy (e.g. profile row adjustment).
- **Copy:** no em dash anywhere in UI strings; use a plain dash.
- **No server-side image storage** in this slice. The classify route receives an image, calls the model, discards it.
- **Frontend fan-out concurrency cap = 3.**
- **Git:** Each task ends at a checkpoint (tests + typecheck green). Per the user's standing preference, the executor does NOT run `git commit`/`git push` - the user commits manually when satisfied. Treat each checkpoint as a review point.
- **Confidence threshold = 0.8.** **Category enum** (single source of truth, Task 2): `food, groceries, transport, bills, shopping, health, transfer, income_salary, income_other, uncategorized`.

---

### Task 1: Ledger DB migration + generated types

**Files:**
- Create: `supabase/migrations/20260627000000_transactions_ledger.sql`
- Modify: `src/types/database.ts` (the `transactions` table block)

**Interfaces:**
- Produces: the `transactions` table gains columns `occurred_at, direction, category, counterparty, source, source_ref, confidence, status, raw_extract`. RLS policy `transactions_all_own` already exists from the initial migration - do NOT re-add it.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260627000000_transactions_ledger.sql`:

```sql
-- Evolve the (currently unused) transactions table into the slice-1 ledger.
-- RLS policy "transactions_all_own" already exists from 20260620000000_initial_spendguard.sql.

alter table public.transactions
  add column if not exists occurred_at  date,
  add column if not exists direction    text,
  add column if not exists category     text,
  add column if not exists counterparty text,
  add column if not exists source       text,
  add column if not exists source_ref   text,
  add column if not exists confidence   numeric,
  add column if not exists status       text not null default 'confirmed',
  add column if not exists raw_extract  jsonb;

alter table public.transactions
  add constraint transactions_direction_chk
    check (direction is null or direction in ('income', 'expense'));

alter table public.transactions
  add constraint transactions_status_chk
    check (status in ('pending_review', 'confirmed'));

create index if not exists transactions_user_status_occurred_idx
  on public.transactions (user_id, status, occurred_at);
```

- [ ] **Step 2: Update the generated DB types**

In `src/types/database.ts`, replace the `transactions` block with (the file already defines `Json` at line 1):

```typescript
transactions: {
  Row: {
    id: string;
    user_id: string;
    amount: number;
    label: string;
    created_at: string;
    occurred_at: string | null;
    direction: string | null;
    category: string | null;
    counterparty: string | null;
    source: string | null;
    source_ref: string | null;
    confidence: number | null;
    status: string;
    raw_extract: Json | null;
  };
  Insert: {
    user_id: string;
    amount: number;
    label: string;
    occurred_at?: string | null;
    direction?: string | null;
    category?: string | null;
    counterparty?: string | null;
    source?: string | null;
    source_ref?: string | null;
    confidence?: number | null;
    status?: string;
    raw_extract?: Json | null;
  };
  Update: Partial<Database["public"]["Tables"]["transactions"]["Insert"]>;
  Relationships: [];
};
```

- [ ] **Step 3: Apply the migration locally**

Run: `npx supabase migration up` (local stack must be running). If you apply to remote instead, use your usual flow (e.g. Supabase MCP `apply_migration`). Expected: migration applies with no error; `transactions` shows the new columns.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no type errors from the edited `database.ts`).

- [ ] **Step 5: Checkpoint** - typecheck green, migration applied. Pause for review.

---

### Task 2: Category enum, zod schemas, confidence gate

**Files:**
- Create: `src/lib/schemas/ledger.ts`
- Create: `src/features/ledger/lib/auto-confirm.ts`
- Test: `src/features/ledger/lib/auto-confirm.test.ts`

**Interfaces:**
- Produces:
  - `LEDGER_CATEGORIES: readonly string[]`, `type LedgerCategory`
  - `ledgerCandidateSchema` (zod) -> `type LedgerCandidate = { occurredAt: string | null; direction: "income" | "expense"; amount: number; counterparty: string | null; category: LedgerCategory; confidence: number }`
  - `confirmLedgerSchema` (zod) -> `{ entries: ReviewedEntry[] }`, `type ReviewedEntry = { occurredAt: string; direction: "income" | "expense"; amount: number; counterparty: string | null; category: LedgerCategory; confidence: number | null; sourceRef: string | null }`
  - `AUTO_CONFIRM_THRESHOLD: number` (0.8), `isAutoConfirmEligible(candidate: LedgerCandidate): boolean`

- [ ] **Step 1: Write the schemas + enum**

Create `src/lib/schemas/ledger.ts`:

```typescript
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
```

- [ ] **Step 2: Write the failing test for the confidence gate**

Create `src/features/ledger/lib/auto-confirm.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import type { LedgerCandidate } from "@/lib/schemas/ledger";
import { isAutoConfirmEligible } from "./auto-confirm";

const base: LedgerCandidate = {
  occurredAt: "2026-06-15",
  direction: "expense",
  amount: 320,
  counterparty: "McDonald's",
  category: "food",
  confidence: 0.95,
};

describe("isAutoConfirmEligible", () => {
  it("accepts a high-confidence, fully-resolved candidate", () => {
    expect(isAutoConfirmEligible(base)).toBe(true);
  });

  it("rejects below the 0.8 confidence threshold", () => {
    expect(isAutoConfirmEligible({ ...base, confidence: 0.79 })).toBe(false);
  });

  it("rejects uncategorized regardless of confidence", () => {
    expect(isAutoConfirmEligible({ ...base, category: "uncategorized" })).toBe(false);
  });

  it("rejects when the date is missing", () => {
    expect(isAutoConfirmEligible({ ...base, occurredAt: null })).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/features/ledger/lib/auto-confirm.test.ts`
Expected: FAIL ("Failed to resolve import ./auto-confirm" or "isAutoConfirmEligible is not a function").

- [ ] **Step 4: Implement the gate**

Create `src/features/ledger/lib/auto-confirm.ts`:

```typescript
import type { LedgerCandidate } from "@/lib/schemas/ledger";

export const AUTO_CONFIRM_THRESHOLD = 0.8;

export function isAutoConfirmEligible(candidate: LedgerCandidate): boolean {
  return (
    candidate.confidence >= AUTO_CONFIRM_THRESHOLD &&
    candidate.category !== "uncategorized" &&
    candidate.amount > 0 &&
    candidate.occurredAt !== null
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/ledger/lib/auto-confirm.test.ts`
Expected: PASS (4 passing).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Checkpoint** - tests + typecheck green. Pause for review.

---

### Task 3: Ledger balance delta + loader wiring (money path)

**Files:**
- Create: `src/features/ledger/lib/ledger-balance.ts`
- Test: `src/features/ledger/lib/ledger-balance.test.ts`
- Modify: `src/features/financial-profile/api/load-financial-workspace.ts`

**Interfaces:**
- Consumes: nothing from prior tasks.
- Produces: `confirmedSavingsDelta(rows: { amount: number; direction: string | null }[]): number`. After wiring, `loadFinancialWorkspace` returns a workspace whose `profile.currentSavings` already includes the confirmed-ledger delta.

- [ ] **Step 1: Write the failing test (the money path)**

Create `src/features/ledger/lib/ledger-balance.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { confirmedSavingsDelta } from "./ledger-balance";

describe("confirmedSavingsDelta", () => {
  it("adds income and subtracts expense", () => {
    expect(
      confirmedSavingsDelta([
        { amount: 100, direction: "income" },
        { amount: 30, direction: "expense" },
      ])
    ).toBe(70);
  });

  it("returns 0 for an empty ledger", () => {
    expect(confirmedSavingsDelta([])).toBe(0);
  });

  it("ignores rows with an unknown/null direction", () => {
    expect(
      confirmedSavingsDelta([
        { amount: 100, direction: "income" },
        { amount: 999, direction: null },
      ])
    ).toBe(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/ledger/lib/ledger-balance.test.ts`
Expected: FAIL ("Failed to resolve import ./ledger-balance").

- [ ] **Step 3: Implement the delta function**

Create `src/features/ledger/lib/ledger-balance.ts`:

```typescript
type LedgerAmountRow = { amount: number; direction: string | null };

export function confirmedSavingsDelta(rows: LedgerAmountRow[]): number {
  return rows.reduce((total, row) => {
    if (row.direction === "income") return total + row.amount;
    if (row.direction === "expense") return total - row.amount;
    return total;
  }, 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/ledger/lib/ledger-balance.test.ts`
Expected: PASS (3 passing).

- [ ] **Step 5: Wire the delta into the workspace loader**

In `src/features/financial-profile/api/load-financial-workspace.ts`:

(a) Add the import at the top with the other imports:

```typescript
import { confirmedSavingsDelta } from "@/features/ledger/lib/ledger-balance";
```

(b) Add a `transactions` query to the `Promise.all` array (alongside the existing queries):

```typescript
      supabase
        .from("transactions")
        .select("amount, direction")
        .eq("user_id", userId)
        .eq("status", "confirmed"),
```

Add a matching name to the destructured array on the left, e.g.:
`const [profile, expenses, debts, goals, purchaseChecks, cooldownItems, weeklyReports, confirmedTx] = await Promise.all([ ... ]);`

(c) Before the `return`, fold the confirmed delta into the opening savings (immutably). Replace the `profile: profile.data` argument passed to `mapFinancialWorkspaceRows` with an adjusted row:

```typescript
  const delta = confirmedSavingsDelta(confirmedTx.data ?? []);
  const adjustedProfile = profile.data
    ? { ...profile.data, current_savings: profile.data.current_savings + delta }
    : profile.data;

  return {
    ok: true,
    data: mapFinancialWorkspaceRows({
      profile: adjustedProfile,
      expenses: expenses.data ?? [],
      debts: debts.data ?? [],
      goals: goals.data ?? [],
      purchaseChecks: purchaseChecks.data ?? [],
      cooldownItems: cooldownItems.data ?? [],
      weeklyReports: weeklyReports.data ?? [],
    }),
  };
```

This is shape-agnostic: the mapper still maps `current_savings -> currentSavings`, now with the delta baked in. The engine (`calculateSafeToSpend`) and dashboard (`Current Savings` KPI) both read `snapshot.profile.currentSavings`, so both update with no further edits.

- [ ] **Step 6: Run the full suite + typecheck**

Run: `npx vitest run` then `npx tsc --noEmit`
Expected: PASS. (The existing `load-financial-workspace.test.ts` should still pass; the added query/delta defaults to 0 when there are no confirmed rows.)

- [ ] **Step 7: Checkpoint** - tests + typecheck green. If the existing loader test mocks Supabase and now needs the `transactions` query stubbed, update that mock to return `{ data: [] }` for the transactions call. Pause for review.

---

### Task 4: Classify API route (image -> validated candidate)

**Files:**
- Create: `src/app/api/ledger/classify/route.ts`

**Interfaces:**
- Consumes: `ledgerCandidateSchema`, `isAutoConfirmEligible` (Tasks 2), `resolveServerModel`, `requireUserId`.
- Produces: `POST /api/ledger/classify` accepting `multipart/form-data` with an `image` file. Returns `200 { candidate: LedgerCandidate, autoConfirm: boolean }`, `401` unauthorized, `400` bad input, `422` extraction failure, `503` model not configured.

- [ ] **Step 1: Implement the route**

Create `src/app/api/ledger/classify/route.ts`:

```typescript
import { generateObject } from "ai";

import { resolveServerModel } from "@/lib/ai/model-spec";
import { isAutoConfirmEligible } from "@/features/ledger/lib/auto-confirm";
import { LEDGER_CATEGORIES, ledgerCandidateSchema } from "@/lib/schemas/ledger";
import { requireUserId } from "@/lib/supabase/server";

const CLASSIFY_PROMPT = [
  "You are reading a single financial transaction from a receipt or e-wallet/bank",
  "screenshot (GCash, GoTyme, Maya, Maribank, SeaBank, or a Philippine bank).",
  "Extract exactly one transaction.",
  "- amount: the transaction total, a positive number, no currency symbol.",
  "- direction: 'income' if money came in, 'expense' if money went out.",
  "- occurredAt: the transaction date as YYYY-MM-DD, or null if not visible.",
  "- counterparty: the merchant, sender, or recipient. If it is only a person's",
  "  name with no merchant (e.g. an InstaPay transfer), keep that name.",
  `- category: choose one of ${LEDGER_CATEGORIES.join(", ")}. If the data does not`,
  "  clearly identify a category (e.g. a transfer to a personal name), use",
  "  'uncategorized' and a low confidence.",
  "- confidence: 0..1, your certainty in the extraction and category.",
].join("\n");

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

export async function POST(request: Request): Promise<Response> {
  try {
    await requireUserId();
  } catch {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let model;
  try {
    model = resolveServerModel();
  } catch {
    return Response.json({ error: "Classifier model is not configured." }, { status: 503 });
  }

  const form = await request.formData();
  const image = form.get("image");
  if (!(image instanceof File)) {
    return Response.json({ error: "Missing image file." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(image.type)) {
    return Response.json({ error: "Unsupported file type." }, { status: 400 });
  }
  if (image.size > MAX_BYTES) {
    return Response.json({ error: "File too large." }, { status: 400 });
  }

  const bytes = new Uint8Array(await image.arrayBuffer());

  try {
    const { object: candidate } = await generateObject({
      model,
      schema: ledgerCandidateSchema,
      schemaName: "LedgerTransactionCandidate",
      schemaDescription: "One financial transaction extracted from a receipt or wallet screenshot.",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: CLASSIFY_PROMPT },
            { type: "image", image: bytes, mediaType: image.type },
          ],
        },
      ],
    });

    return Response.json({ candidate, autoConfirm: isAutoConfirmEligible(candidate) });
  } catch {
    // Model could not produce a schema-valid object (bad image, refusal, etc.).
    return Response.json({ error: "Could not read this image." }, { status: 422 });
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. (If `generateObject`'s image part rejects `mediaType`, drop that property - `image: bytes` alone is accepted; the AI SDK infers the type.)

- [ ] **Step 3: Manual smoke test (optional, needs `ADVISOR_MODEL` + key configured)**

With the dev server running and logged in, from the browser console on an app page:

```js
const fd = new FormData();
fd.append("image", document.querySelector('input[type=file]').files[0]);
await fetch("/api/ledger/classify", { method: "POST", body: fd }).then(r => r.json());
```

Expected: `{ candidate: {...}, autoConfirm: true|false }`. (Full UI smoke happens in Task 6.)

- [ ] **Step 4: Checkpoint** - typecheck green. Pause for review.

---

### Task 5: Confirm server action (write confirmed rows)

**Files:**
- Create: `src/features/ledger/api/confirm-ledger-entries.ts`

**Interfaces:**
- Consumes: `confirmLedgerSchema` (Task 2), `requireUserId`, `ActionResult`.
- Produces: `confirmLedgerEntriesAction(input: unknown): Promise<ActionResult<{ inserted: number }>>`. Inserts one `transactions` row per entry with `status='confirmed'`, `source='image'`, then revalidates the dashboard.

- [ ] **Step 1: Implement the action**

Create `src/features/ledger/api/confirm-ledger-entries.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";

import { confirmLedgerSchema } from "@/lib/schemas/ledger";
import { requireUserId } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/action-result";

export async function confirmLedgerEntriesAction(
  input: unknown
): Promise<ActionResult<{ inserted: number }>> {
  const parsed = confirmLedgerSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the transactions before saving.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { supabase, userId } = await requireUserId();

    const rows = parsed.data.entries.map((entry) => ({
      user_id: userId,
      amount: entry.amount,
      label: entry.counterparty ?? entry.category,
      occurred_at: entry.occurredAt,
      direction: entry.direction,
      category: entry.category,
      counterparty: entry.counterparty,
      source: "image",
      source_ref: entry.sourceRef,
      confidence: entry.confidence,
      status: "confirmed",
    }));

    const { error } = await supabase.from("transactions").insert(rows);

    if (error) {
      console.error("Unable to insert ledger rows", error);
      return { ok: false, error: "Unable to save these transactions." };
    }

    revalidatePath("/");
    return { ok: true, data: { inserted: rows.length } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save transactions.",
    };
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (the `transactions` Insert type from Task 1 accepts these fields).

- [ ] **Step 3: Checkpoint** - typecheck green. Pause for review.

---

### Task 6: Import UI - upload, fan-out, progress, review, confirm

**Files:**
- Create: `src/features/ledger/lib/map-with-concurrency.ts`
- Test: `src/features/ledger/lib/map-with-concurrency.test.ts`
- Create: `src/features/ledger/components/import-wizard.tsx`
- Create: `src/app/(app)/import/page.tsx`
- Modify: the `(app)` navigation component (add an "Import" link)

**Interfaces:**
- Consumes: `POST /api/ledger/classify` (Task 4), `confirmLedgerEntriesAction` (Task 5), `LEDGER_CATEGORIES`, `LedgerCandidate`, `ReviewedEntry` (Task 2).
- Produces: a working `/import` page that closes the loop.

**Before building the components: invoke the `frontend-design` skill** (per the user's global rule) and use the existing shadcn/vault components in `src/components/ui` (Button, Input, Select, Progress, Table, date-picker) so this matches the design system. The JSX below is functional reference - swap native controls for those components during the design pass.

- [ ] **Step 1: Write the failing test for the concurrency helper**

Create `src/features/ledger/lib/map-with-concurrency.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { mapWithConcurrency } from "./map-with-concurrency";

describe("mapWithConcurrency", () => {
  it("maps all items, preserving order", async () => {
    const out = await mapWithConcurrency([1, 2, 3, 4], 2, async (n) => n * 10);
    expect(out).toEqual([10, 20, 30, 40]);
  });

  it("never exceeds the concurrency limit", async () => {
    let active = 0;
    let peak = 0;
    await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (n) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return n;
    });
    expect(peak).toBeLessThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/ledger/lib/map-with-concurrency.test.ts`
Expected: FAIL ("Failed to resolve import ./map-with-concurrency").

- [ ] **Step 3: Implement the helper**

Create `src/features/ledger/lib/map-with-concurrency.ts`:

```typescript
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function run(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }

  const runners = Array.from({ length: Math.min(limit, items.length) }, run);
  await Promise.all(runners);
  return results;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/ledger/lib/map-with-concurrency.test.ts`
Expected: PASS (2 passing).

- [ ] **Step 5: Build the import wizard (client component)**

Create `src/features/ledger/components/import-wizard.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { confirmLedgerEntriesAction } from "@/features/ledger/api/confirm-ledger-entries";
import { mapWithConcurrency } from "@/features/ledger/lib/map-with-concurrency";
import {
  LEDGER_CATEGORIES,
  type LedgerCandidate,
  type LedgerCategory,
  type ReviewedEntry,
} from "@/lib/schemas/ledger";

const CONCURRENCY = 3;

type Row = {
  sourceRef: string;
  status: "done" | "failed";
  selected: boolean;
  occurredAt: string;
  direction: "income" | "expense";
  amount: number;
  counterparty: string;
  category: LedgerCategory;
  confidence: number | null;
};

function toRow(fileName: string, candidate: LedgerCandidate, autoConfirm: boolean): Row {
  return {
    sourceRef: fileName,
    status: "done",
    selected: autoConfirm,
    occurredAt: candidate.occurredAt ?? "",
    direction: candidate.direction,
    amount: candidate.amount,
    counterparty: candidate.counterparty ?? "",
    category: candidate.category,
    confidence: candidate.confidence,
  };
}

async function classifyFile(file: File): Promise<Row> {
  const body = new FormData();
  body.append("image", file);
  const response = await fetch("/api/ledger/classify", { method: "POST", body });
  if (!response.ok) {
    return {
      sourceRef: file.name,
      status: "failed",
      selected: false,
      occurredAt: "",
      direction: "expense",
      amount: 0,
      counterparty: "",
      category: "uncategorized",
      confidence: null,
    };
  }
  const data = (await response.json()) as { candidate: LedgerCandidate; autoConfirm: boolean };
  return toRow(file.name, data.candidate, data.autoConfirm);
}

export function ImportWizard() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setBusy(true);
    setError(null);
    setRows([]);
    setDone(0);
    setTotal(list.length);

    const processed = await mapWithConcurrency(list, CONCURRENCY, async (file) => {
      const row = await classifyFile(file);
      setDone((value) => value + 1);
      setRows((current) => [...current, row]);
      return row;
    });

    setBusy(false);
    void processed;
  }

  function patch(index: number, change: Partial<Row>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...change } : row)));
  }

  async function handleConfirm() {
    const entries: ReviewedEntry[] = rows
      .filter((row) => row.selected && row.status === "done")
      .map((row) => ({
        occurredAt: row.occurredAt,
        direction: row.direction,
        amount: row.amount,
        counterparty: row.counterparty.trim() === "" ? null : row.counterparty.trim(),
        category: row.category,
        confidence: row.confidence,
        sourceRef: row.sourceRef,
      }));

    if (entries.length === 0) {
      setError("Select at least one transaction to save.");
      return;
    }

    setBusy(true);
    const result = await confirmLedgerEntriesAction({ entries });
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/");
  }

  const selectedCount = rows.filter((row) => row.selected && row.status === "done").length;

  return (
    <div className="space-y-6">
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf"
        multiple
        disabled={busy}
        onChange={(event) => handleFiles(event.target.files)}
      />

      {total > 0 ? (
        <p>
          Processed {done} of {total}
        </p>
      ) : null}

      {error ? <p role="alert">{error}</p> : null}

      {rows.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Save</th>
              <th>Source</th>
              <th>Date</th>
              <th>Direction</th>
              <th>Amount</th>
              <th>Counterparty</th>
              <th>Category</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.sourceRef + index}>
                <td>
                  <input
                    type="checkbox"
                    checked={row.selected}
                    disabled={row.status === "failed"}
                    onChange={(event) => patch(index, { selected: event.target.checked })}
                  />
                </td>
                <td>{row.sourceRef}</td>
                <td>
                  <input
                    type="date"
                    value={row.occurredAt}
                    onChange={(event) => patch(index, { occurredAt: event.target.value })}
                  />
                </td>
                <td>
                  <select
                    value={row.direction}
                    onChange={(event) =>
                      patch(index, { direction: event.target.value as Row["direction"] })
                    }
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={row.amount}
                    onChange={(event) => patch(index, { amount: Number(event.target.value) })}
                  />
                </td>
                <td>
                  <input
                    value={row.counterparty}
                    onChange={(event) => patch(index, { counterparty: event.target.value })}
                  />
                </td>
                <td>
                  <select
                    value={row.category}
                    onChange={(event) =>
                      patch(index, { category: event.target.value as LedgerCategory })
                    }
                  >
                    {LEDGER_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  {row.status === "failed"
                    ? "Could not read - enter manually"
                    : row.confidence === null
                      ? "-"
                      : `${Math.round(row.confidence * 100)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {rows.length > 0 ? (
        <button type="button" disabled={busy} onClick={handleConfirm}>
          Save {selectedCount} transaction{selectedCount === 1 ? "" : "s"}
        </button>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 6: Add the page**

Create `src/app/(app)/import/page.tsx`:

```tsx
import { ImportWizard } from "@/features/ledger/components/import-wizard";

export default function ImportPage() {
  return (
    <section className="space-y-6">
      <header>
        <h1>Import transactions</h1>
        <p>Upload GCash, bank, or receipt screenshots. Review what we read, then save.</p>
      </header>
      <ImportWizard />
    </section>
  );
}
```

- [ ] **Step 7: Add a nav link**

Locate the navigation component used by the `(app)` layout (run `grep -rl "/goals\"" src/app src/features src/components` to find where the existing app links live) and add an entry pointing to `/import` labeled "Import", matching the existing link pattern.

- [ ] **Step 8: Run the full suite + typecheck**

Run: `npx vitest run` then `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 9: End-to-end manual verification (closes the loop)**

Start the dev server. Note the dashboard "Current Savings" value. Go to `/import`, upload 3-5 GCash/bank screenshots, watch the progress count, review the rows (correct any flagged ones, fix any that failed), click Save. You land on `/` and "Current Savings" + "Safe to Spend" have moved by the net of the saved transactions.

- [ ] **Step 10: Checkpoint** - tests + typecheck green, loop verified end to end. Pause for review.

---

## Self-Review

**Spec coverage** (against `docs/superpowers/specs/2026-06-27-ledger-ingestion-design.md`):
- Closed loop (upload -> classify -> review -> confirm -> dashboard moves): Tasks 4, 5, 6 + the loader wiring in Task 3. ✓
- Processing option A (per-image fan-out, concurrency 3, no backend): Task 6 (`mapWithConcurrency`, `classifyFile`). ✓
- Data model (transactions columns, opening-balance reconciliation, confirmed-only): Tasks 1, 3. ✓
- Classifier (one vision call, zod-validated via `generateObject`, reuse P10 resolver, confidence gate): Tasks 2, 4. ✓
- Category enum + threshold 0.8: Task 2. ✓
- Error handling (per-item isolation, failed tile + manual fallback, 422/400/401/503): Tasks 4, 6. ✓
- Validation/security (auth, RLS already present, file type/size caps, no image storage): Tasks 1, 4. ✓
- Testing (money path, schema/gate, LLM mocked - here avoided by testing pure units): Tasks 2, 3, 6. ✓
- Non-goals respected (no Storage bucket, no background jobs, no CSV, no new dep, goal/emergency as tags only). ✓

**Resolved spec open-decisions:** category enum = starter set; threshold = 0.8; image retention = none (no storage); CSV = deferred to slice 1b (not in this plan); vision model = reuse `resolveServerModel()` default `anthropic:claude-haiku-4-5` (NOT Gemini - avoids a new dependency).

**Placeholder scan:** No "TBD"/"add error handling" placeholders; every code step has complete code. The one locate-by-grep step (nav link, Task 6 Step 7) is a concrete action with the exact grep command, not a placeholder.

**Type consistency:** `LedgerCandidate`, `ReviewedEntry`, `LedgerCategory`, `LEDGER_CATEGORIES` defined in Task 2 and consumed with the same names/shapes in Tasks 4, 5, 6. `confirmedSavingsDelta` and `isAutoConfirmEligible` signatures match their call sites. The `transactions` Insert fields written in Task 5 match the columns added in Task 1.

**Known follow-ups (out of slice 1):** CSV/traditional-bank adapter (slice 1b, reuses Tasks 2/3/5/6); persisting `pending_review` rows + `raw_extract` for durable/cross-device review; real envelope buckets for goals/emergency.
