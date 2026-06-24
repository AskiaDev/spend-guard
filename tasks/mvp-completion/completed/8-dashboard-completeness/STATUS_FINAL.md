# Milestone Status: 8 — Dashboard completeness

## Metadata

- Feature: `mvp-completion`
- Phase: `8`
- Goal: `tasks/mvp-completion/CURRENT_GOAL.md`
- Source plan: `tasks/mvp-completion/ROADMAP.md` (row 8; PRD §11.2, §27.2)
- Branch: `main`
- State: `READY FOR HUMAN REVIEW`
- Last updated: `2026-06-24`
- Updated by: `Claude Code`

## Current objective

Close the four PRD §11.2 dashboard gaps: upcoming-debt-30d card, estimated-variable-expenses card, health-status banner, and a deterministic (non-static) advisor insight — without touching the §19 decision engine or any schema.

## Current step

Writing the pure `getUpcomingDebts` helper test-first.

## Completed prior phases

- P1–P7 (archived under `completed/`).

## Investigation findings

- `DashboardOverview({ snapshot, checks, metrics })` already receives everything needed; no `page-adapters.tsx` change required (keeps P8 disjoint from uncommitted P7 files).
- `getHealthStatus(score)` + `HealthStatus` already exist in `src/lib/calculations/health-score.ts` (reuse; thresholds 80/60/40 → Strong/Stable/Caution/Risky).
- `Debt` has `dueDay: number` only (no full date); next-due-date is derivable from it. No migration needed.
- `advisorInsight` (reference-data.ts) is also consumed by `goals-panel.tsx:366` → must stay exported; only the dashboard usage is replaced.
- Engine's `upcomingDebt30Days` input is the all-debts min-payment sum (P3/P4 locked); P8's 30-day card is display-only and must not alter it.
- Baseline this session: typecheck + lint + `npm test` (43 files / 225 tests) all green.

## Completed in this milestone

- Phase goal + status authored.

## In progress

- `src/lib/calculations/upcoming-debt.ts` (+ test).

## Remaining work

- [x] `getUpcomingDebts` / `getUpcomingDebtTotal` pure helper + unit tests
- [x] `generateAdvisorInsight` pure generator + unit tests
- [x] `frontend-design` skill consult before UI
- [x] Dashboard: health-status banner, variable-expenses card, upcoming-debt card, wired advisor insight
- [x] Extend `dashboard-overview.test.tsx` (public-path render)
- [x] Regression + lint + typecheck + coverage ≥ 80%
- [x] Independent review (read-only subagent) → SAFE TO CHECKPOINT after one repair cycle
- [x] Checkpoint patch (`8-dashboard-completeness.patch`, sha256 e1877277…) + report
- [ ] Archive (in progress)

## Files changed

| File | Status | Purpose |
| --- | --- | --- |
| `tasks/mvp-completion/CURRENT_GOAL.md` | new | Phase 8 goal |
| `tasks/mvp-completion/STATUS.md` | new | Phase 8 status |

## Verification status

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| Typecheck | `npm run typecheck` | PASS | exit 0, no errors |
| Lint | `npm run lint` | PASS | 0 errors (271 pre-existing warnings, none in P8 files) |
| Focused test | `npm test -- upcoming-debt advisor-insight` | PASS | 11 + 9 tests |
| Public-path test | `dashboard-overview.test.tsx` | PASS | 11 tests (5 prior + 6 new) |
| Regression suite | `npm test` | PASS | 45 files / 250 tests |
| Coverage (≥80%) | `npm run test:coverage` | PASS | stmts 91.34 / branches 81.87 / funcs 95.12 / lines 91.35 |
| Build | `npm run build` | PASS | full route tree compiled |
| Diff check | `git diff --check` (P8 files) | PASS | clean (whitespace flags are inside the archived P7 .patch only) |
| Scope check | `git status --short` | PASS | only 6 P8 files (2 M + 4 new); no P7/forbidden files |

## Completed in this milestone (verified)

- `getUpcomingDebts` / `getUpcomingDebtTotal` pure helper + 11 unit tests (rollover, due-today, end-of-month clamp, 30d boundary, sort, tiebreak, determinism, empty).
- `generateAdvisorInsight` / `describeHealthStatus` pure generator + 9 unit tests (each band, signal branches, determinism, missing-field tolerance).
- Dashboard UI: health-status banner, Variable Expenses KPI card, Upcoming Debt (30 days) card, advisor insight wired to the generator; 6 new component render tests.

## Blockers and open questions

None.

## Remaining risks

- Playwright dashboard verification may be env-blocked (auth/Supabase); component render is the fallback public-path evidence.
- P7 remains uncommitted; P8 checkpoint patch will be scoped to P8 files.

## Next action

Phase complete and archived. Human: review `completed/8-dashboard-completeness/` (apply the patch) and commit P7 then P8. Roadmap continues at Phase 9 (Weekly advisor report).

## Scope confirmation

- [x] No next-phase work started
- [x] No forbidden files modified
- [x] No unrelated refactor introduced
- [x] No tests weakened or removed
- [x] No RLS / validation bypassed
- [x] No commit, push, merge, rebase, or deployment performed

## Human review readiness

- State: `READY WITH KNOWN RISKS` (Playwright dashboard snapshot deferred to P12; component render is the public-path evidence)
