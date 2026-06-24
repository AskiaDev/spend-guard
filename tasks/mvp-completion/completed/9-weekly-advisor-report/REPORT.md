# Milestone Report: 9 — Weekly advisor report from real metrics

## Report metadata

- Feature: `mvp-completion`
- Phase: `9`
- Goal: `tasks/mvp-completion/completed/9-weekly-advisor-report/GOAL.md`
- Source plan: `tasks/mvp-completion/ROADMAP.md` (row 9; PRD §11.7, §13 Story 6)
- Branch: `main`
- Commit: created by agent (user-approved per-phase commits this run); pushed
- Checkpoint patch: `tasks/mvp-completion/completed/9-weekly-advisor-report/9-weekly-advisor-report.patch`
- Patch SHA-256: `3d9432a1c4e7ca1b189af374cafe259c42c9386352943567465b3dc6a8e17af2`
- Base commit SHA: `3e220f89cedd5c4e5b8cdf48b6a5e8098bd79013`
- Patch contents: 8 files (2 new + 6 modified), 658 lines
- Commits: `effbccb` (phase) + a follow-up adding the hook-test assertion (initially omitted from the phase commit)
- Started: `2026-06-24`
- Finished: `2026-06-24`
- Implemented by: `Claude Code`
- Reviewed by: `ecc:code-reviewer (independent subagent)`
- Outcome: `COMPLETE`

## Outcome summary

Replaced the static weekly-report insights with a deterministic, rule-based generator that derives wins (good decisions / improved items), risks, goal progress, and one next-best-action from the week's purchase-check history + the financial snapshot, and now stores a richer narrative and shows a history of past reports. No LLM is involved — this is the rule-based fallback the LiteRT advisor (P10) will later wrap. The §19 engine, the `weekly_reports` schema, and `createWeeklyReportAction`'s signature/RLS are untouched. Full suite (46 files / 263 tests), typecheck, lint, coverage (≥80%), and build are green; independent review returned SAFE TO CHECKPOINT (two MINOR improvements applied).

## Original objective

> Replace the static weekly-report insights with deterministic rule-based insights (wins / risks / goal progress / one next-best-action + good-decision and amount-preserved metrics) derived from the week's purchase-check history + the financial snapshot, store a richer narrative, and show a history of past reports — all working without any LLM.

### In scope

