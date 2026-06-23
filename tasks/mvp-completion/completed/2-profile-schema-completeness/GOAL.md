# Current Goal: 2 — Profile & schema completeness

## Goal metadata

- Feature: `mvp-completion`
- Phase: `2`
- Status: `READY TO START`
- Source plan: `tasks/mvp-completion/ROADMAP.md` (PRD §11.1, §22.1)
- Previous phase report: `tasks/mvp-completion/completed/1-integration-baseline/REPORT.md`

## 0. Repository harness (SpendGuard)

- Next.js 16.2.9 (App Router, Turbopack) + React 19.2 + TS strict + Supabase + Tailwind 4. Vitest + RTL; Playwright e2e (credential-gated).
- Commands: `npm run typecheck` · `npm run lint` · `npm test` · `npm run test:coverage` · `npm run build`. Migrations under `supabase/migrations/`, verify via `supabase db reset` (local stack; may be env-blocked like e2e).
- Git boundary (HARD): no commit/push/merge. Capture as patch in `completed/2-profile-schema-completeness/`.

## 1. Current project state

- `profiles` has: currency, monthly_income, current_savings, emergency_fund_target (+ id/user_id/timestamps). Missing PRD §22.1: `full_name`, `pay_frequency`, `estimated_variable_expenses`, `onboarding_completed`.
- `financialProfileSchema` (Zod) + `FinancialProfile` (client) carry only the 4 existing money/currency fields.
- Onboarding wizard (`onboarding-setup.tsx`) collects income/currency, savings, 3 fixed expenses, 1 debt, 4 goal toggles — never pay frequency or variable spending.
- `saveFinancialProfileAction` upserts the profile (full replace of expenses/debts/goals) but sets no onboarding flag.
- `getAuthRedirect(pathname, isAuthenticated)` (pure) only gates auth; no onboarding routing. Wired in `src/proxy.ts` (Next 16 middleware).

## 2. Objective

> Add the four PRD §22.1 profile columns, collect pay frequency + estimated variable spending (and optional full name) in onboarding, persist them, mark `onboarding_completed` on save, and route users by onboarding state.

This milestone owns:

- Additive `profiles` migration (`full_name`, `pay_frequency`, `estimated_variable_expenses`, `onboarding_completed`) + documented rollback + backfill (existing rows → completed).
- `FinancialProfile` type + `financialProfileSchema` Zod + `database.ts` types extended.
- Onboarding wizard collects `payFrequency` (select) + `estimatedVariableExpenses` (number) + optional `fullName`; review step shows them.
- `saveFinancialProfileAction` persists the new fields and sets `onboarding_completed: true`.
- `finance-mappers` + `emptySnapshot` carry the new fields.
- `getAuthRedirect` gains an `onboardingCompleted` argument; `proxy.ts` supplies it (DB read of `onboarding_completed`). Onboarded users on `/onboarding` → `/`; authenticated-but-not-onboarded users → `/onboarding`.

This milestone does not include:

- Using the new fields in the engine math (P3 owns §19 cash-flow/free-cash-flow).
- Wiring `full_name` into the dashboard greeting or variable expenses into dashboard cards (P8).
- Expenses/debts/settings edit routes (P7).

## 3. Required behavior

1. Migration adds the 4 columns additively (NOT NULL + default for the three non-null ones; `full_name` nullable), backfills existing rows `onboarding_completed = true`, and has a documented reversible rollback.
2. Onboarding collects pay frequency (enum: monthly/semi_monthly/biweekly/weekly, default monthly) and estimated variable expenses (≥0, default 0), plus optional full name; values survive Back/Continue and appear on Review.
3. `saveFinancialProfileAction` validates + persists the new profile fields and sets `onboarding_completed = true`.
4. `finance-mappers` maps the new columns into `FinancialProfile`; empty/legacy rows fall back to safe defaults.
5. `getAuthRedirect(pathname, isAuthenticated, onboardingCompleted)`: not-onboarded authenticated users are routed to `/onboarding` (except `/onboarding` and `/auth/*`); onboarded users on `/login`/`/signup`/`/onboarding` → `/`; unauth rules unchanged.
6. Determinism + existing behavior: existing onboarding payload assertions still hold (new fields are additive); no RLS/auth weakening; `user_id` still server-derived.

## 4. Architectural invariants

1. Deterministic engine untouched (P3 owns §19).
2. Reuse `financialProfileSchema`, the upsert, and `getAuthRedirect` — extend, don't duplicate.
3. `user_id` from Supabase Auth; RLS row policies cover new columns (no policy change needed).
4. `getAuthRedirect` stays a pure function (unit-tested); the DB read lives in `proxy.ts`.
5. Snapshot stays financial — `onboarding_completed` is server-side routing state, not part of `FinancialProfile`.
6. Migration additive + reversible; never edit applied migrations.

## 5. Important behavioral definitions

### Onboarding routing (`getAuthRedirect`)

`onboardingCompleted` defaults to `false`. Order:
1. not authenticated → `isPublicPath ? null : "/login"`.
2. authenticated && !onboardingCompleted → `"/onboarding"` unless pathname is `/onboarding` or `/auth/*` (→ null).
3. authenticated && onboardingCompleted && pathname ∈ {`/login`,`/signup`,`/onboarding`} → `"/"`.
4. else null.

