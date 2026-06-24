# Milestone Report: 8 — Dashboard completeness

## Report metadata

- Feature: `mvp-completion`
- Phase: `8`
- Goal: `tasks/mvp-completion/completed/8-dashboard-completeness/GOAL.md`
- Source plan: `tasks/mvp-completion/ROADMAP.md` (row 8; PRD §11.2, §27.2)
- Branch: `main`
- Commit: `NOT COMMITTED` (checkpoint patch only — user commits)
- Checkpoint patch: `tasks/mvp-completion/completed/8-dashboard-completeness/8-dashboard-completeness.patch`
- Patch SHA-256: `e18772770ae2f5adc4e85082932896b7a75f678197d8f925b1a52cf1839721d5`
- Base commit SHA: `edaa96b904bc2330465c78b7a21c97e94f10fab7` (working tree also carries uncommitted P7)
- Patch contents: 6 files (4 new + 2 modified), 683 lines
- Started: `2026-06-24`
- Finished: `2026-06-24`
- Implemented by: `Claude Code`
- Reviewed by: `ecc:code-reviewer (independent subagent)`
- Outcome: `COMPLETE`

## Outcome summary

Closed the four PRD §11.2 dashboard gaps: a health-status banner (Strong/Stable/Caution/Risky), an estimated-variable-expenses KPI card, an upcoming-debt-within-30-days card, and a deterministic metrics-derived advisor insight replacing the previously static copy. The deterministic §19 decision engine was not touched — the upcoming-debt window is a display-only pure helper derived from each debt's `dueDay`, and the advisor insight is a rule-based generator (no LLM). All four gaps are exercised through the real component render; full suite (45 files / 252 tests), typecheck, lint, build, and the 80% coverage gate are green. Independent review returned SAFE TO CHECKPOINT after two IMPORTANT fixes (use the exported total helper; inject a reference date for deterministic tests) were applied.

## Original objective

> Close the four PRD §11.2 dashboard gaps: surface an upcoming-debt-within-30-days card, surface estimated variable expenses, render a Strong/Stable/Caution/Risky health-status banner, and replace the static advisor insight with a deterministic metrics-derived summary.

### In scope

- Display-only pure helper deriving next-due-dates + the within-30-day debt list and total.
- Deterministic rule-based dashboard advisor-insight generator.
- Dashboard UI: health-status banner, variable-expenses card, upcoming-debt card, wired advisor insight.

### Explicitly out of scope

- Any change to §19 decision-engine outputs; weekly report page (P9); LiteRT advisor (P10); privacy surface (P11); e2e hardening (P12); schema/migrations.

## Starting repository state

Before this milestone:

- P1–P7 archived. The dashboard (`dashboard-overview.tsx`) already rendered live KPI cards (savings, safe-to-spend, emergency progress, monthly expenses, debt payments, free cash flow), live goals, recent checks, and a live health-score gauge.
- Gaps: no upcoming-debt-30d card; estimated variable expenses not surfaced; no health-status banner; advisor title/body hardcoded from `reference-data.ts`.
- Baseline this session was green (typecheck, lint, 225 tests).

### Existing work preserved

- All pre-existing dashboard cards and their tests; the `advisorInsight` export in `reference-data.ts` (still used by `goals-panel.tsx`).

## Exploration findings

### Existing execution path

`src/app/(app)/page.tsx` → `DashboardPageContent` (`_components/page-adapters.tsx`) → `DashboardOverview({ snapshot, checks, metrics })`. The component already receives `snapshot` (incl. `profile.estimatedVariableExpenses`, `debts[].dueDay`) and `metrics` (incl. `healthScore`), so no adapter change was needed — keeping P8 disjoint from the uncommitted P7 files.

### Existing architectural ownership

The §19 engine (`src/lib/calculations/**`) owns all financial decisions. `getHealthStatus` already maps a score to Strong/Stable/Caution/Risky (thresholds 80/60/40). The engine's `upcomingDebt30Days` input is the all-debts min-payment sum (P3/P4 locked).

### Existing public contracts

`DashboardOverview` props (`snapshot`, `checks`, `metrics`); `getHealthStatus(score)`; `formatCurrency`; `Card`/`KpiCard`/`InlineNotice`/`ProgressRing`/`ScoreGauge`.

### Existing test conventions

Vitest + React Testing Library; component tests render `DashboardOverview` against `financialSnapshotFixture` and assert via roles/labels/testids.

