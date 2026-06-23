# Current Goal: 6 — Cooldown completion

## Goal metadata

- Feature: `mvp-completion`
- Phase: `6`
- Status: `READY TO START`
- Source plan: `tasks/mvp-completion/ROADMAP.md` (PRD §11.6, §19.5)
- Previous phase report: `tasks/mvp-completion/completed/5-goal-planner-completion/REPORT.md`

## 0. Repository harness (SpendGuard)

- Stack: Next.js 16 (App Router) + React 19 + TypeScript (strict) + Supabase (Auth + Postgres + RLS) + Tailwind / shadcn. Tests: Vitest (jsdom) + React Testing Library; Playwright e2e.
- READ FIRST: `AGENTS.md` warns "This is NOT the Next.js you know." Read the relevant guide under `node_modules/next/dist/docs/` before writing Next-specific code (the cooldown server action). Heed Next 16 / React 19 deprecations.
- Commands (run in CODE ROOT): `npm run typecheck` · `npm run lint` · `npm test` · `npm test -- <path>` · `npm run test:coverage` (80% gate) · `npm run e2e` · `npm run build` · migrations via `supabase db reset`.
- Frontend rule: this is a UI-bearing phase — invoke the `frontend-design` skill before writing UI; verify the real page via Playwright.
- Git boundary (HARD): never commit/push/merge/rebase/deploy. Capture the finished phase as a patch under `tasks/mvp-completion/completed/6-cooldown-completion/6-cooldown-completion.patch`.

## 1. Current project state

Complete and verified (archived under `completed/`, baseline re-verified this run: typecheck clean, lint 0 errors, `npm test` = 35 files / 173 tests green):

- P1 integration baseline; P2 profile & schema completeness; P3 PRD §19 deterministic engine (`src/lib/calculations/**`); P4 manual purchase checker; P5 goal planner.
- Cooldown today: `cooldown_items` table (`item_name, amount, urgency, payment_method, source_check_id, added_at, recheck_at`); `createCooldownItemAction` / `deleteCooldownItemAction`; mapper + loader; `useFinancialState.addCooldownFromCheck` / `removeCooldownItem`; `CooldownPanel` UI.

Do not redo, replace, or redesign completed work.

## 2. Objective

Implement:

> Complete the cooldown feature: surface the price-tier default cooldown, enable Recheck (recompute the §19 decision against a fresh financial snapshot and report whether the decision / safe-to-spend improved since the item was added), and enable convert-to-goal — all driven by the existing deterministic engine.

This milestone owns:

- Persisting, at add-time, the baseline the recheck compares against (decision, risk score, safe-to-spend) plus the decision-affecting purchase inputs (down payment, installment months, monthly payment, income-generating, alternative-still-works) on `cooldown_items` via an additive + reversible migration.
- A pure, exhaustively-tested `recheckCooldownItem(item, snapshot)` engine helper that recomputes `calculatePurchaseDecision` from the item's stored inputs against the current snapshot and reports the trend vs the stored baseline.
- Enabling the `Recheck` and `Convert to Goal` controls in `CooldownPanel`, showing the real decision (not the urgency heuristic) and the price-tier cooldown period.
- `useFinancialState.addGoalFromCooldown` (mirrors `addGoalFromCheck`) and richer `addCooldownFromCheck` payload.

This milestone does not include:

- P7 expenses/debts/settings CRUD; P8 dashboard cards; P9 weekly report; P10 LiteRT advisor; P11 privacy surface; P12 e2e/coverage hardening.
- Re-architecting the §19 engine or changing any of its outputs.
- Resetting/extending the cooldown timer on recheck, or persisting recheck history (out of scope — recheck is a read-only recompute).

## 3. Required behavior

The implementation must:

1. Derive each cooldown item's default cooldown period from the purchase price tier (PRD §19.5: <2k→1, <10k→3, <50k→7, else 30 days) and surface it on the card; `recheck_at` = `added_at` + that period.
2. On `Recheck`, recompute the purchase decision with the current financial snapshot and the item's stored purchase inputs, and report decision trend (improved / unchanged / worsened) and the safe-to-spend change since the item was added.
3. Show the real engine decision on the card's status badge (from the stored baseline), not the `need_now ? CAUTION : WAIT` heuristic.
4. On `Convert to Goal`, create a goal from the cooldown item (label, target = amount, payday-aware monthly contribution) through the existing `createGoalAction` path.
5. Persist the baseline + decision-affecting inputs when a cooldown item is created from a check; existing rows without a baseline must degrade gracefully (recheck still recomputes; trend shows "no baseline to compare").
6. Be deterministic: same item + same snapshot → same recheck result. The LLM advisor must not influence the decision.

