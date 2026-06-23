# Current Goal: 5 — Goal planner completion

## Goal metadata

- Feature: `mvp-completion`
- Phase: `5`
- Status: `READY TO START`
- Source plan: `tasks/mvp-completion/ROADMAP.md`
- Previous phase report: `tasks/mvp-completion/completed/4-manual-purchase-checker-completeness/REPORT.md`

## 0. Repository harness (SpendGuard)

- Stack: Next.js 16 (App Router) + React 19 + TypeScript (strict) + Supabase (Auth + Postgres + RLS) + Tailwind. Tests: Vitest (jsdom) + React Testing Library; Playwright e2e.
- READ FIRST: `AGENTS.md` warns "This is NOT the Next.js you know." Relevant local docs inspected before this phase: `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`, `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`, and `node_modules/next/dist/docs/01-app/02-guides/forms.md`.
- UI phase rule: `frontend-design` was invoked before implementation. Keep the current operational app-shell direction: dense finance controls, low-drama visual hierarchy, accessible icon-backed actions, no marketing layout.
- Exact commands, run from the code root:
    - Focused tests: `npm test -- src/features/goals/components/goals-panel.test.tsx src/features/goals/api/create-goal.test.ts src/hooks/use-financial-state.test.tsx src/app/'(app)'/_components/page-adapters.test.tsx src/features/purchase-checker/components/purchase-result.test.tsx`
    - Typecheck: `npm run typecheck`
    - Lint: `npm run lint`
    - Full unit/component suite: `npm test`
    - Coverage: `npm run test:coverage`
    - Build: `npm run build`
    - Remote migration apply, if needed and explicitly approved: `supabase db push`
    - Scope checks: `git diff --check`, `git diff --stat`, `git diff --name-only`, `git status --short`
- Git boundary: never commit, push, merge, rebase, or deploy. Capture this phase as `tasks/mvp-completion/completed/5-goal-planner-completion/5-goal-planner-completion.patch` after verification.
- Remote Supabase boundary: use Supabase remote only for DB verification. Do not run local Supabase verification.

## 1. Current project state

The following work is already complete:

- Phase 1 verified the merged redesign + Supabase baseline.
- Phase 2 added profile completeness, including `pay_frequency`.
- Phase 3 implemented the deterministic PRD Section 19 rules engine and goal-delay calculation.
- Phase 4 completed manual purchase-check metadata/result/status persistence and archived a validated checkpoint patch.

Do not redo or redesign completed work.

Current findings before implementation:

- `GoalsPanel` disables `New Goal` and says goal creation is coming soon.
- `createGoalAction` and `deleteGoalAction` exist, but `createGoalAction` has no direct focused test and no direct UI/hook seam from `/goals`.
- `useFinancialState.addGoalFromCheck` creates a basic six-month goal from a purchase check, but Phase 5 owns making convert-to-goal evidence end to end and exposing planner math.
- Goal cards show target/date/progress but not needed monthly contribution, per-payday contribution from `profile.payFrequency`, or realistic/not-realistic flag.
- Existing goal table shape can support this phase without schema changes unless a verified gap appears.

## 2. Objective

Implement:

> Complete the savings goal planner so users can create goals, see realistic funding guidance using pay frequency, and convert a purchase check into a goal end to end.

This milestone owns:

- Goal creation UI on `/goals`.
- Direct hook/page-adapter seam for creating a goal.
- Per-goal planner math: remaining amount, needed monthly contribution, per-payday contribution using `pay_frequency`, estimated completion date, and realistic/not-realistic flag.
- Convert-purchase-to-goal behavior from the purchase result's Add to Goal action.
- Tests and public-path verification for goal creation and conversion.

This milestone does not include:

- Cooldown recheck or cooldown convert-to-goal completion (Phase 6).
- Expenses/debts/settings management routes (Phase 7).
- Dashboard completeness, weekly report, LiteRT advisor, privacy, or full E2E hardening.
- New database tables or non-additive schema changes unless a verified blocker appears.

## 3. Required behavior

The implementation must:

1. enable a `New Goal` flow on `/goals` with label, target amount, saved amount, priority, and optional target date;
2. validate goal input in UI and server action without trusting client data;
3. persist created goals through `createGoalAction`, deriving `user_id` from Supabase Auth;
4. show estimated completion and needed contribution guidance for each goal;
5. compute per-payday contribution from `profile.payFrequency`;
6. show a realistic/not-realistic indicator based on the user's monthly free cash flow after existing obligations;
7. preserve delete-goal behavior and existing goal display;
8. keep purchase-result Add to Goal as the convert-purchase-to-goal path and verify it creates a persisted goal;
9. surface retryable errors for failed create/delete/convert actions;
10. avoid starting Phase 6 cooldown conversion/recheck work.

## 4. Architectural invariants

The implementation must preserve:

1. The deterministic rules engine (`src/lib/calculations/**`) remains the single source of financial decisions; the LLM advisor only explains, never decides.
2. Goal planner math may be deterministic helper logic, but it must not override purchase decisions.
3. Existing Zod schemas, server-action auth, and Supabase mapper seams are reused rather than duplicated.
4. Server actions derive `user_id` from Supabase Auth and never accept a client-supplied owner.
5. New UI stays under the existing feature/app adapter boundaries.
6. Work from completed phases is not redesigned.

Stop and report if satisfying this goal would require weakening one of these invariants.

## 5. Important behavioral definitions

### Realistic goal

For this phase, a goal is realistic when its needed monthly contribution is greater than zero and does not exceed the currently available monthly free cash flow after committed expenses, debt payments, estimated variable expenses, and current goal funding.

