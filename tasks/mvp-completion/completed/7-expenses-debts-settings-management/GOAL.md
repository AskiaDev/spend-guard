# Current Goal: 7 — Expenses / Debts / Settings Management

## Goal metadata

- Feature: `SpendGuard MVP completion`
- Phase: `7`
- Status: `READY TO START`
- Source plan: `tasks/mvp-completion/ROADMAP.md`
- Previous phase report: `tasks/mvp-completion/completed/6-cooldown-completion/REPORT.md`

## 0. Repository harness (SpendGuard)

- Stack: Next.js 16 (App Router) + React 19 + TypeScript (strict) + Supabase (Auth + Postgres + RLS) + Tailwind / shadcn. Tests: Vitest (jsdom) + React Testing Library; Playwright e2e.
- READ FIRST: `AGENTS.md` warns "This is NOT the Next.js you know." Read the relevant guide under `node_modules/next/dist/docs/` before writing Next-specific code. Heed Next 16 / React 19 deprecations.
- Exact commands (run in CODE ROOT):
  - Typecheck: `npm run typecheck`
  - Lint: `npm run lint`
  - Unit + component tests: `npm test` / `npm test -- <path>`
  - Coverage: `npm run test:coverage`
  - Build: `npm run build`
  - E2E/public path: Playwright against `127.0.0.1:3100` when practical; otherwise component tests must exercise the routed page adapters.
  - DB migrations: not expected for this phase; if a migration becomes necessary, verify with `supabase db reset` and document rollback.
- Frontend rule: this UI-bearing phase invoked the `frontend-design` skill before UI implementation.
- Git boundary: Phase 6 was committed and pushed after explicit approval. For Phase 7, keep a focused checkpoint and exclude unrelated local dirty files unless the user asks otherwise.

## 1. Current project state

The following work is already complete:

- Phase 1 verified the Supabase-first routed baseline and app shell.
- Phase 2 added profile completeness fields, onboarding completion, pay frequency, and variable spending.
- Phase 3 aligned the deterministic financial rules engine to PRD Section 19.
- Phase 4 completed manual purchase checking and persisted check history.
- Phase 5 enabled savings goal creation, deletion, and purchase-to-goal conversion.
- Phase 6 completed cooldown recheck and cooldown-to-goal conversion, including hosted beta migration `20260623003000_cooldown_recheck_baseline.sql`.

Do not redo, replace, or redesign completed work.

Before changing code:

1. inspect the current diff;
2. inspect existing action, hook, mapper, navigation, and route conventions;
3. preserve P1-P6 behavior;
4. verify this goal still matches repository reality.

## 2. Objective

Implement edit-later management for expenses, debts, and account settings so onboarded users can manage the financial values that currently exist only in onboarding.

This milestone owns:

- Authenticated expense create, update, and delete actions plus `/expenses`.
- Authenticated debt create, update, and delete actions plus `/debts`.
- `/settings` profile editing for existing profile fields, plus a delete-financial-data control.
- Hook and page-adapter wiring so the routed app uses the same Supabase workspace refresh path as earlier phases.
- Navigation updates from placeholder links to the new routes.

This milestone does not include:

- Dashboard metric/card redesign from Phase 8.
- Weekly report generation improvements from Phase 9.
- LiteRT advisor integration from Phase 10.
- Privacy/disclaimer/transcript deletion work from Phase 11, except the Phase 7 delete-financial-data control.
- Broad E2E suite hardening from Phase 12.
- Supabase Auth account deletion, bank links, receipt OCR, transaction tracking, CSV import, or investment advice.

## 3. Required behavior

The implementation must:

1. expose `/expenses` where users can create, edit, and delete expenses with label, amount, due day, and recurring status;
2. expose `/debts` where users can create, edit, and delete debts with label, outstanding balance, minimum payment, due day, and optional interest rate;
3. expose `/settings` where users can edit currency, full name, monthly income, current savings, emergency fund target, pay frequency, and estimated variable expenses;
4. persist writes through server actions that derive `user_id` from Supabase Auth and scope updates/deletes by both `id` and `user_id`;
5. refresh the `useFinancialState` workspace after successful writes so downstream deterministic calculations consume fresh expense/debt/profile values;
6. keep debt due dates in the same `snapshot.debts` path used by Phase 3 30-day debt calculations;
7. return user-facing validation/action errors without swallowing server errors silently;
8. provide a delete-financial-data control that removes app financial rows for the current user and leaves the Supabase Auth login account intact.