## 4. Architectural invariants

1. The deterministic engine (`src/lib/calculations/**`) stays the single source of decisions; recheck calls `calculatePurchaseDecision`, it does not re-derive thresholds. The LLM never decides.
2. Reuse existing formulas, Zod schemas (`purchaseInputSchema`), mappers, and the `createGoalAction` path rather than copying.
3. Server actions check the authenticated user and derive `user_id` from Supabase Auth; RLS isolation preserved; never trust a client `user_id`.
4. `createCooldownItemAction` / `deleteCooldownItemAction` signatures stay backward-compatible (new fields are optional/additive).
5. New orchestration stays thin; the recheck rule lives in the calculations layer as a pure function.
6. Completed-phase work (P1–P5) is not redesigned.

Stop and report if satisfying the goal would require violating one of these.

## 5. Important behavioral definitions

### "Improved since added"

Compare the recheck against the baseline captured when the item was added. Decision rank, best→worst: `SAFE_TO_BUY` > `BUY_WITH_CAUTION` > `WAIT` > `NOT_RECOMMENDED`.

- `improved` — current decision ranks strictly better than the baseline decision.
- `worsened` — current decision ranks strictly worse.
- `unchanged` — same decision rank (UI may still surface the safe-to-spend delta).
- `unknown` — no stored baseline (legacy rows); recheck still recomputes the current decision.

`safeToSpendDelta` = current safe-to-spend − baseline safe-to-spend (null when no baseline).

It must not: invent a new decision scale; alter §19 thresholds; reset the cooldown timer; persist anything during a recheck.

## 6. Existing implementation to inspect

- `src/features/cooldown/components/cooldown-panel.tsx` (disabled Recheck/Convert at L279–298; fake `getCooldownDecision` at L364).
- `src/features/cooldown/api/create-cooldown-item.ts` (cooldownSchema, insert).
- `src/hooks/use-financial-state.ts` (`addCooldownFromCheck` L185, `addGoalFromCheck` L168, `removeCooldownItem` L219).
- `src/lib/calculations/purchase-decision.ts` (`calculatePurchaseDecision` L214) and `cooldown.ts` (`getCooldownDays` L3).
- `src/lib/supabase/finance-mappers.ts` (cooldown mapping L139); `src/types/finance.ts` (`CooldownItem` L101); `src/types/database.ts` (`cooldown_items` L168).
- `src/app/(app)/_components/page-adapters.tsx` (`CooldownPageContent` L93).
- Tests: `cooldown-panel.test.tsx`, `finance-mappers.test.ts`, `cooldown.test.ts`, `create-goal.test.ts`, `page-adapters.test.tsx`.

## 7. Allowed files

- `supabase/migrations/20260623003000_cooldown_recheck_baseline.sql` (new)
- `src/types/database.ts`, `src/types/finance.ts`
- `src/lib/calculations/cooldown-recheck.ts` (new) + `.test.ts` (new)
- `src/features/cooldown/api/create-cooldown-item.ts` + `create-cooldown-item.test.ts` (new)
- `src/lib/supabase/finance-mappers.ts` + `finance-mappers.test.ts`
- `src/hooks/use-financial-state.ts`
- `src/features/cooldown/components/cooldown-panel.tsx` + `cooldown-panel.test.tsx`
- `src/features/cooldown/index.ts` (export new types if needed)
- `src/app/(app)/_components/page-adapters.tsx` + `page-adapters.test.tsx`
- `tasks/mvp-completion/STATUS.md`

An additional file may be modified only when necessary, documented before editing, and not scope-expanding.

## 8. Forbidden files and scope

Do not modify: `src/lib/calculations/purchase-decision.ts`, `cashflow.ts`, `emergency-fund.ts`, `debt-pressure.ts`, `goal-impact.ts`, `health-score.ts` (engine outputs are frozen); completed-phase migrations; P7–P12 files; auth/middleware; production/env config.

Do not: begin the next phase; introduce a competing decision engine; weaken tests/validation/RLS; perform unrelated refactors; commit/push/merge/rebase/deploy.

## 9. Preferred implementation shape

```text
src/lib/calculations/cooldown-recheck.ts
  cooldownItemToPurchaseInput(item: CooldownItem): PurchaseInput
  recheckCooldownItem(item: CooldownItem, snapshot: FinancialSnapshot): CooldownRecheckResult
    → { current: PurchaseDecisionResult, baselineDecision, baselineSafeToSpend, baselineRiskScore,
        decisionTrend: "improved"|"unchanged"|"worsened"|"unknown", safeToSpendDelta, cooldownDays }
```