Must not: force `/auth/*` callbacks to onboarding; loop (a not-onboarded user on `/onboarding` stays).

## 6. Existing implementation to inspect

`src/lib/schemas/finance.ts`, `src/types/{finance,database}.ts`, `src/lib/storage/default-data.ts`, `src/lib/supabase/finance-mappers.ts`, `src/features/financial-profile/api/save-financial-profile.ts`, `src/features/onboarding/components/onboarding-setup.tsx`, `src/features/auth/api/auth-routing.ts`, `src/proxy.ts`, `src/test/fixtures/financial-snapshot.ts`, and the matching `*.test.*`.

## 7. Allowed files

- `supabase/migrations/20260623000000_profile_completeness.sql` (new)
- `src/lib/schemas/finance.ts`, `src/types/finance.ts`, `src/types/database.ts`
- `src/lib/storage/default-data.ts`, `src/lib/supabase/finance-mappers.ts(+test)`
- `src/features/financial-profile/api/save-financial-profile.ts(+test)`
- `src/features/onboarding/components/onboarding-setup.tsx(+test)`
- `src/features/auth/api/auth-routing.ts(+test)`, `src/proxy.ts`
- `src/test/fixtures/financial-snapshot.ts`
- `tasks/mvp-completion/{CURRENT_GOAL,STATUS}.md`

## 8. Forbidden files and scope

- `src/lib/calculations/**` (P3), dashboard components (P8), expenses/debts/settings routes (P7).
- Applied migrations (`20260620*`). Production/env config.

Do not: start P3+; weaken tests/RLS; change engine math; commit/push/merge.

## 9. Preferred implementation shape

```text
PayFrequency = "monthly" | "semi_monthly" | "biweekly" | "weekly"
FinancialProfile += { fullName?: string; payFrequency?: PayFrequency; estimatedVariableExpenses?: number }
financialProfileSchema += { fullName?, payFrequency=default monthly, estimatedVariableExpenses=default 0 }
saveFinancialProfileAction upsert += full_name, pay_frequency, estimated_variable_expenses, onboarding_completed:true
getAuthRedirect(pathname, isAuthenticated, onboardingCompleted=false)
```

New fields OPTIONAL on `FinancialProfile` (populated everywhere real); avoids forced edits to P3-owned engine tests.

## 10. Required tests

1. `getAuthRedirect`: not-onboarded → `/onboarding`; onboarded on `/onboarding` → `/`; `/onboarding` + not-onboarded → null; `/auth/confirm` not forced; unauth rules preserved.
2. Zod: `financialProfileSchema` parses pay frequency + variable expenses (defaults applied); rejects bad pay frequency / negative variable expenses.
3. Mapper: row with new columns → `FinancialProfile` carries them; legacy row (defaults) safe.
4. Save action: upsert payload includes the 4 new fields incl. `onboarding_completed: true` (mock Supabase).
5. Wizard: collects pay frequency + variable spending (+ name), survive Back, appear on Review, included in `onSave` payload; existing payload assertions still pass.
6. Public path: onboarding component render+submit (RTL) exercises wizard→onSave; save-action test exercises the persistence seam.

## 11. Verification commands

```bash
npm test -- src/features/auth/api/auth-routing.test.ts src/lib/supabase/finance-mappers.test.ts src/features/financial-profile/api/save-financial-profile.test.ts src/features/onboarding/components/onboarding-setup.test.tsx
npm run typecheck && npm run lint
npm test && npm run test:coverage && npm run build
git diff --check && git diff --name-only
# migration: supabase db reset (if local stack available; else documented BLOCKED + rollback)
```

## 12. Claim-to-evidence matrix

| Completion claim | Evidence | Status |
| --- | --- | --- |
| Migration additive + rollback + backfill | SQL review + `supabase db reset` | NOT VERIFIED |
| Onboarding collects pay freq + variable spend (+name) | `onboarding-setup.test.tsx` | NOT VERIFIED |
| Save sets onboarding_completed + new cols | `save-financial-profile.test.ts` | NOT VERIFIED |
| Mapper carries new fields | `finance-mappers.test.ts` | NOT VERIFIED |
| Onboarding routing gate | `auth-routing.test.ts` | NOT VERIFIED |
| Existing behavior unchanged | full `npm test` | NOT VERIFIED |
| Coverage ≥ 80% | `npm run test:coverage` | NOT VERIFIED |
| No forbidden files changed | `git diff --name-only` | NOT VERIFIED |

## 13. Execution workflow

TDD per unit: auth-routing → Zod → mapper → save action → wizard (frontend-design first). Type plumbing (types/default-data/fixture/database.ts) alongside. Migration last + verify.

## 14. Retry and stop conditions

≤3 attempts/failure. Stop if: migration would be destructive; a public contract must change incompatibly; engine math change required (→ that is P3).

## 15. Definition of Done

All required behaviors implemented; migration additive+reversible (applied if local stack, else BLOCKED+documented); focused + full tests green; wizard public path exercised; coverage ≥80%; no forbidden files; `git diff --check` clean; claims evidenced; P3 not started.

## 16. Final report

`tasks/mvp-completion/completed/2-profile-schema-completeness/REPORT.md`.

Do not commit, push, merge, rebase, deploy, or modify production data.