### Risks identified before implementation

- Changing the engine's debt window would alter locked P3/P4 decision outputs → avoided by making the 30-day card display-only.
- `new Date()` non-determinism → confined to the render boundary; pure helpers take an injected reference date.

## Implementation design

### Chosen approach

Two pure, tested modules plus thin UI wiring:

- `src/lib/calculations/upcoming-debt.ts` — `getUpcomingDebts(debts, referenceDate)` computes each debt's next `dueDay` occurrence (end-of-month clamped), filters to ≤30 days, sorts by urgency; `getUpcomingDebtTotal` sums the in-window minimum payments. Display-only; never wired into the decision engine.
- `src/features/dashboard/lib/advisor-insight.ts` — `generateAdvisorInsight({ metrics, snapshot })` returns a deterministic `{ title, body }` keyed off the health band + a single dominant signal (cash-flow sign, emergency funding, debt presence); `describeHealthStatus(status)` returns the banner's one-line description. No LLM.
- `dashboard-overview.tsx` — adds an inline `HealthStatusBanner`, a "Variable Expenses" `KpiCard`, an "Upcoming Debt (30 days)" `Card` (rows + total, with empty state), and wires the advisor insight to the generator. Accepts an optional `referenceDate?: Date` for deterministic tests.

### Reused components

- `getHealthStatus` / `HealthStatus` — reused, not reimplemented.
- `Card`/`CardHeader`/`CardContent`/`CardTitle`, the `KpiCard` pattern, `formatCurrency`, `formatShortDate`, lucide icons, and the established tone tokens (`safe`/`primary`/`caution`/`risk`).

### New components

- `HealthStatusBanner` (inline) — the phase's signature element; tone + icon by band.
- `getUpcomingDebts` / `getUpcomingDebtTotal` — pure debt-window helpers.
- `generateAdvisorInsight` / `describeHealthStatus` — pure advisor generator.

### Alternatives rejected

#### Re-defining the engine's `upcomingDebt30Days` to a true date-filtered sum

- Reason rejected: it would change locked P3/P4 decision outputs (`calculateSafeToSpend`, `evaluatePurchase`) — a redesign of accepted work and an invariant violation.
- Risk avoided: silent regression of purchase decisions.

#### Adding a due-date schema field / migration

- Reason rejected: `dueDay` is sufficient to derive the next occurrence; a migration would ripple into P7/onboarding for no display benefit.

### Architectural invariants preserved

- §19 engine untouched; upcoming-debt helper is display-only.
- `getHealthStatus` reused; advisor is deterministic and LLM-free.
- `DashboardOverview` stays backward-compatible (only an optional prop added).
- `advisorInsight` export retained for `goals-panel.tsx`.

## Behavior implemented

### Health-status banner

Renders "Your finances are {Strong|Stable|Caution|Risky}" from `getHealthStatus(metrics.healthScore)` with a band-specific tone, icon, and one-line description.

Evidence: `dashboard-overview.test.tsx` (Strong at 82; Risky at 30).

### Estimated variable expenses card

A KPI card showing `profile.estimatedVariableExpenses` (defaulting to 0 when absent).

Evidence: `dashboard-overview.test.tsx` (₱12,000 from the fixture).

### Upcoming debt (30 days) card

Lists debts due within 30 days with next due date + amount and a summed total; shows an empty state when none.

Evidence: `dashboard-overview.test.tsx` (Credit card, Jul 20, In 26 days, ₱5,000, "due across 1 payment"; empty-state case); `upcoming-debt.test.ts`.

### Advisor insight (generated)

Title/body produced by `generateAdvisorInsight`, not the static string; the live free-cash-flow sentence is preserved.

Evidence: `advisor-insight.test.ts`; `dashboard-overview.test.tsx` (Strong → "You're ahead of the guardrail"; static "Keep the guardrail active" absent at score 82).

### Error and edge-case behavior

- End-of-month clamp (dueDay 31 in February → Feb 28), rollover when the day has passed, due-today = 0 days, inclusive 30-day boundary, tiebreak by larger payment, empty debts → `[]`.
- Advisor tolerates a missing `estimatedVariableExpenses`; deterministic for identical inputs.

## Files changed