## 4. Architectural invariants

The implementation must preserve:

1. The deterministic rules engine (`src/lib/calculations/**`) remains the single source of financial decisions; the LLM advisor only explains, never decides.
2. Existing Zod schemas and Supabase mappers are reused rather than copied.
3. Server actions check the authenticated user and derive `user_id` from Supabase Auth; never trust a client-supplied id.
4. Existing public APIs and server-action signatures stay backward-compatible unless explicitly approved.
5. New orchestration stays thin; business rules stay in the calculation/service layer.
6. Work from completed phases is not redesigned.

Stop and report if satisfying the goal would require violating one of these invariants.

## 5. Important behavioral definitions

### Delete financial data

For Phase 7, "delete-my-data" means deleting app financial data rows owned by the current authenticated user from SpendGuard tables. It does not delete the Supabase Auth user account, rotate credentials, delete hosted project metadata, or modify other users' data.

It may:

- delete profile, expenses, debts, goals, purchase checks, cooldown items, weekly reports, and voice sessions for the current user;
- return the app to an empty/onboarding state on the next workspace load.

It must not:

- use a service-role key in client code;
- delete the Auth account;
- delete or mutate rows without a current authenticated `user_id`.

## 6. Existing implementation to inspect

Before editing, inspect:

- `src/features/financial-profile/api/save-financial-profile.ts`
- `src/features/goals/api/create-goal.ts`
- `src/features/financial-profile/api/load-financial-workspace.ts`
- `src/lib/schemas/finance.ts`
- `src/lib/supabase/finance-mappers.ts`
- `src/hooks/use-financial-state.ts`
- `src/app/(app)/_components/page-adapters.tsx`
- `src/components/layout/app-navigation.tsx`
- existing feature panels and tests under `src/features/goals`, `src/features/onboarding`, and `src/features/cooldown`

Document current conventions in `STATUS.md` before implementing.

## 7. Allowed files

Prefer limiting changes to:

- `src/features/expenses/**`
- `src/features/debts/**`
- `src/features/settings/**`
- `src/hooks/use-financial-state.ts` and focused tests
- `src/app/(app)/expenses/page.tsx`
- `src/app/(app)/debts/page.tsx`
- `src/app/(app)/settings/page.tsx`
- `src/app/(app)/_components/page-adapters.tsx` and focused tests
- `src/components/layout/app-navigation.tsx` and focused tests if they exist
- `src/features/auth/api/auth-routing.test.ts` if route expectations require updating
- `src/types/finance.ts`, `src/types/database.ts`, or `src/lib/schemas/finance.ts` only when required by the new action contracts
- `tasks/mvp-completion/CURRENT_GOAL.md`
- `tasks/mvp-completion/STATUS.md`
- `tasks/mvp-completion/REPORT_DRAFT.md`
- `tasks/mvp-completion/ROADMAP.md` when marking Phase 7 complete

An additional file may be modified only when necessary, documented in `STATUS.md`, and still inside Phase 7 scope.

## 8. Forbidden files and scope

Do not modify:

- `src/lib/calculations/**` unless a verified bug blocks Phase 7;
- Phase 8 dashboard metric/card behavior;
- Phase 9 report insight generation;
- Phase 10 LiteRT advisor implementation;
- Phase 11 disclaimer/privacy/transcript work beyond delete-financial-data;
- broad `e2e/spendguard.spec.ts` hardening, except an optional targeted smoke if needed;
- production/environment configuration;
- unrelated migrations or unrelated UI/API files.

Do not weaken or remove tests, bypass validation/RLS, introduce a competing persistence path, begin the next phase, or stage unrelated dirty files.

## 9. Preferred implementation shape

Preferred public seam:

