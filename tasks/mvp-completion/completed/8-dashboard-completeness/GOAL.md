# Current Goal: Phase 8 — Dashboard completeness

## Goal metadata

- Feature: `mvp-completion`
- Phase: `8`
- Status: `READY TO START`
- Source plan: `tasks/mvp-completion/ROADMAP.md` (row 8; PRD §11.2, §27.2)
- Previous phase report: `tasks/mvp-completion/completed/7-expenses-debts-settings-management/REPORT.md`

## 0. Repository harness (SpendGuard)

- Stack: Next.js 16 (App Router) + React 19 + TypeScript (strict) + Supabase (Auth + Postgres + RLS) + Tailwind / shadcn. Tests: Vitest (jsdom) + React Testing Library; Playwright e2e.
- READ FIRST: `AGENTS.md` warns "This is NOT the Next.js you know." Read the relevant guide under `node_modules/next/dist/docs/` before writing Next-specific code.
- Commands (run in CODE ROOT): typecheck `npm run typecheck`; lint `npm run lint`; tests `npm test` / `npm test -- <path>`; coverage `npm run test:coverage`; e2e `npm run e2e`; build `npm run build`.
- Frontend rule: this is a UI-bearing phase — invoke the `frontend-design` skill before writing UI; verify the real component (Testing Library render; Playwright snapshot if env permits).
- Git boundary (HARD): never commit, push, merge, rebase, deploy. User runs all git. Capture the phase as a patch under `tasks/mvp-completion/completed/8-dashboard-completeness/8-dashboard-completeness.patch`.

## 1. Current project state

Already complete (do not redo, replace, or redesign):

- P1–P7 archived under `completed/`: integration baseline, profile/schema completeness (`pay_frequency`, `estimated_variable_expenses`, `onboarding_completed`, `full_name`), the §19 deterministic rules engine (`src/lib/calculations/**`), manual purchase checker, goal planner, cooldown, and expenses/debts/settings CRUD.
- Baseline verified green this session: `npm run typecheck`, `npm run lint`, `npm test` (43 files / 225 tests) all pass.
- Dashboard (`src/features/dashboard/components/dashboard-overview.tsx`) already renders LIVE KPI cards: Current Savings, Safe to Spend, Emergency Progress, Monthly Expenses, Debt Payments, Free Cash Flow; live Active Goals, Recent Checks, and a live `ScoreGauge` for the health score.
- `P7 changes remain uncommitted in the working tree` (git HEAD = P6 `edaa96b`). P8 touches a disjoint file set, so its checkpoint patch will be captured scoped to P8 files.

## 2. Objective

Implement:

> Close the four PRD §11.2 dashboard gaps: surface an upcoming-debt-within-30-days card, surface estimated variable expenses, render a Strong/Stable/Caution/Risky health-status banner, and replace the static advisor insight with a deterministic metrics-derived summary.

This milestone owns:

- A display-only, deterministic helper that derives each debt's next due date from `dueDay` and returns the debts due within 30 days (+ their total).
- A deterministic, rule-based dashboard advisor-insight generator (title + body) derived from the live metrics.
- The dashboard UI additions: upcoming-debt-30d card, estimated-variable-expenses card, health-status banner (reusing `getHealthStatus`), and wiring the advisor insight to the generator.

This milestone does not include:

- Any change to the §19 decision engine outputs (`purchase-decision.ts`, `cashflow.ts`, `debt-pressure.ts`, `emergency-fund.ts`, `health-score.ts`) — read-only reuse only.
- The weekly advisor **report page** and its history (P9), the LiteRT-LM advisor (P10), privacy/disclaimer surface (P11), or e2e hardening (P12).
- Any schema/migration change (the existing `Debt.dueDay` + `FinancialProfile.estimatedVariableExpenses` fields suffice).

## 3. Required behavior

1. The dashboard shows an "Upcoming Debt (30 days)" card listing debts whose next `dueDay` occurrence falls within 30 days of today, each with its next due date, plus the summed minimum payment due in that window; shows an empty/zero state when there are none.
2. The dashboard surfaces the profile's estimated variable expenses as its own card (defaulting to a 0/— display when the field is absent).
3. The dashboard renders a prominent health-status banner showing the label from `getHealthStatus(metrics.healthScore)` (Strong / Stable / Caution / Risky) with a tone matching the band.
4. The advisor-insight title and body are produced by a deterministic generator from the live metrics (no hardcoded `advisorInsight` string in the dashboard path), while the existing `monthlyFreeCashFlow` sentence is preserved or regenerated equivalently.
5. Determinism: the next-due-date and advisor-insight helpers are pure — same inputs (including an injected reference date) → same output. UI may pass `new Date()` only at the render boundary.
6. The engine's existing decision outputs are unchanged; `advisorInsight` stays exported for its other consumer (`goals-panel.tsx`).