| File | Change | Purpose |
| --- | --- | --- |
| `src/lib/calculations/upcoming-debt.ts` | new | Pure display helper: next-due-date + within-30d list/total |
| `src/lib/calculations/upcoming-debt.test.ts` | new | 11 unit tests for the helper |
| `src/features/dashboard/lib/advisor-insight.ts` | new | Deterministic rule-based advisor generator |
| `src/features/dashboard/lib/advisor-insight.test.ts` | new | 10 unit tests for the generator |
| `src/features/dashboard/components/dashboard-overview.tsx` | modified | Banner, variable-expenses card, upcoming-debt card, generated advisor, optional `referenceDate` |
| `src/features/dashboard/components/dashboard-overview.test.tsx` | modified | 6 new render tests (public path) |

### Files intentionally not changed

- `src/lib/calculations/{purchase-decision,cashflow,debt-pressure,emergency-fund,health-score,goal-impact}.ts` — engine outputs must stay identical.
- `src/types/finance.ts`, `src/features/reference-data.ts`, `_components/page-adapters.tsx`, and all P7 files.

### Scope exceptions

None.

## Database and migration changes

Not applicable. No schema or data changes (existing `Debt.dueDay` + `FinancialProfile.estimatedVariableExpenses` suffice).

## Tests added or changed

| Test | Coverage |
| --- | --- |
| `upcoming-debt.test.ts` | next-date math, clamp, rollover, due-today, 30d boundary, sort, tiebreak, determinism, empty, total |
| `advisor-insight.test.ts` | each health band, all signal branches, determinism, missing-field tolerance |
| `dashboard-overview.test.tsx` | banner (Strong/Risky), variable-expenses card, upcoming-debt list + empty state, generated advisor |

### Coverage boundaries

- The >30-day exclusion branch of the window filter is unreachable for monthly-recurring debts (next occurrence is provably ≤30 days); kept as a documented defensive guard.
- Playwright dashboard snapshot not run (see blocked checks); component render is the public-path evidence.

## Verification results

### Focused checks

| Check | Command | Result |
| --- | --- | --- |
| Upcoming-debt helper | `npm test -- src/lib/calculations/upcoming-debt.test.ts` | PASS (11) |
| Advisor generator | `npm test -- src/features/dashboard/lib/advisor-insight.test.ts` | PASS (10) |
| Dashboard render | `npm test -- src/features/dashboard/components/dashboard-overview.test.tsx` | PASS (11) |

### Public-path / integration checks

| Check | Command | Result |
| --- | --- | --- |
| Component render (public path) | `dashboard-overview.test.tsx` | PASS |
| Playwright dashboard snapshot | `npm run e2e` | BLOCKED (auth/Supabase env not provisioned this run) |

### Regression checks

| Check | Command | Result |
| --- | --- | --- |
| Full suite | `npm test` | PASS (45 files / 252 tests) |
| Lint | `npm run lint` | PASS (0 errors; 271 pre-existing warnings, none in P8 files) |
| Typecheck | `npm run typecheck` | PASS |
| Coverage | `npm run test:coverage` | PASS (Stmts 91.44 / Branches 82.04 / Funcs 95.11 / Lines 91.45) |
| Build | `npm run build` | PASS |

### Diff and scope checks

| Check | Command | Result |
| --- | --- | --- |
| Diff formatting | `git diff --check` (P8 files) | PASS (flags exist only inside the archived P7 .patch) |
| Changed files | `git status --short` | PASS (6 P8 files only) |
| Forbidden files untouched | engine/types/reference-data/P7 diff empty | PASS |

### Unrelated or environment-blocked checks

| Check | Reason | Impact |
| --- | --- | --- |
| Playwright dashboard snapshot | Dashboard requires authenticated Supabase session; e2e env not provisioned in this run | Visual/interaction verification deferred to P12; component render covers the rendered output and props |

## Claim-to-evidence matrix

| Completion claim | Evidence | Status |
| --- | --- | --- |
| Upcoming-debt-30d card lists due debts + total | `upcoming-debt.test.ts` + `dashboard-overview.test.tsx` | VERIFIED |
| Estimated variable expenses surfaced | `dashboard-overview.test.tsx` | VERIFIED |
| Health-status banner shows correct band | `dashboard-overview.test.tsx` (82→Strong, 30→Risky) | VERIFIED |
| Advisor insight is metrics-derived (not static) | `advisor-insight.test.ts` + `dashboard-overview.test.tsx` | VERIFIED |
| Next-due-date math deterministic + edge cases | `upcoming-debt.test.ts` | VERIFIED |
| Engine decision outputs unchanged | engine diff empty + full suite green | VERIFIED |
| Existing dashboard behavior unchanged | `dashboard-overview.test.tsx` (existing cases) | VERIFIED |
| Coverage ≥ 80% | `npm run test:coverage` | VERIFIED |
| No forbidden files changed | `git status --short` | VERIFIED |
| Diff is structurally valid | `git diff --check` | VERIFIED |