- Pure generator (snapshot + week's checks + weekStart → insight fields + narrative).
- Data-driven reports UI (metric + insight cards) and a report-history list.
- Enriched stored narrative via the existing `generateWeeklyReport` path.

### Explicitly out of scope

- LiteRT-LM / LLM prose (P10); privacy surface (P11); e2e hardening (P12); any §19 decision change or schema/migration.

## Starting repository state

- P1–P8 archived; P7 + P8 committed + pushed (HEAD `3e220f8`) — clean base.
- `weekly_reports` table + RLS + mapper + `createWeeklyReportAction` + hook `generateWeeklyReport` already existed; generation wrote a bare 3-fact summary and `reports-panel.tsx` rendered static `buildReferenceInsights` + hardcoded "Good Decisions" = "3".

### Existing work preserved

- The persistence stack (table/RLS/mapper/action), the reports page composition, download + generate-when-empty behaviors, and the section labels.

## Exploration findings

### Existing execution path

`/reports` → `ReportsPageContent` (page-adapters) → `ReportsPanel`. Generation: `use-financial-state.generateWeeklyReport()` → `createWeeklyReportAction` → Supabase `weekly_reports`; load via `loadFinancialWorkspace` → mapper → `state.weeklyReports`.

### Existing architectural ownership

The §19 engine owns decisions; `getHealthStatus`/`calculateSafeToSpend`/`calculateFinancialHealthScore` are read-only seams. Weeks are Monday-based via date-fns `startOfWeek(..., { weekStartsOn: 1 })`.

### Existing public contracts

`createWeeklyReportAction({ weekStart, summary, healthScore, safeToSpend })`; `WeeklyReport` shape; `ReportsPanel` props.

### Existing test conventions

Vitest + RTL; component tests render `ReportsPanel` and assert by role/label/text; the existing test asserts section labels (kept) but not their values (so values could become data-driven).

### Risks identified before implementation

- Touching P7-modified files (`page-adapters.tsx`, `use-financial-state.ts`) → resolved by committing P7+P8 first (clean base).
- Timezone interaction of local-date weekStart vs UTC `createdAt` → pre-existing pattern; tests use well-separated fixtures.

## Implementation design

### Chosen approach

A pure generator plus thin wiring:

- `src/features/reports/lib/weekly-report.ts` — `generateWeeklyReportInsights({ snapshot, checks, weekStart, currency })` returns `{ goodDecisions, purchasesAvoided, amountPreserved, improvedItems, currentRisks, goalProgress, nextBestAction, narrative }`. Output maps 1:1 to the UI (no speculative fields). Filters checks to `[weekStart, weekStart+7)`; counts good decisions (`SAFE_TO_BUY` or `skipped`), amount preserved (sum of skipped amounts), risks (bought `NOT_RECOMMENDED`); picks one next-best-action by priority (emergency → debt → run-check).
- `reports-panel.tsx` — consumes the generator for the metric + insight cards and adds a "Report history" list; gains `checks`/`snapshot` props.
- `page-adapters.tsx` — passes `checks`/`snapshot`.
- `use-financial-state.ts` — `generateWeeklyReport` stores `insights.narrative`.

No schema change: structured insights are deterministically recomputable from checks + snapshot, so only the narrative is persisted (in the existing `summary` field).

### Reused components

- `calculateSafeToSpend`, `calculateFinancialHealthScore` (read-only), `formatCurrency`, `createWeeklyReportAction`, the existing `Card`/`MetricCard`/`InsightCard` design system.

### New components

- `generateWeeklyReportInsights` (pure generator) + the report-history list section.

### Alternatives rejected

#### Extending `WeeklyReport`/schema with structured insight columns

- Reason rejected: the facts are deterministically derivable from checks + snapshot, so persisting them is redundant; a migration would add risk and churn for no benefit (YAGNI).

### Architectural invariants preserved

- §19 engine untouched (empty diff); generator is display-only and never alters a decision.
- No LLM; the pure function has no `new Date()` (wall-clock only at the hook boundary).
- Action signature + RLS unchanged.

## Behavior implemented

### Data-driven weekly insights

Good decisions, amount preserved, improved items, current risks, goal progress, and next-best-action are computed from the week's checks + snapshot.

Evidence: `weekly-report.test.ts`; `reports-panel.test.tsx` (good-decisions "2", "₱4,000" preserved).

### Report history

Past weekly reports are listed (week range, summary, health score), newest first.

Evidence: `reports-panel.test.tsx` ("Report history" + older report visible).

### Enriched stored narrative

`generateWeeklyReport` persists the generator narrative.

Evidence: `use-financial-state.test.tsx` (`createReport` called with a summary containing "guardrail-aligned").

### Error and edge-case behavior

- Checks outside the week window excluded; empty week → zero counts + non-empty default copy; deterministic for identical inputs; no-report state preserved.

## Files changed

| File | Change | Purpose |
| --- | --- | --- |
| `src/features/reports/lib/weekly-report.ts` | new | Pure rule-based weekly insight generator |
| `src/features/reports/lib/weekly-report.test.ts` | new | 9 generator unit tests |
| `src/features/reports/components/reports-panel.tsx` | modified | Data-driven cards + history list; consume generator |
| `src/features/reports/components/reports-panel.test.tsx` | modified | Data-driven + history render tests |
| `src/app/(app)/_components/page-adapters.tsx` | modified | Pass `checks`/`snapshot` to ReportsPanel |
| `src/hooks/use-financial-state.ts` | modified | Store generator narrative in `generateWeeklyReport` |
| `src/hooks/use-financial-state.test.tsx` | modified | Assert the stored summary uses the enriched narrative |
| `src/components/feedback/feedback-states.test.tsx` | modified | Required-prop fix for new ReportsPanel contract |

### Files intentionally not changed

- `src/lib/calculations/**`, `src/lib/advisor/litert-lm.ts`, `create-weekly-report.ts` (action), schema/migrations.

### Scope exceptions

| File | Why it became necessary | Human approval |
| --- | --- | --- |
| `src/components/feedback/feedback-states.test.tsx` | Renders `ReportsPanel`, which gained two required props; updated the call only | within phase intent (compatibility) |

## Database and migration changes

Not applicable. No schema or data changes; only the value written to the existing `summary` column is richer.

## Tests added or changed

| Test | Coverage |
| --- | --- |
| `weekly-report.test.ts` | good decisions, amount preserved, week filtering, risk detection, next-best-action branches, determinism, empty week |
| `reports-panel.test.tsx` | data-driven metrics, history list, preserved labels/download/generate |
| `use-financial-state.test.tsx` | stored summary contains the generator narrative |

### Coverage boundaries

- Local-date weekStart vs UTC `createdAt` boundary is a pre-existing convention; near-midnight edge cases are not exhaustively covered (well-separated fixtures used).

## Verification results

### Focused checks

| Check | Command | Result |
| --- | --- | --- |
| Generator | `npm test -- src/features/reports/lib/weekly-report.test.ts` | PASS (9) |
| Reports + hook + feedback | `npm test -- src/features/reports src/hooks/use-financial-state.test.tsx src/components/feedback/feedback-states.test.tsx` | PASS (23) |

### Regression checks

| Check | Command | Result |
| --- | --- | --- |
| Full suite | `npm test` (3× for flake check) | PASS (46 files / 263 tests) |
| Lint | `npm run lint` | PASS (0 errors; 271 pre-existing warnings) |
| Typecheck | `npm run typecheck` | PASS |
| Coverage | `npm run test:coverage` | PASS (Stmts 91.66 / Branch 82.22 / Funcs 95.21 / Lines 91.66) |
| Build | `npm run build` | PASS |

### Diff and scope checks

| Check | Command | Result |
| --- | --- | --- |
| Diff formatting | `git diff --check` | PASS |
| Changed files | `git status --short` | PASS (7 P9 files; engine/schema untouched) |

## Claim-to-evidence matrix

| Claim | Evidence | Status |
| --- | --- | --- |
| Insights are data-driven (not static) | `weekly-report.test.ts` + `reports-panel.test.tsx` | VERIFIED |
| Good-decisions / amount-preserved real | `reports-panel.test.tsx` (2, ₱4,000) | VERIFIED |
| Week-window filtering correct | `weekly-report.test.ts` | VERIFIED |
| History list shown | `reports-panel.test.tsx` | VERIFIED |
| Stored narrative enriched | `use-financial-state.test.tsx` ("guardrail-aligned") | VERIFIED |
| Determinism, no LLM | `weekly-report.test.ts` + review | VERIFIED |
| Engine + existing reports behavior unchanged | engine diff empty + full suite | VERIFIED |
| Coverage ≥ 80% | `npm run test:coverage` | VERIFIED |
| Diff valid / scope held | `git diff --check` / status | VERIFIED |

## Acceptance-criteria results

- [x] Wins/risks/goal-progress/next-best-action computed from real data
- [x] Good-decisions count + amount preserved are real
- [x] Report history shown
- [x] Stored narrative enriched
- [x] Deterministic, no LLM; engine/schema untouched

## Independent review

### Correctness review

- Reviewer: `ecc:code-reviewer (independent subagent)`
- Verdict: `SAFE TO CHECKPOINT`

Findings:

- `MINOR` Hook test didn't assert the enriched stored narrative — Resolution: added `summary: stringContaining("guardrail-aligned")` assertion.
- `MINOR` Two independent sorts of `reports` in the panel — Resolution: consolidated to a single `sortedReports` (latest = `[0]`, history = `slice(1)`); removed `getLatestReport`.

### Regression review

- Verdict: PASS (engine/schema/action diffs empty; all `ReportsPanel` callers updated; existing behaviors preserved).

### Simplification review

- Verdict: PASS (1:1 output↔UI; no schema; double-sort removed).

## Repair history

One review→repair cycle: applied both MINOR improvements; re-ran the gate (263 tests, coverage, typecheck, lint all green).

## Deviations from the original goal

None of substance. No schema change was needed (insights are recomputable), so structured fields were not persisted — only the narrative.

## Remaining risks and limitations

- Reports created before P9 keep their bare summary; only new reports get the richer narrative (history still renders both).
- Local/UTC week-boundary precision near midnight is inherited, not new.
- The dashboard advisor (P8) and weekly report (P9) are both rule-based; P10 will add optional LLM prose around the P9 generator.

## Follow-up work

- P10: wrap `generateWeeklyReportInsights` output with LiteRT-LM prose (fallback to this generator when unavailable).

## Guidance for the next milestone

The next milestone may rely on:

- `generateWeeklyReportInsights` as the deterministic fallback the LLM advisor wraps; the reports UI is already data-driven.

The next milestone must not assume:

- That any LLM output may change the deterministic facts — it must only rephrase them.

### Recommended next milestone

`10 — LiteRT-LM advisor real integration` — Reason: next roadmap phase; both deterministic advisors (P8 dashboard, P9 report) now exist as the fallbacks it wraps. Note: real on-device model integration may be environment-blocked and could land PARTIAL/BLOCKED.

## Human review checklist

- [ ] Apply/inspect the checkpoint patch; confirm 7-file scope
- [ ] Confirm §19 engine + `weekly_reports` schema + action signature untouched
- [ ] Confirm no LLM produces the facts (generator is pure/rule-based)
- [ ] Confirm all `ReportsPanel` callers pass the new props
- [ ] Confirm tests were executed (focused + full + coverage + build)
- [ ] Confirm no P10 work started

## Git and deployment status

- Commit created by agent: `YES` (user-approved per-phase commits this run)
- Pushed by agent: `YES`
- Merged by agent: `NO`
- Deployed by agent: `NO`
- Production data modified: `NO`

## Final disposition

- Agent recommendation: `READY FOR HUMAN REVIEW`
- Human decision: `PENDING`