## 4. Architectural invariants

1. The deterministic rules engine (`src/lib/calculations/**`) remains the single source of financial decisions; this phase adds display-only derivations and never alters a decision output. The upcoming-debt-30d helper is presentation-only and must not be wired into `calculateSafeToSpend`/`evaluatePurchase`.
2. Reuse existing helpers (`getHealthStatus`, `formatCurrency`, `Card`/`KpiCard`, `ProgressRing`) rather than copying.
3. No server-action or `user_id` handling is introduced (pure UI + pure helpers); RLS/auth untouched.
4. Public component contract `DashboardOverview({ snapshot, checks, metrics })` stays backward-compatible (no new required props; data already flows via `snapshot` + `metrics`).
5. New orchestration stays thin; the date math and advisor wording live in pure, tested modules.
6. Completed-phase work is not redesigned.

Stop and report if satisfying the goal would require changing an engine decision output, a schema/migration, or a P7/P9–P12 file.

## 5. Important behavioral definitions

### "Upcoming debt within 30 days" (display)

For each `Debt`, compute the next calendar occurrence of `dueDay` on or after the reference date (clamping `dueDay` to the month's last day for short months). A debt is "upcoming within 30 days" when `0 ≤ daysUntilDue ≤ 30`. The card lists those debts sorted ascending by `daysUntilDue` and sums their `minimumPayment`.

It must not:

- Feed this value back into the decision engine or change `safeToSpend`.
- Invent a due month/year field or a migration; only `dueDay` is used.

### "Advisor insight" (dashboard)

A short, deterministic, rule-based title + body chosen from the live metrics (health status band + free-cash-flow sign + emergency progress + debt presence). It explains the current state; it does not give speculative or invented financial advice, and no LLM is involved (that is P9/P10).

## 6. Existing implementation to inspect

- `src/features/dashboard/components/dashboard-overview.tsx` — the component to extend.
- `src/features/dashboard/components/dashboard-overview.test.tsx` — existing render tests to preserve/extend.
- `src/lib/calculations/health-score.ts` — `getHealthStatus`, `HealthStatus` (reuse).
- `src/types/finance.ts` — `Debt.dueDay`, `FinancialProfile.estimatedVariableExpenses` (read-only).
- `src/test/fixtures/financial-snapshot.ts` — fixture shape used by the component test.
- `src/features/reference-data.ts` — `advisorInsight` (leave intact; also used by `goals-panel.tsx`).

## 7. Allowed files

- `src/features/dashboard/components/dashboard-overview.tsx` (modify)
- `src/features/dashboard/components/dashboard-overview.test.tsx` (extend)
- `src/lib/calculations/upcoming-debt.ts` (new — pure display helper)
- `src/lib/calculations/upcoming-debt.test.ts` (new)
- `src/features/dashboard/lib/advisor-insight.ts` (new — pure generator)
- `src/features/dashboard/lib/advisor-insight.test.ts` (new)
- `tasks/mvp-completion/CURRENT_GOAL.md`, `tasks/mvp-completion/STATUS.md`

An additional file may be modified only when necessary, documented before editing, and within scope.

## 8. Forbidden files and scope

Do not modify:

- The §19 engine: `src/lib/calculations/{purchase-decision,cashflow,debt-pressure,emergency-fund,health-score,goal-impact}.ts`.
- `src/types/finance.ts`, `src/features/reference-data.ts`.
- P7 uncommitted files: `src/features/{debts,expenses,settings}/**`, `src/app/(app)/{debts,expenses,settings}/page.tsx`, `src/app/(app)/_components/page-adapters.tsx`, `src/hooks/use-financial-state.ts`, `src/components/layout/app-navigation.tsx`.
- P9–P12 surfaces (reports generation, LiteRT, privacy, e2e), migrations, production/env config.

Do not: begin the next phase; alter a decision output; weaken/remove tests; bypass validation/RLS; commit, push, merge, rebase, deploy.

## 9. Preferred implementation shape

```text
src/lib/calculations/upcoming-debt.ts
  getUpcomingDebts(debts: Debt[], referenceDate: Date): UpcomingDebt[]   // sorted, ≤30d
  getUpcomingDebtTotal(debts: Debt[], referenceDate: Date): number       // Σ minimumPayment in window
  interface UpcomingDebt { debt: Debt; nextDueDate: string; daysUntilDue: number }

src/features/dashboard/lib/advisor-insight.ts
  generateAdvisorInsight(input: { metrics; snapshot }): { title: string; body: string }

dashboard-overview.tsx — add: HealthStatusBanner (inline), "Variable Expenses (est.)" KpiCard,
  "Upcoming Debt (30 days)" card; replace static advisorInsight with generateAdvisorInsight(...).
```

Reuse existing logic; minimize public surface; isolate novel behavior into pure tested units; remain reversible.

## 10. Required tests

1. `getUpcomingDebts`: normal within-month; rollover to next month when `dueDay` already passed; due today (`daysUntilDue === 0`); end-of-month clamp (`dueDay = 31` in a 28/30-day month); `> 30 days` excluded; empty debts → `[]`; ascending sort; determinism for a fixed reference date.
2. `getUpcomingDebtTotal`: sums only in-window minimum payments; `0` when none.
3. `generateAdvisorInsight`: each health band (Strong/Stable/Caution/Risky) yields the expected title/tone; deterministic; tolerates missing `estimatedVariableExpenses`.
4. `DashboardOverview` (public path / component render): health-status banner shows the correct label for a given `healthScore`; the variable-expenses card renders the profile value; the upcoming-debt card renders due debts (or its empty state); the advisor insight reflects the generator, not the static string; all six pre-existing KPI headings still render (regression).

Public-path exercise:

```text
DashboardOverview render → getUpcomingDebts / getHealthStatus / generateAdvisorInsight → rendered card/banner/insight text
```

## 11. Verification commands

```bash
npm test -- src/lib/calculations/upcoming-debt.test.ts
npm test -- src/features/dashboard/lib/advisor-insight.test.ts
npm test -- src/features/dashboard/components/dashboard-overview.test.tsx
npm run typecheck
npm run lint
npm test
npm run test:coverage
git diff --check
git diff --name-only -- src/features/dashboard src/lib/calculations/upcoming-debt.ts src/lib/calculations/upcoming-debt.test.ts
```

Playwright dashboard snapshot is attempted if the dev/auth/Supabase env permits; if blocked, it is recorded `BLOCKED` with the reason and the component render stands as the public-path evidence.

## 12. Claim-to-evidence matrix

| Completion claim | Evidence | Status |
| --- | --- | --- |
| Upcoming-debt-30d card lists due debts + total | `upcoming-debt.test.ts` + `dashboard-overview.test.tsx` | NOT VERIFIED |
| Estimated variable expenses surfaced | `dashboard-overview.test.tsx` | NOT VERIFIED |
| Health-status banner shows correct band | `dashboard-overview.test.tsx` | NOT VERIFIED |
| Advisor insight is metrics-derived (not static) | `advisor-insight.test.ts` + `dashboard-overview.test.tsx` | NOT VERIFIED |
| Next-due-date math deterministic + edge cases | `upcoming-debt.test.ts` | NOT VERIFIED |
| Engine decision outputs unchanged | `npm test` (engine suites green) | NOT VERIFIED |
| Existing dashboard behavior unchanged | `dashboard-overview.test.tsx` (existing cases) | NOT VERIFIED |
| Coverage ≥ 80% | `npm run test:coverage` | NOT VERIFIED |
| No forbidden files changed | `git diff --name-only` | NOT VERIFIED |
| Diff is structurally valid | `git diff --check` | NOT VERIFIED |

## 13. Execution workflow

Inspect repo + diff → write each pure helper test-first → implement helper → invoke `frontend-design` before UI → extend the component + its test → focused verify → full regression + lint + typecheck + coverage → independent review → scope/diff check → report.

## 14. Retry and stop conditions

Max three materially different repair attempts per failure. Stop and report if: a decision output would have to change; a schema/migration becomes necessary; a forbidden/P7 file must change; or the component contract must break.

## 15. Definition of Done

Every required behavior implemented; invariants preserved; focused tests pass; the component render (public path) is exercised; full regression + lint + typecheck pass and coverage ≥ 80%; determinism demonstrated; no forbidden files changed; `git diff --check` passes; claim-to-evidence complete; risks documented; `STATUS.md` current; next phase not started.

## 16. Final report

Per `tasks/templates/REPORT_TEMPLATE.md`: outcome; files changed; exploration findings; design; behavior; commands run; claim-to-evidence; review findings; risks; confirmation forbidden/next-phase files untouched; human-review checklist. No git writes.
