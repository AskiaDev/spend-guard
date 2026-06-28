# SpendGuard: Transaction Ledger + Receipt Ingestion (Slice 1)

- Date: 2026-06-27
- Status: Approved design, pending spec review
- Author: brainstormed with Claude

## Problem

SpendGuard is snapshot-based. Onboarding writes `profiles`, `expenses`, `debts`,
and `goals` once; nothing advances on its own. The day after onboarding every
number the engine (`src/lib/calculations/purchase-decision.ts`) computes -
safe-to-spend, financial health, goal progress - is already drifting from
reality. `goals.saved_amount` is a number the user bumps by hand. There is an
unused `transactions` table (`id, user_id, amount, label, created_at`) from
`supabase/migrations/20260620000000_initial_spendguard.sql` that nothing reads.

The user's original questions - "how do we track salary landing, savings
changing, emergency fund being deducted, goal progress over time?" - all reduce
to one gap: there is no ledger. State is frozen.

## Goal (this slice)

Ship one closed loop that makes the dashboard reflect ongoing activity:

```
upload 5-10 wallet/bank screenshots
  -> vision-LLM extracts + classifies each (merchant, amount, date, category, confidence)
  -> in-session review list (high-confidence pre-checked, low-confidence flagged)
  -> user confirms
  -> confirmed rows written to the ledger
  -> dashboard savings / safe-to-spend move
```

If confirming a row does not visibly move a number, the feature is dead - so
minimal engine wiring is part of this slice, not a follow-up.

### Why image-first

PH digital-wallet users (GCash, GoTyme, Maya, Maribank, SeaBank) export
screenshots/PDFs, not clean CSV. The image/vision path is therefore the
high-coverage adapter and covers the accounts these users actually live in.
"CSV import" really means traditional-bank statements and is the fast-follow
(see Slice 1b).

## Non-goals (explicit)

- Bank / GCash / e-wallet **API** integration. No consumer transaction API
  exists for GCash; PH open banking (BSP Open Finance / Brankas) is
  partnership-and-accreditation gated. Out of scope, possibly indefinitely.
- Durable background jobs (design option B). We use option A (per-image fan-out).
- Real envelope/bucket accounting. Goal and emergency are **category tags** on a
  single savings pool, not separate balances.
- Provider async Batch APIs (OpenAI/Anthropic) - 24h turnaround, wrong for an
  interactive progress bar.
- Paper-receipt photo capture as a priority. Vision works on any image, but the
  target is wallet/bank screenshots.

## Architecture

### Processing - option A (per-image fan-out, no new backend)

The only real constraint is serverless function timeout: N sequential vision
calls in one request can exceed it. Option A sidesteps that.

- Frontend reads the selected files and fans out **one request per image** with
  a client-side concurrency cap (~3 in flight).
- Each request hits a classify endpoint that makes exactly one vision call and
  returns a single transaction **candidate**. The endpoint is read-only - it
  does **not** write to the ledger.
- Progress bar = resolved count / total. Candidates append to the review list as
  they land.
- A separate confirm action writes the confirmed rows.

Separating classify (read-only, LLM) from confirm (DB write) keeps retries safe
and avoids partial saves. Losing in-flight unsaved candidates on tab-close is
acceptable - nothing is persisted until confirm.

"Batch" = concurrent fan-out of the user's uploads, NOT a provider Batch API.

### Data model

Expand the existing `transactions` table via a new migration:

```
transactions (added columns)
  occurred_at    date          -- actual transaction date (distinct from created_at)
  direction      text          -- 'income' | 'expense'
  category       text          -- from a fixed enum (see below)
  counterparty   text          -- "McDonald's" / "Wise" / a person's name; nullable
  source         text          -- 'manual' | 'csv' | 'image'
  source_ref     text          -- uploaded file name / csv row; nullable
  confidence     numeric       -- 0..1; null for manual entries
  status         text          -- 'pending_review' | 'confirmed' (MVP writes 'confirmed')
  raw_extract    jsonb         -- raw LLM output, for audit/debug
```

- Index on `(user_id, status, occurred_at)`. RLS by `user_id` matching the
  existing table policies.
