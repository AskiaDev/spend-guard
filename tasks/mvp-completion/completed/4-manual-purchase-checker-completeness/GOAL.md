# Current Goal: 4 — Manual purchase checker completeness

## Goal metadata

- Feature: `mvp-completion`
- Phase: `4`
- Status: `READY FOR HUMAN REVIEW`
- Source plan: `tasks/mvp-completion/ROADMAP.md`
- Previous phase report: `tasks/mvp-completion/completed/3-rules-engine-prd-section-19/REPORT.md`

## 0. Repository harness (SpendGuard)

- Stack: Next.js 16 (App Router) + React 19 + TypeScript (strict) + Supabase (Auth + Postgres + RLS) + Tailwind. Tests: Vitest (jsdom) + React Testing Library; Playwright e2e.
- READ FIRST: `AGENTS.md` warns "This is NOT the Next.js you know." Relevant local docs inspected before this phase: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`, `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`, and `node_modules/next/dist/docs/01-app/02-guides/forms.md`.
- UI phase rule: `frontend-design` skill was invoked before UI implementation. Keep the existing operational app-shell aesthetic: dense, readable finance controls, icon-backed actions, no marketing landing-page pattern.
- Exact commands, run from the code root:
    - Focused tests: `npm test -- src/features/purchase-checker/components/purchase-checker-wizard.test.tsx src/features/purchase-checker/components/purchase-result.test.tsx src/features/purchase-checker/api/save-purchase-check.test.ts src/lib/schemas/finance.test.ts src/lib/supabase/finance-mappers.test.ts src/hooks/use-financial-state.test.tsx`
    - Typecheck: `npm run typecheck`
    - Lint: `npm run lint`
    - Full unit/component suite: `npm test`
    - Coverage: `npm run test:coverage`
    - Build: `npm run build`
    - Remote migration apply, if approved: `supabase db push`
    - Scope checks: `git diff --check`, `git diff --stat`, `git diff --name-only`, `git status --short`
- Git boundary: never commit, push, merge, rebase, or deploy. Capture this phase as `tasks/mvp-completion/completed/4-manual-purchase-checker-completeness/4-manual-purchase-checker-completeness.patch` only after remote migration and remote E2E verification pass.

Remote Supabase boundary: use Supabase remote only going forward. Do not use local Supabase for verification. Applying the new migration to remote requires explicit user approval because it mutates a third-party resource.

## 1. Current project state

The following work is already complete:

- Phase 1 verified the merged redesign + Supabase baseline.
- Phase 2 added profile completeness fields and onboarding-completed routing.
- Phase 3 implemented the deterministic PRD Section 19 rules engine, durable risk-score / savings-after / cooldown result fields, and live down-payment / income-generation / current-alternative inputs.

Do not redo, replace, or redesign completed work.

Before changing code:

1. inspect the current implementation and diff;
2. preserve the current Phase 1-3 local working tree;
3. add or update tests before implementation where practical;
4. keep this phase independent and reversible.

## 2. Objective

Implement:

> Complete the manual purchase checker so it captures the remaining PRD fields, persists complete check history, displays the PRD result details, and lets a saved result be marked as bought or skipped.

This milestone owns:

- Manual checker fields: `category`, `saleDeadline`, `location`, `notes`, plus down payment as an active engine input.
- Durable purchase-check history fields and Supabase save/load mapping for the manual checker metadata and bought/skipped status.
- Result UI surfacing decision, risk score, savings-after-purchase, emergency-fund impact, debt conflict, goal-delay months, cooldown recommendation, reasons, recommended next action, and advisor text.
- Result actions: mark the active saved check as bought or skipped.

This milestone does not include:

- Goal planner completion or convert-to-goal end-to-end behavior (Phase 5).
- Cooldown recheck or convert-to-goal completion (Phase 6).
- Expenses/debts/settings management routes (Phase 7).
- Dashboard, weekly report, LiteRT, privacy, or e2e hardening phases.

## 3. Required behavior

The implementation must:

1. show and validate the remaining manual-check fields without breaking the existing three-step wizard flow;
2. include category, sale deadline, location, notes, down payment, income-generation, and current-alternative inputs in the `PurchaseInput` passed to the rules engine and save action;
3. persist and reload those fields through Supabase with additive schema changes only;
4. keep down payment active in the Phase 3 savings-after and risk-score model;
5. render result details from deterministic engine output, not static placeholders;
6. expose mark-as-bought and mark-as-skipped actions for a saved check, with duplicate-action protection and retryable errors;
7. keep add-to-goal and add-to-cooldown behavior present but avoid implementing later-phase convert/recheck flows;
8. preserve server-action auth/RLS boundaries by deriving `user_id` on the server.

## 4. Architectural invariants

The implementation must preserve:

1. The deterministic rules engine (`src/lib/calculations/**`) remains the single source of financial decisions; the LLM advisor only explains, never decides.
2. Existing formulas, Zod validation, and persistence logic are reused rather than copied.
3. Server actions check the authenticated user and derive `user_id` from Supabase Auth.
4. Existing public APIs stay backward-compatible unless the phase requires additive optional fields.
5. Business logic stays in calculation/schema/server-action seams; UI components orchestrate and present.
6. Work from completed phases is not redesigned.

Stop and report if satisfying this goal would require weakening one of these invariants.

## 5. Important behavioral definitions

### Mark as bought / skipped

This phase records a status on the saved purchase check. It does not create a transaction ledger, alter savings, generate a goal, or re-run the rules engine.

Allowed statuses:

- `checked`
- `bought`
- `skipped`

The default for existing rows is `checked`.

### Debt conflict and emergency-fund impact

These are display fields derived from deterministic result values already produced by Phase 3. If no dedicated persisted column is needed, compute them from `PurchaseCheck` values in presentation code and cover with component tests.

## 6. Existing implementation to inspect

Before editing, inspect:

- `src/features/purchase-checker/components/purchase-checker-wizard.tsx`
- `src/features/purchase-checker/components/purchase-result.tsx`
- `src/features/purchase-checker/api/save-purchase-check.ts`
- `src/hooks/use-financial-state.ts`
- `src/lib/schemas/finance.ts`
- `src/lib/supabase/finance-mappers.ts`
- `src/types/finance.ts`
- `src/types/database.ts`
- matching tests under those paths

Current findings:

- Wizard currently collects `category` visually but does not include it in `PurchaseInput`.
- Wizard does not collect `saleDeadline`, `location`, or `notes`.
- Down payment is already passed to the engine for financed methods after Phase 3.
- Result UI shows core metrics and action buttons, but does not show all PRD result details or bought/skipped status actions.
- `purchase_checks` persistence lacks category / sale deadline / location / notes / status fields.

## 7. Allowed files

Prefer limiting changes to:

- `src/types/finance.ts`
- `src/types/database.ts`
- `src/lib/schemas/finance.ts`
- `src/lib/supabase/finance-mappers.ts`
- `src/hooks/use-financial-state.ts`
- `src/features/purchase-checker/api/save-purchase-check.ts`
- `src/features/purchase-checker/components/purchase-checker-wizard.tsx`
- `src/features/purchase-checker/components/purchase-result.tsx`
- related focused tests for the files above
- `supabase/migrations/[new migration]`
- `tasks/mvp-completion/STATUS.md`
- this goal/report/archive files

An additional file may be modified only when necessary and documented in `STATUS.md`.

## 8. Forbidden files and scope

Do not modify:

- completed phase archives except to read them;
- unrelated routes or dashboard/report/advisor/privacy screens;
- goal planner CRUD UI beyond preserving existing add-to-goal callback;
- cooldown recheck / convert-to-goal implementation;
- production / environment configuration.

Do not begin the next phase, introduce a competing rules engine, weaken tests, bypass validation or RLS, commit, push, merge, rebase, deploy, or modify production data.

## 9. Preferred implementation shape

Preferred public seam:

```text
PurchaseCheckerWizard
  -> PurchaseInput with additive metadata fields
  -> useFinancialState.runPurchaseCheck()
  -> calculatePurchaseDecision()
  -> savePurchaseCheckAction()
  -> purchase_checks row
  -> finance-mappers reload
  -> PurchaseResult display + markPurchaseCheckStatusAction()
```

Keep new status mutation as a small purchase-checker server action that derives `user_id` and updates only the authenticated user's row.

## 10. Required tests

At minimum, test:

1. wizard includes category, sale deadline, location, notes, and financed down payment in submitted `PurchaseInput`;
2. invalid optional date / negative down payment behavior where applicable;
3. schema accepts valid metadata and rejects invalid metadata;
4. save action persists metadata fields and check status defaults;
5. mapper reloads metadata and status with safe defaults for older rows;
6. result UI shows risk score, savings-after, emergency-fund impact, debt conflict, goal-delay months, cooldown recommendation, reasons, recommended next action, and advisor text;
7. mark-as-bought / mark-as-skipped calls a server-backed callback with duplicate-action protection and retryable errors;
8. `useFinancialState.runPurchaseCheck` carries new fields from input to saved check.

At least one test must exercise:

```text
PurchaseCheckerWizard / PurchaseResult public component
→ hook/server-action seam
→ deterministic result or persisted status behavior
```

## 11. Verification commands

Focused verification:

```bash
npm test -- src/features/purchase-checker/components/purchase-checker-wizard.test.tsx src/features/purchase-checker/components/purchase-result.test.tsx src/features/purchase-checker/api/save-purchase-check.test.ts src/lib/schemas/finance.test.ts src/lib/supabase/finance-mappers.test.ts src/hooks/use-financial-state.test.tsx
npm run typecheck
```

Public-path or integration verification:

```bash
npm test -- src/features/purchase-checker/components/purchase-checker-wizard.test.tsx src/features/purchase-checker/components/purchase-result.test.tsx src/hooks/use-financial-state.test.tsx
```

Relevant regressions:

```bash
npm test
npm run lint
npm run test:coverage
npm run build
supabase db reset
```

Scope and diff verification:

```bash
git diff --check
git diff --stat
git diff --name-only
git status --short
```

## 12. Claim-to-evidence matrix

| Completion claim | Evidence | Status |
| --- | --- | --- |
| Manual checker captures remaining PRD fields | wizard component tests | NOT VERIFIED |
| Metadata persists and reloads | save-action + mapper tests + migration replay | NOT VERIFIED |
| Down payment remains active in engine input | wizard/useFinancialState tests | NOT VERIFIED |
| Result UI surfaces required PRD details | result component tests | NOT VERIFIED |
| Saved check can be marked bought/skipped | result/hook/server-action tests | NOT VERIFIED |
| Existing behavior unchanged | focused suite + full suite + lint/typecheck/build/coverage | NOT VERIFIED |
| Public path works | component/hook public path tests | NOT VERIFIED |
| No forbidden files changed | `git diff --name-only` | NOT VERIFIED |
| Diff is structurally valid | `git diff --check` | NOT VERIFIED |

Allowed statuses: `VERIFIED`, `PARTIALLY VERIFIED`, `NOT VERIFIED`, `BLOCKED`.

## 13. Execution workflow

Before implementation: update `STATUS.md` with inspection findings; write failing focused tests for the missing behavior; implement the smallest changes; run focused verification after each coherent behavior.

Before finishing: run the public-path check, relevant regressions, lint, coverage, build, migration replay, diff checks, and an independent review pass.

## 14. Retry and stop conditions

Make no more than three materially different repair attempts for the same failure. Stop immediately when a product decision is required, a public contract must change non-additively, a destructive migration is required, a forbidden file appears necessary, production access is required, or an architectural invariant would be violated.

## 15. Definition of Done

This milestone is complete only when every required behavior is implemented; architectural invariants are preserved; focused tests pass; public component/hook paths are exercised; relevant regressions + lint + coverage + build pass; migration replay is verified or honestly blocked with direct schema evidence; no forbidden files changed; `git diff --check` passes; claim-to-evidence entries have command-backed evidence; `STATUS.md` is current; an independent review finds no blocking/important unresolved issue; the next phase has not started.

## 16. Final report

The final report must include outcome (`COMPLETE` / `PARTIAL` / `BLOCKED`), files changed, exploration findings, implementation design, behavior implemented, commands and tests executed, claim-to-evidence matrix, review findings, unresolved risks, unrelated existing failures, scope confirmation, checkpoint patch path and SHA-256, and human-review checklist.
