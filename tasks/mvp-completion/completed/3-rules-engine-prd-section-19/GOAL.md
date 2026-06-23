# Current Goal: 3 — Rules Engine PRD Section 19

## Goal metadata

- Feature: `mvp-completion`
- Phase: `3`
- Status: `IN PROGRESS`
- Source plan: `tasks/mvp-completion/ROADMAP.md`
- Authoritative PRD source: `/Users/askiajamesmanjares/.claude/paste-cache/a6d8acfce2f042b2.txt`
- Previous phase report: `tasks/mvp-completion/completed/2-profile-schema-completeness/REPORT.md`

## 0. Repository harness

- Stack: Next.js 16.2.9 (App Router) + React 19.2 + TypeScript strict + Supabase + Tailwind 4. Vitest + RTL; Playwright e2e for UI phases.
- This phase is pure calculation logic. It does not write Next-specific code.
- Commands:
  - `npm test -- src/lib/calculations`
  - `npm test -- src/hooks/use-financial-state.test.tsx src/lib/supabase/finance-mappers.test.ts src/lib/advisor/fallback-advisor.test.ts`
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
  - `npm run test:coverage`
  - `npm run build`
  - `git diff --check`
- Git boundary: no commit, push, merge, rebase, or deploy. Capture the finished phase as a patch under `tasks/mvp-completion/completed/3-rules-engine-prd-section-19/`.

## 1. Current project state

Completed prior phases:

- Phase 1 established the merged routed UI + Supabase baseline and archived it under `completed/1-integration-baseline/`.
- Phase 2 added profile completeness fields (`full_name`, `pay_frequency`, `estimated_variable_expenses`, `onboarding_completed`), onboarding capture, auth onboarding gating, tests, migration, and checkpoint patch under `completed/2-profile-schema-completeness/`.

Do not redo or redesign those completed phases.

## 2. Objective

Implement the PRD Section 19 deterministic financial rules engine as pure TypeScript modules.

This milestone owns:

- PRD §19.1 safe-to-spend.
- PRD §19.2 monthly free cash flow.
- PRD §19.3 emergency fund progress.
- PRD §19.4 additive purchase risk score and decision thresholds.
- PRD §19.5 cooldown price tiers.
- PRD §19.6 health score.
- Snapshot-level wrapper helpers that preserve existing public callers while using the PRD formulas.

This milestone does not include:

- Manual purchase checker UI field expansion from Phase 4.
- Goal planner UI from Phase 5.
- Cooldown recheck/convert-to-goal UI from Phase 6.
- Settings, expenses, debts management from Phase 7.
- LiteRT advisor integration from Phase 10.

## 3. Required behavior

The implementation must:

1. Split calculation ownership into `cashflow`, `emergency-fund`, `debt-pressure`, `purchase-decision`, `goal-impact`, `health-score`, and `cooldown` modules.
2. Keep existing imports from `src/lib/calculations/purchase-decision` working through compatibility exports.
3. Calculate safe-to-spend as `currentSavings - emergencyBuffer - upcomingBills30Days - upcomingDebt30Days - reservedGoalAmount`, floored at zero.
4. Calculate monthly free cash flow as monthly income minus fixed expenses, estimated variable expenses, and minimum debt payments.
5. Calculate emergency fund progress as an integer percentage from 0 to 100, returning 0 when target is not positive.
6. Evaluate purchases with the PRD §19.4 additive risk score and exact thresholds: `>=75 NOT_RECOMMENDED`, `>=50 WAIT`, `>=30 BUY_WITH_CAUTION`, otherwise `SAFE_TO_BUY`.
7. Include down payment in savings-after-purchase for non-cash purchases.
8. Include installment pressure adjustments at 15% and 30% of free cash flow.
9. Include want, working-alternative, and income-generating adjustments.
10. Calculate cooldown days by PRD price tiers: `<2000 → 1`, `<10000 → 3`, `<50000 → 7`, otherwise `30`.
11. Calculate health score with §19.6 weights: emergency 30%, debt pressure 25%, cash flow 20%, goal progress 15%, purchase discipline 10%.
12. Preserve the invariant that the LLM advisor only explains deterministic outputs.

## 4. Architectural invariants

The implementation must preserve:

1. The deterministic rules engine remains the single source of financial decisions.
2. Existing server actions and mappers keep deriving user data from authenticated Supabase state.
3. Existing public APIs stay backward-compatible unless the phase explicitly updates tests and call sites.
4. Business rules stay in `src/lib/calculations/**`.
5. Phase 2 schema/onboarding/auth work remains intact.

Stop and report if satisfying this goal would require inventing product behavior not present in PRD §19 or the existing data model.

## 5. Important behavioral definitions

### Emergency buffer from a snapshot

PRD §19.1 accepts `emergencyBuffer` as an input and the PRD example says ₱24,000 savings with a ₱100,000 emergency target leaves ₱20,000 protected and ₱4,000 safe to spend. Snapshot-level wrappers therefore derive emergency buffer as `min(currentSavings, emergencyFundTarget * 0.2)`.

### Upcoming 30-day obligations from current schema

The current schema stores monthly recurring expense/debt due days, not dated schedules. Until Phase 7 adds richer editing/due-date behavior, snapshot wrappers treat recurring expenses and debt minimum payments as upcoming within 30 days.

### Purchase fields not yet collected by the UI

Phase 4 will collect category, sale deadline, notes, down payment, income-generating status, and working-alternative status. Phase 3 must expose pure engine inputs for those fields now while defaulting current `PurchaseInput` wrappers safely: no down payment unless supplied, `isIncomeGenerating=false`, and `currentAlternativeStillWorks=false`.

## 6. Existing implementation to inspect

- `src/lib/calculations/purchase-decision.ts`
- `src/lib/calculations/purchase-decision.test.ts`
- `src/types/finance.ts`
- `src/hooks/use-financial-state.ts`
- `src/lib/supabase/finance-mappers.ts`
- `src/lib/advisor/fallback-advisor.ts`
- `tasks/mvp-completion/completed/2-profile-schema-completeness/REPORT.md`

## 7. Allowed files

Prefer limiting changes to:

- `src/lib/calculations/**`
- `src/types/finance.ts`
- calculation-focused tests
- existing tests that assert calculation outputs through public wrappers
- `tasks/mvp-completion/STATUS.md`
- `tasks/mvp-completion/ROADMAP.md`

Additional files may be modified only when required to keep compile/tests green with the new calculation contracts.

## 8. Forbidden files and scope

Do not modify:

- Supabase migrations or database schema.
- Auth/onboarding/profile persistence from Phase 2 except if a compile break is caused by type changes.
- UI screens for checker, goals, cooldown, dashboard, reports, or settings.
- Production/environment configuration.

Do not begin any next phase or add dependencies.

## 9. Preferred implementation shape

Preferred module surface:

```text
src/lib/calculations/cashflow.ts
src/lib/calculations/emergency-fund.ts
src/lib/calculations/debt-pressure.ts
src/lib/calculations/goal-impact.ts
src/lib/calculations/cooldown.ts
src/lib/calculations/health-score.ts
src/lib/calculations/purchase-decision.ts
```

Keep `purchase-decision.ts` as the compatibility entry point for existing imports.

## 10. Required tests

At minimum, test:

1. PRD formula modules with raw input objects.
2. Snapshot wrappers using Phase 2 `estimatedVariableExpenses`.
3. Exact purchase threshold ties at 75, 50, and 30.
4. Down payment savings-after behavior.
5. Installment pressure at 15% and 30%.
6. Want, working-alternative, and income-generating adjustments.
7. Cooldown tier boundaries at 2000, 10000, and 50000.
8. Health-score weighting and status boundaries.
9. Existing public entry points that consume calculation outputs.

## 11. Claim-to-evidence matrix

| Completion claim | Evidence | Status |
| --- | --- | --- |
| PRD §19 modules implemented | `npm test -- src/lib/calculations` | NOT VERIFIED |
| Compatibility entry point preserved | existing caller tests + typecheck | NOT VERIFIED |
| Public calculation consumers still work | focused hook/mapper/advisor tests | NOT VERIFIED |
| Regression suite passes | `npm test` | NOT VERIFIED |
| Coverage stays above 80% | `npm run test:coverage` | NOT VERIFIED |
| Scope is limited | `git diff --name-only` | NOT VERIFIED |