Reuse `calculatePurchaseDecision` and `getCooldownDays`. The panel calls `recheckCooldownItem` client-side (snapshot already in state); no new server round-trip for recheck. Convert-to-goal reuses `createGoalAction` via a new thin `addGoalFromCooldown` hook callback.

## 10. Required tests

1. Recheck improved / unchanged / worsened / unknown-baseline.
2. `safeToSpendDelta` sign and value; deterministic (same input → same output).
3. Decision-rank boundary: baseline `WAIT` → current `BUY_WITH_CAUTION` = improved; reverse = worsened.
4. `cooldownItemToPurchaseInput` carries the decision-affecting fields (installment, down payment, income-generating, alternative).
5. Mapper reads the new columns and defaults them when null (legacy rows).
6. `createCooldownItemAction` persists the new fields with authenticated `user_id` (mocked Supabase); invalid input rejected.
7. `CooldownPanel`: Recheck enabled → click renders the recomputed decision + trend; Convert enabled → click calls the handler; baseline decision shown on the badge; price-tier cooldown period shown.
8. `page-adapters` passes `snapshot` + `onConvertToGoal` to the panel.
9. Forbidden: recheck never mutates the item or calls a persistence action.

Public-path test: `CooldownPanel` (component) → `recheckCooldownItem` (real engine) → rendered decision/trend; and `addGoalFromCooldown` → `createGoalAction`.

## 11. Verification commands

```bash
npm test -- src/lib/calculations/cooldown-recheck.test.ts
npm test -- src/features/cooldown/components/cooldown-panel.test.tsx
npm test -- src/features/cooldown/api/create-cooldown-item.test.ts
npm test -- src/lib/supabase/finance-mappers.test.ts "src/app/(app)/_components/page-adapters.test.tsx"
npm run typecheck
npm test
npm run lint
npm run test:coverage
npm run build
# migration replay (environment permitting):
supabase start && supabase db reset
git diff --check && git diff --stat && git diff --name-only && git status --short
```

## 12. Claim-to-evidence matrix

| Completion claim | Evidence | Status |
| --- | --- | --- |
| Recheck recomputes decision vs fresh snapshot + reports trend | `cooldown-recheck.test.ts`, `cooldown-panel.test.tsx` | NOT VERIFIED |
| Price-tier cooldown surfaced; recheck date derived | `cooldown-panel.test.tsx` | NOT VERIFIED |
| Convert-to-goal works end to end | `cooldown-panel.test.tsx`, `create-goal.test.ts` | NOT VERIFIED |
| Baseline persisted + mapped; legacy rows degrade | `create-cooldown-item.test.ts`, `finance-mappers.test.ts` | NOT VERIFIED |
| Engine outputs unchanged (no §19 edits) | `npm test`, `git diff --name-only` | NOT VERIFIED |
| Deterministic; LLM never decides | `cooldown-recheck.test.ts` | NOT VERIFIED |
| No forbidden files changed | `git diff --name-only` | NOT VERIFIED |
| Migration additive + reversible | documented rollback; `supabase db reset` | NOT VERIFIED |
| Diff structurally valid | `git diff --check` | NOT VERIFIED |

## 13. Execution workflow

TDD per behavior: write/extend the focused test, observe red, make the smallest change, run focused verification, inspect diff, update `STATUS.md`. Migration + types first (so the rest typechecks), then the pure engine helper, then action/mapper/hook, then UI (frontend-design first), then wiring. Finish with full regression + coverage + build + scope check + independent review.

## 14. Retry and stop conditions

Max 3 materially-different repair attempts per failure. Stop and report if: a product decision is required (e.g. convert-to-goal must delete the item — default is keep, matching `addGoalFromCheck`); the goal conflicts with repo behavior; a forbidden file appears necessary; a public contract must change; a destructive migration is required; an invariant would be violated. If `supabase db reset` cannot run (no local Docker), mark that check BLOCKED(environment) with the documented rollback and continue — do not fake it.

## 15. Definition of Done

Every required behavior implemented; invariants preserved; focused tests pass; public path exercised (component → engine; hook → action); regressions + lint pass; coverage ≥ 80%; determinism shown; migration additive + reversible (rollback documented); no forbidden files changed; `git diff --check` clean; all claims have evidence; `STATUS.md` current; next phase not started.

## 16. Final report

Per `tasks/templates/REPORT_TEMPLATE.md`. No commit/push/merge/rebase/deploy.