- **Opening-balance reconciliation:** `profiles.current_savings` becomes the
  opening anchor. The snapshot builder computes
  `effectiveSavings = current_savings + sum(confirmed income) - sum(confirmed expense)`
  and the engine reads `effectiveSavings` where it currently reads raw
  `currentSavings` (`calculateSafeToSpend`, health inputs). Only `confirmed`
  rows count.

This reconciliation is the answer to the original questions: salary lands ->
confirmed income row -> savings rises; emergency dip -> confirmed expense tagged
`emergency` -> savings drops; goal contribution -> row tagged to the goal.

### Classifier

- One vision call per image. Reuse the existing **P10 model-agnostic AI chain**
  (cloud leg) rather than hardcoding a vendor - specifically `resolveServerModel()`
  in `src/lib/ai/model-spec.ts`, which already resolves provider/model from
  `ADVISOR_MODEL` (default `anthropic:claude-haiku-4-5`, a vision-capable model).
  No new dependency. Gemini would require adding `@ai-sdk/google`; skip it unless
  cost later demands it. The local LiteRT leg is text-only, so vision always uses
  the cloud leg - expected.
- Output is **zod-validated** - never trust the model's JSON:

```
{
  occurredAt:   string (ISO date) | null,
  direction:    'income' | 'expense',
  amount:       number (> 0),
  counterparty: string | null,
  category:     <enum>,
  confidence:   number (0..1)
}
```

- **Category enum (starter set):** `food`, `groceries`, `transport`, `bills`,
  `shopping`, `health`, `transfer`, `income_salary`, `income_other`,
  `uncategorized`. The model must pick from this set.
- **Confidence gate:** threshold constant (proposed `0.8`). At or above ->
  pre-checked in the review list. Below, or `category = uncategorized`, or any
  null required field -> flagged, must be reviewed. The McDon's-via-InstaPay
  case (payee is a person's name, no merchant) lands here by design - the review
  queue resolves it, not better OCR.
- **Review UX:** all candidates shown; high-confidence pre-selected; user edits
  flagged ones, then bulk-confirms. No silent auto-save.

### Input adapters

- **Slice 1: image/vision** (this spec).
- **Slice 1b: CSV (traditional-bank), fast-follow.** Reuses ~80%: same review
  list, same ledger, same category enum/gate. Swaps the vision call for a parser
  (per-source column mapping). Not built in slice 1.

## Error handling, validation, security

- Per-image isolation: one failed image fails just its tile (retry / "enter
  manually" fallback), never the batch. zod parse failure, LLM refusal, or empty
  output = failed item.
- Validate `amount > 0` and `occurredAt` parses (or null -> user fills) before
  the row is confirm-eligible.
- Auth required; `transactions` RLS by `user_id`.
- Uploads: file-type allowlist (png/jpg/webp/pdf), size cap (~10MB), validated
  client-side and again at the classify endpoint.
- Images are **not persisted server-side** in slice 1. The classify endpoint
  receives an image, calls the model, and discards it; the client holds previews
  for in-session review. No Storage bucket needed, and best for PII. (Revisit
  only if durable / cross-device review is added later - that is option B
  territory.)
- PII: do not log raw extract text or image contents to server logs.

## Testing

- Money path (unit, snapshot builder): confirming income +100 raises
  `effectiveSavings` by exactly 100; expense -100 lowers it.
- zod schema rejects malformed LLM output.
- Confidence gate routes `< threshold` and `uncategorized` to flagged/review.
- LLM mocked throughout. No heavy harness.

## Deliberate simplifications (ponytail)

- One savings pool; income +, expense -. Goal/emergency are category tags, not
  envelope balances. Add envelopes when users ask.
- MVP persists only `confirmed` rows; pending candidates live in client state
  (option A accepts losing in-flight on tab-close). `status` column kept to
  future-proof durable review.

## Open decisions (resolve at spec review)

1. Category enum - accept the starter set above, or adjust?
2. Confidence threshold - `0.8` ok?
3. Image retention - slice 1 does not store images server-side (proposed). Keep
   that, or persist to a private Storage bucket for cross-device / later re-review?
4. CSV - confirm it's slice 1b (fast-follow), not slice 1?
5. Vision model - resolved: reuse `resolveServerModel()` (default
   `anthropic:claude-haiku-4-5`, vision-capable), no new dependency. Revisit only
   if cost/accuracy later justifies adding `@ai-sdk/google` (Gemini Flash).