## Acceptance-criteria results

- [x] **Upcoming-debt-within-30-days card** — implemented + tested.
- [x] **Estimated variable expenses surfaced** — implemented + tested.
- [x] **Strong/Stable/Caution/Risky health-status banner** — implemented + tested.
- [x] **Deterministic advisor insight (not static)** — implemented + tested.
- [x] **Engine unchanged / determinism / no LLM override** — verified (engine diff empty, pure helpers).

## Independent review

### Correctness review

- Reviewer: `ecc:code-reviewer (independent subagent)`
- Verdict: `SAFE TO CHECKPOINT` (after one repair cycle; all findings resolved or documented)

Findings:

- `IMPORTANT` Component re-derived the debt total inline — Resolution: now calls the exported `getUpcomingDebtTotal`.
- `IMPORTANT` Component test relied on wall-clock `new Date()` — Resolution: added optional `referenceDate` prop; test injects a fixed date and asserts the exact next date.
- `MINOR` Missing ">30 days excluded" test — Resolution: documented as unreachable-by-design (monthly recurrence ≤30 days); inclusive boundary tested.
- `MINOR` Stable/Caution body not asserted — Resolution: added the "clear upcoming debt first" signal-branch test.
- `SUGGESTION` Banner used `role="status"` (live region) — Resolution: changed to `role="region"` + `aria-label`.

### Regression review

- Reviewer: `ecc:code-reviewer`
- Verdict: PASS (engine/types/reference-data/P7 diffs empty; existing dashboard tests preserved).

### Simplification review

- Reviewer: `ecc:code-reviewer`
- Verdict: PASS (named window constant; pure helpers; no speculative abstraction).

## Repair history

One review→repair cycle: applied the two IMPORTANT fixes + minor/suggestion fixes, re-ran the full gate (all green), re-reviewed.

## Deviations from the original goal

The goal listed a ">30 days excluded" test; it is unreachable for monthly-recurring debts, so it was documented as a defensive guard instead of fabricated. An optional `referenceDate` prop was added (allowed: optional, backward-compatible) to make the component test deterministic.

## Remaining risks and limitations

- Upcoming-debt window is correct for monthly-recurring debts only; a future non-monthly cadence would need the guard branch (already present).
- The dashboard advisor insight is intentionally a rule-based fallback; richer narrative is P9/P10.
- Playwright visual verification deferred to P12.
- P7 remains uncommitted in the working tree; the P8 checkpoint patch is scoped to P8's files.

## Follow-up work

- P12 should add a Playwright dashboard journey asserting the banner/cards render for an authenticated user.

## Guidance for the next milestone

The next milestone may rely on:

- `getUpcomingDebts` / `getUpcomingDebtTotal` (display helpers) and `generateAdvisorInsight` / `describeHealthStatus` (pure, tested).

The next milestone must not assume:

- That the upcoming-debt helper feeds any decision output (it does not).

### Recommended next milestone

`9 — Weekly advisor report from real metrics` — Reason: next roadmap phase after P8; depends only on the verified P3 engine, and can reuse the deterministic advisor pattern established here as its rule-based fallback.

## Human review checklist

- [ ] Review the complete diff (apply the checkpoint patch)
- [ ] Confirm changed-file scope (6 P8 files only)
- [ ] Confirm the §19 engine and decision outputs are untouched
- [ ] Confirm `advisorInsight` still serves `goals-panel.tsx`
- [ ] Confirm all required tests were executed (focused + full + coverage + build)
- [ ] Confirm report claims match evidence
- [ ] Confirm no next-phase work was started

## Git and deployment status

- Commit created by agent: `NO`
- Pushed by agent: `NO`
- Merged by agent: `NO`
- Deployed by agent: `NO`
- Production data modified: `NO`

## Final disposition

- Agent recommendation: `READY FOR HUMAN REVIEW`
- Human decision: `PENDING`
- Human reviewer: `pending`
- Decision date: `pending`