```text
src/features/expenses/api/manage-expense.ts
  createExpenseAction(input)
  updateExpenseAction(id, input)
  deleteExpenseAction(id)

src/features/debts/api/manage-debt.ts
  createDebtAction(input)
  updateDebtAction(id, input)
  deleteDebtAction(id)

src/features/settings/api/manage-settings.ts
  updateProfileSettingsAction(input)
  deleteFinancialDataAction()

useFinancialState()
  createExpense / updateExpense / deleteExpense
  createDebt / updateDebt / deleteDebt
  updateProfileSettings / deleteFinancialData

ExpensesPanel / DebtsPanel / SettingsPanel
```

Follow existing repository conventions if the inspected code shows a better compatible shape.

## 10. Required tests

At minimum, test:

1. expense create, update, delete action success paths;
2. debt create, update, delete action success paths;
3. invalid expense/debt/settings input returns validation errors;
4. updates/deletes include authenticated `user_id` scoping;
5. delete-financial-data deletes only current-user app rows;
6. hook methods call the server actions and refresh on success;
7. public panels render existing rows and call create/update/delete handlers;
8. settings panel updates profile fields and confirms delete-financial-data;
9. page adapters pass snapshot data and callbacks to the new panels;
10. navigation points to `/expenses`, `/debts`, and `/settings`;
11. existing P5/P6 goal and cooldown behavior remains unchanged via focused regression or full suite.

At least one test or smoke check must exercise:

```text
new route adapter/panel -> useFinancialState callback -> server-action-shaped result -> refreshed snapshot path
```

## 11. Verification commands

Focused verification:

```bash
npm test -- src/features/expenses src/features/debts src/features/settings
npm test -- src/hooks/use-financial-state.test.tsx
npm test -- "src/app/(app)/_components/page-adapters.test.tsx"
```

Public-path or integration verification:

```bash
npm test -- src/features/expenses/components/expenses-panel.test.tsx src/features/debts/components/debts-panel.test.tsx src/features/settings/components/settings-panel.test.tsx
```

Relevant regressions:

```bash
npm test
npm run typecheck
npm run lint
npm run test:coverage
npm run build
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
| `/expenses` supports create, edit, and delete through authenticated actions | component/action/hook tests | NOT VERIFIED |
| `/debts` supports create, edit, and delete through authenticated actions | component/action/hook tests | NOT VERIFIED |
| `/settings` supports profile edits | component/action/hook tests | NOT VERIFIED |
| Delete-financial-data removes app rows for current user only | settings action tests | NOT VERIFIED |
| Debt due dates remain in `snapshot.debts` for deterministic calculations | mapper/hook/component tests | NOT VERIFIED |
| Existing P1-P6 behavior unchanged | focused regressions and full suite | NOT VERIFIED |
| Public path works | route adapter/component tests and optional Playwright smoke | NOT VERIFIED |
| No forbidden files changed | `git diff --name-only` | NOT VERIFIED |
| Diff is structurally valid | `git diff --check` | NOT VERIFIED |

Allowed statuses: `VERIFIED`, `PARTIALLY VERIFIED`, `NOT VERIFIED`, `BLOCKED`.

## 13. Execution workflow

Before implementation: inspect repository state and current diff; determine current conventions; update `STATUS.md` findings; confirm the smallest coherent design.

During implementation: add or update focused tests first where practical, implement one CRUD surface at a time, run focused tests after each coherent behavior, and update `STATUS.md`.

Before finishing: run the public-path check, regressions, coverage, build, diff/scope checks, and a no-edit independent review. Update the claim-to-evidence matrix and report.

## 14. Retry and stop conditions

Make no more than three materially different repair attempts for the same failure. Stop immediately when a product decision is required, a forbidden file appears necessary, a destructive migration is required, production credentials are required, or an architectural invariant would be violated.

## 15. Definition of Done

This milestone is complete only when every required behavior is implemented, architectural invariants are preserved, focused tests pass, the actual public path is exercised, relevant regressions/lint/coverage/build pass, no forbidden files changed, `git diff --check` passes, all claims have evidence, `STATUS.md` is current, Phase 7 is archived, and Phase 8 has not started.