This is guidance only. It must not block saving a goal; it should warn the user when the plan is tight.

### Per-payday contribution

Use `profile.payFrequency` from Phase 2:

- `monthly`: 1 pay period per month
- `semi_monthly`: 2 pay periods per month
- `biweekly`: 26 / 12 pay periods per month
- `weekly`: 52 / 12 pay periods per month

## 6. Existing implementation to inspect

Before editing, inspect:

- `src/features/goals/components/goals-panel.tsx`
- `src/features/goals/components/goals-panel.test.tsx`
- `src/features/goals/api/create-goal.ts`
- `src/hooks/use-financial-state.ts`
- `src/app/(app)/_components/page-adapters.tsx`
- `src/features/purchase-checker/components/purchase-result.tsx`
- `src/lib/schemas/finance.ts`
- `src/types/finance.ts`
- `src/types/database.ts`
- matching tests

## 7. Allowed files

Prefer limiting changes to:

- `src/features/goals/components/goals-panel.tsx`
- `src/features/goals/components/goals-panel.test.tsx`
- `src/features/goals/api/create-goal.ts`
- `src/features/goals/api/create-goal.test.ts`
- `src/hooks/use-financial-state.ts`
- `src/hooks/use-financial-state.test.tsx`
- `src/app/(app)/_components/page-adapters.tsx`
- `src/app/(app)/_components/page-adapters.test.tsx`
- `src/features/purchase-checker/components/purchase-result.tsx`
- `src/features/purchase-checker/components/purchase-result.test.tsx`
- `src/lib/schemas/finance.ts`
- `src/lib/schemas/finance.test.ts`
- `src/types/finance.ts`
- `tasks/mvp-completion/STATUS.md`
- this goal/report/archive files

An additional file may be modified only when necessary and documented in `STATUS.md`.

## 8. Forbidden files and scope

Do not modify:

- completed phase archives except to read them;
- cooldown recheck / cooldown convert-to-goal behavior;
- expenses/debts/settings routes;
- dashboard/report/advisor/privacy screens;
- production / environment configuration.

Do not begin the next phase, introduce a competing rules engine, weaken tests, bypass validation or RLS, commit, push, merge, rebase, deploy, or modify production data.

## 9. Preferred implementation shape

Preferred public seam:

```text
GoalsPageContent
  -> useFinancialState.createGoal/deleteGoal
  -> GoalsPanel form + cards
  -> createGoalAction/deleteGoalAction
  -> Supabase goals rows

PurchaseResult Add to Goal
  -> useFinancialState.addGoalFromCheck
  -> createGoalAction
  -> refresh
  -> /goals displays converted purchase goal
```

Keep planner math in small pure helper functions inside the goals feature unless it becomes shared by another phase.

## 10. Required tests

At minimum, test:

1. `GoalsPanel` enables goal creation and submits a valid goal payload;
2. invalid goal input is blocked with accessible errors;
3. per-payday contribution labels for pay frequencies;
4. realistic and not-realistic goal guidance;
5. create-action validation and authenticated insert payload;
6. create-action failure/error behavior;
7. `useFinancialState.createGoal` refreshes and surfaces failures;
8. `/goals` page adapter passes create/delete callbacks;
9. purchase-result Add to Goal conversion calls the hook and can be verified end to end through the existing action seam;
10. existing delete behavior remains covered.

At least one test or documented smoke must exercise:

```text
/goals public component path
→ hook/server-action seam
→ persisted goal or create callback
→ rendered goal guidance
```

## 11. Verification commands

Focused verification:

```bash
npm test -- src/features/goals/components/goals-panel.test.tsx src/features/goals/api/create-goal.test.ts src/hooks/use-financial-state.test.tsx src/app/'(app)'/_components/page-adapters.test.tsx src/features/purchase-checker/components/purchase-result.test.tsx
npm run typecheck
```

Public-path or integration verification:

```bash
npm test -- src/features/goals/components/goals-panel.test.tsx src/app/'(app)'/_components/page-adapters.test.tsx src/features/purchase-checker/components/purchase-result.test.tsx
```

Relevant regressions:

```bash
npm test
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
| Goal creation UI works | component/public-path tests | NOT VERIFIED |
| Goal persistence uses authenticated action | action + hook tests | NOT VERIFIED |
| Per-payday and realism guidance works | goal component tests | NOT VERIFIED |
| Purchase check converts to goal | result/hook tests | NOT VERIFIED |
| Existing delete behavior unchanged | goal component/action tests | NOT VERIFIED |
| Existing behavior unchanged | focused suite + full suite + lint/typecheck/build/coverage | NOT VERIFIED |
| No forbidden files changed | `git diff --name-only` | NOT VERIFIED |
| Diff is structurally valid | `git diff --check` | NOT VERIFIED |

Allowed statuses: `VERIFIED`, `PARTIALLY VERIFIED`, `NOT VERIFIED`, `BLOCKED`.

## 13. Execution workflow

Before implementation: update `STATUS.md` with inspection findings; write failing focused tests for the missing goal creation/planner behavior; implement the smallest changes; run focused verification after each coherent behavior.

Before finishing: run public-path checks, relevant regressions, lint, coverage, build, diff checks, and a no-edit independent review pass.

## 14. Retry and stop conditions

Make no more than three materially different repair attempts for the same failure. Stop immediately when a product decision is required, a public contract must change non-additively, a destructive migration is required, a forbidden file appears necessary, production access is required, or an architectural invariant would be violated.
