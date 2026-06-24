# Current Goal: Phase 9 — Weekly advisor report from real metrics

## Goal metadata

- Feature: `mvp-completion`
- Phase: `9`
- Status: `READY TO START`
- Source plan: `tasks/mvp-completion/ROADMAP.md` (row 9; PRD §11.7, §13 Story 6)
- Previous phase report: `tasks/mvp-completion/completed/8-dashboard-completeness/REPORT.md`

## 0. Repository harness (SpendGuard)

Next 16 + React 19 + TS strict + Supabase + Tailwind/shadcn. Vitest + RTL; Playwright e2e. Commands: `npm run typecheck` · `npm run lint` · `npm test [-- <path>]` · `npm run test:coverage` (80% gate) · `npm run build`. UI-bearing → apply `frontend-design`. Git: agent-managed commits approved for this run — commit + push each verified phase (user authorized via `/commit-msg`). Capture each phase as a patch under `completed/<phase>/`.

## 1. Current project state

Complete (do not redo): P1–P8 archived. **P7 + P8 are now committed and pushed** (HEAD `3e220f8`), so the base is clean. The `weekly_reports` table + RLS + mapper + `createWeeklyReportAction` + `use-financial-state.generateWeeklyReport()` already exist, but generation writes a bare 3-fact `summary` and `reports-panel.tsx` renders **static** insights (`buildReferenceInsights`, hardcoded "Good Decisions" = "3"). A rule-based advisor pattern exists at `src/lib/advisor/fallback-advisor.ts`.

## 2. Objective

> Replace the static weekly-report insights with deterministic, rule-based insights (wins / risks / goal progress / one next-best-action + good-decision and amount-preserved metrics) derived from the week's purchase-check history + the financial snapshot, store a richer narrative, and show a history of past reports — all working without any LLM.

This milestone owns:

- A pure, tested generator that turns (snapshot, week's checks, weekStart) into the report's insight fields + a narrative.
- Wiring the generator into `reports-panel.tsx` (data-driven cards) and `use-financial-state.generateWeeklyReport` (stored narrative).
- A history list of past weekly reports on the reports page.

This milestone does not include:

- The LiteRT-LM advisor / LLM prose (P10) — the generator is the rule-based fallback the LLM will later wrap.
- Privacy surface (P11), e2e hardening (P12), and any change to §19 decision outputs or schema/migrations.

## 3. Required behavior

1. The reports page shows wins ("Improved Items" / "Good Decisions" count), risks ("Current Risks"), goal progress, and one next-best-action computed from the week's checks + snapshot — not hardcoded strings.
2. "Good Decisions" = a real count from the week's checks; "Purchases Avoided" reflects the real amount preserved by skipped checks.
3. A history section lists past weekly reports (week range, health score, summary), newest first.
4. `generateWeeklyReport()` stores a richer narrative produced by the generator (still persisting weekStart/healthScore/safeToSpend via the existing action).
5. Determinism: the generator is pure given (snapshot, checks, weekStart, referenceDate) — same input → same output; no LLM, no wall-clock inside the pure function.
6. The report must work fully without AI; the deterministic facts are never produced by an LLM.

## 4. Architectural invariants

1. §19 engine (`src/lib/calculations/**`) untouched; the generator only *reads* engine outputs / check history for display.
2. Reuse existing seams: `createWeeklyReportAction`, the Supabase mapper, `formatCurrency`, `getHealthStatus`, date-fns `startOfWeek`. No duplicate persistence.
3. Server action keeps deriving `user_id` from auth; RLS on `weekly_reports` preserved (no action signature change needed).
4. `ReportsPanel` gains `checks`/`snapshot` props (its only caller is the adapter); contract stays coherent.
5. Business rules live in the pure generator; the component/hook stay thin.
6. Completed-phase work is not redesigned.

## 5. Important behavioral definitions

### "Good decision" (weekly)

A week's check counts as a good decision when the outcome aligned with the guardrail: `decision === "SAFE_TO_BUY"`, or `status === "skipped"` (a flagged want was paused). Deterministic; counts unique checks in the week window `[weekStart, weekStart+7)`.

### "Amount preserved"

Sum of `amount` for the week's checks with `status === "skipped"`. It must not be confused with `safeToSpend` (the prior static value).

### "Next best action"

One rule-based action chosen by priority: emergency fund underfunded → build buffer; else upcoming debt present → check installment payments; else → run a purchase check before the next flexible want. No invented advice beyond these signals.

## 6. Existing implementation to inspect

- `src/features/reports/components/reports-panel.tsx` (+ `reports-panel.test.tsx`) — UI to make data-driven.
- `src/app/(app)/_components/page-adapters.tsx` `ReportsPageContent` — pass `checks`/`snapshot`.
- `src/hooks/use-financial-state.ts` `generateWeeklyReport` (l.408) — store richer narrative.
- `src/lib/advisor/fallback-advisor.ts` — style to mirror for rule-based copy.
- `src/types/finance.ts` (`PurchaseCheck`, `WeeklyReport`), `src/test/fixtures/financial-snapshot.ts`.

## 7. Allowed files

- `src/features/reports/lib/weekly-report.ts` (new) + `weekly-report.test.ts` (new)
- `src/features/reports/components/reports-panel.tsx` (modify) + `reports-panel.test.tsx` (extend)
- `src/app/(app)/_components/page-adapters.tsx` (modify — pass props) + `page-adapters.test.tsx` (extend if needed)
- `src/hooks/use-financial-state.ts` (modify `generateWeeklyReport` only) + `use-financial-state.test.tsx` (extend if needed)
- `tasks/mvp-completion/CURRENT_GOAL.md`, `STATUS.md`

## 8. Forbidden files and scope

Do not modify: `src/lib/calculations/**` (engine), `src/types/finance.ts` unless a tiny additive field is unavoidable (prefer not), `src/lib/advisor/litert-lm.ts` (P10), `create-weekly-report.ts` action signature, schema/migrations, privacy/e2e surfaces. Do not: start P10; let an LLM produce the facts; weaken tests; bypass RLS; (only commit/push the completed P9 per the approved per-phase checkpoint).

## 9. Preferred implementation shape

```text
src/features/reports/lib/weekly-report.ts
  interface WeeklyReportInsights {
    goodDecisions: number; purchasesAvoided: number; amountPreserved: number;
    improvedItems: string; currentRisks: string; goalProgress: string;
    nextBestAction: string; narrative: string;
  }
  generateWeeklyReportInsights(input: {
    snapshot: FinancialSnapshot; checks: PurchaseCheck[]; weekStart: string; currency: CurrencyCode;
  }): WeeklyReportInsights

reports-panel.tsx — consume insights for the metric + insight cards; add a past-reports history list.
page-adapters.tsx — pass checks + snapshot to ReportsPanel.
use-financial-state.ts — generateWeeklyReport uses generator.narrative for the stored summary.
```

## 10. Required tests

1. Generator: good-decisions count (safe buys + skipped), amount-preserved sum, week-window filtering (checks outside the week excluded), risk detection (bought NOT_RECOMMENDED), each next-best-action branch, narrative determinism, empty-week defaults.
2. ReportsPanel (public path): renders the data-driven good-decisions count + amount preserved from supplied checks; renders the history list (older report visible); keeps the existing section labels.
3. Regression: existing reports-panel tests still pass (labels, download, generate-when-empty); full suite + coverage ≥ 80%.

Public-path exercise: `ReportsPanel render → generateWeeklyReportInsights(checks+snapshot) → rendered cards + history`.

## 11. Verification commands

```bash
npm test -- src/features/reports
npm run typecheck
npm run lint
npm test
npm run test:coverage
npm run build
git diff --check
```

## 12. Claim-to-evidence matrix

| Claim | Evidence | Status |
| --- | --- | --- |
| Insights are data-driven (not static) | `weekly-report.test.ts` + `reports-panel.test.tsx` | NOT VERIFIED |
| Good-decisions / amount-preserved real | `weekly-report.test.ts` + `reports-panel.test.tsx` | NOT VERIFIED |
| Week-window filtering correct | `weekly-report.test.ts` | NOT VERIFIED |
| History list shown | `reports-panel.test.tsx` | NOT VERIFIED |
| Stored narrative enriched | `use-financial-state.test.tsx` or generator test | NOT VERIFIED |
| Determinism, no LLM | `weekly-report.test.ts` | NOT VERIFIED |
| Engine + existing reports behavior unchanged | `npm test` | NOT VERIFIED |
| Coverage ≥ 80% | `npm run test:coverage` | NOT VERIFIED |
| Diff valid / scope held | `git diff --check` / `--name-only` | NOT VERIFIED |

## 13. Execution workflow

Inspect → write generator test-first → implement generator → apply `frontend-design` for the UI → wire panel + adapter + hook → extend tests → focused verify → full regression + lint + typecheck + coverage + build → independent review → repair → report → commit + push + archive.

## 14. Retry and stop conditions

≤3 repair attempts per failure. Stop if: a decision output or schema must change; an LLM would be required for the facts; the action signature must change; or context is too thin to continue safely.

## 15. Definition of Done

All required behavior implemented; invariants preserved; focused + public-path tests pass; full regression + lint + typecheck + coverage ≥ 80% + build green; determinism shown; no forbidden files changed; claim-to-evidence complete; risks documented; STATUS current; P10 not started.

## 16. Final report

Per `REPORT_TEMPLATE.md`. Then commit + push the phase (user-approved) and archive under `completed/9-weekly-advisor-report/`.
